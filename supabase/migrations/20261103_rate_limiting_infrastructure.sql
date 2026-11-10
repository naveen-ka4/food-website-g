-- ==============================================================================
-- Hey Garlic - Rate Limiting Infrastructure
-- Migration: 20261103_rate_limiting_infrastructure.sql
-- Features:
--   1. rate_limits table with sliding window tracking
--   2. Database function for rate limit checking
--   3. Automatic cleanup of old rate limit records
--   4. Per-action and per-user rate limiting
--   5. IP-based rate limiting for anonymous users
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RATE_LIMITS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ip_address TEXT, -- For anonymous users
    action TEXT NOT NULL, -- 'recipe_create', 'search', 'upload', 'api_general'
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_request_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT user_or_ip_required CHECK (user_id IS NOT NULL OR ip_address IS NOT NULL)
);

COMMENT ON TABLE public.rate_limits IS 'Rate limiting tracking with sliding window approach';
COMMENT ON COLUMN public.rate_limits.action IS 'Type of action being rate limited';
COMMENT ON COLUMN public.rate_limits.request_count IS 'Number of requests in current window';
COMMENT ON COLUMN public.rate_limits.window_start IS 'Start of current rate limit window';

-- Composite indexes for fast rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action 
ON public.rate_limits(user_id, action, window_start DESC) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_action 
ON public.rate_limits(ip_address, action, window_start DESC) 
WHERE ip_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
ON public.rate_limits(window_start);

-- Partial index for cleanup (records older than 2 hours)
-- Note: Removed time-based predicate (CURRENT_TIMESTAMP not IMMUTABLE)
-- Cleanup function filters at query time; index remains efficient
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup 
ON public.rate_limits(window_start);

-- ------------------------------------------------------------------------------
-- 2. RATE LIMIT CONFIGURATION TABLE
-- ------------------------------------------------------------------------------
-- Centralized configuration for different rate limits
CREATE TABLE IF NOT EXISTS public.rate_limit_config (
    action TEXT PRIMARY KEY,
    max_requests INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL, -- Window size in seconds
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT positive_limits CHECK (max_requests > 0 AND window_seconds > 0)
);

COMMENT ON TABLE public.rate_limit_config IS 'Configurable rate limits for different actions';

-- Insert default rate limit configurations
INSERT INTO public.rate_limit_config (action, max_requests, window_seconds, description)
VALUES
    ('api_general', 100, 60, 'General API requests - 100 per minute'),
    ('recipe_create', 10, 60, 'Recipe creation - 10 per minute'),
    ('recipe_update', 20, 60, 'Recipe updates - 20 per minute'),
    ('search', 50, 60, 'Search queries - 50 per minute'),
    ('upload', 5, 60, 'File uploads - 5 per minute'),
    ('auth_login', 5, 300, 'Login attempts - 5 per 5 minutes'),
    ('auth_signup', 3, 3600, 'Signup attempts - 3 per hour'),
    ('password_reset', 3, 3600, 'Password reset requests - 3 per hour'),
    ('review_create', 10, 60, 'Review creation - 10 per minute'),
    ('comment_create', 20, 60, 'Comment creation - 20 per minute'),
    ('follow_action', 30, 60, 'Follow/unfollow - 30 per minute')
ON CONFLICT (action) DO UPDATE SET
    max_requests = EXCLUDED.max_requests,
    window_seconds = EXCLUDED.window_seconds,
    description = EXCLUDED.description,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 3. RATE LIMIT CHECK FUNCTION
-- ------------------------------------------------------------------------------
-- Returns: { "allowed": boolean, "remaining": integer, "reset_at": timestamp }
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_action TEXT DEFAULT 'api_general'
)
RETURNS TABLE (
    allowed BOOLEAN,
    remaining INTEGER,
    reset_at TIMESTAMPTZ,
    limit_value INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_max_requests INTEGER;
    v_window_seconds INTEGER;
    v_window_start TIMESTAMPTZ;
    v_current_count INTEGER;
    v_existing_record RECORD;
BEGIN
    -- Get rate limit configuration for this action
    SELECT max_requests, window_seconds
    INTO v_max_requests, v_window_seconds
    FROM public.rate_limit_config
    WHERE action = p_action;
    
    -- If no config found, use default general limits
    IF NOT FOUND THEN
        v_max_requests := 100;
        v_window_seconds := 60;
    END IF;
    
    -- Calculate window start time
    v_window_start := CURRENT_TIMESTAMP - (v_window_seconds || ' seconds')::INTERVAL;
    
    -- Find existing rate limit record within current window
    IF p_user_id IS NOT NULL THEN
        SELECT * INTO v_existing_record
        FROM public.rate_limits
        WHERE user_id = p_user_id
          AND action = p_action
          AND window_start > v_window_start
        ORDER BY window_start DESC
        LIMIT 1;
    ELSE
        SELECT * INTO v_existing_record
        FROM public.rate_limits
        WHERE ip_address = p_ip_address
          AND action = p_action
          AND window_start > v_window_start
        ORDER BY window_start DESC
        LIMIT 1;
    END IF;
    
    IF FOUND THEN
        v_current_count := v_existing_record.request_count;
        
        -- Check if limit exceeded
        IF v_current_count >= v_max_requests THEN
            -- Rate limit exceeded
            RETURN QUERY SELECT 
                false AS allowed,
                0 AS remaining,
                v_existing_record.window_start + (v_window_seconds || ' seconds')::INTERVAL AS reset_at,
                v_max_requests AS limit_value;
            RETURN;
        ELSE
            -- Increment counter
            UPDATE public.rate_limits
            SET 
                request_count = request_count + 1,
                last_request_at = CURRENT_TIMESTAMP
            WHERE id = v_existing_record.id;
            
            RETURN QUERY SELECT 
                true AS allowed,
                (v_max_requests - v_current_count - 1) AS remaining,
                v_existing_record.window_start + (v_window_seconds || ' seconds')::INTERVAL AS reset_at,
                v_max_requests AS limit_value;
            RETURN;
        END IF;
    ELSE
        -- No existing record, create new one
        INSERT INTO public.rate_limits (user_id, ip_address, action, request_count, window_start)
        VALUES (p_user_id, p_ip_address, p_action, 1, CURRENT_TIMESTAMP);
        
        RETURN QUERY SELECT 
            true AS allowed,
            (v_max_requests - 1) AS remaining,
            CURRENT_TIMESTAMP + (v_window_seconds || ' seconds')::INTERVAL AS reset_at,
            v_max_requests AS limit_value;
        RETURN;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.check_rate_limit IS 'Check and enforce rate limits with sliding window';

GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 4. AUTOMATIC CLEANUP FUNCTION
-- ------------------------------------------------------------------------------
-- Remove rate limit records older than 2 hours (well beyond any window)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.rate_limits
    WHERE window_start < (CURRENT_TIMESTAMP - INTERVAL '2 hours');
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_rate_limits IS 'Remove rate limit records older than 2 hours';

-- This function should be called periodically via pg_cron or external scheduler
-- Example: SELECT cron.schedule('cleanup-rate-limits', '*/15 * * * *', 'SELECT public.cleanup_old_rate_limits()');

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;

-- Rate limits: Users can view their own (for debugging/transparency)
DROP POLICY IF EXISTS "Users can view their own rate limits" ON public.rate_limits;
CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Rate limit config: Everyone can read configuration
DROP POLICY IF EXISTS "Rate limit config is publicly readable" ON public.rate_limit_config;
CREATE POLICY "Rate limit config is publicly readable"
ON public.rate_limit_config FOR SELECT
USING (true);

-- Only functions can INSERT/UPDATE rate_limits (no direct user access)
-- This is enforced by SECURITY DEFINER functions only

GRANT SELECT ON public.rate_limit_config TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 6. HELPER: GET CURRENT RATE LIMIT STATUS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_rate_limit_status(
    p_user_id UUID DEFAULT NULL,
    p_action TEXT DEFAULT 'api_general'
)
RETURNS TABLE (
    action TEXT,
    current_count INTEGER,
    max_requests INTEGER,
    remaining INTEGER,
    reset_at TIMESTAMPTZ,
    is_limited BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_config RECORD;
    v_limit_record RECORD;
    v_window_start TIMESTAMPTZ;
BEGIN
    -- Get configuration
    SELECT * INTO v_config
    FROM public.rate_limit_config
    WHERE rate_limit_config.action = p_action;
    
    IF NOT FOUND THEN
        -- Return default values
        RETURN QUERY SELECT 
            p_action,
            0::INTEGER,
            100::INTEGER,
            100::INTEGER,
            CURRENT_TIMESTAMP,
            false;
        RETURN;
    END IF;
    
    v_window_start := CURRENT_TIMESTAMP - (v_config.window_seconds || ' seconds')::INTERVAL;
    
    -- Get current rate limit record
    SELECT * INTO v_limit_record
    FROM public.rate_limits
    WHERE user_id = p_user_id
      AND rate_limits.action = p_action
      AND window_start > v_window_start
    ORDER BY window_start DESC
    LIMIT 1;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            p_action,
            v_limit_record.request_count,
            v_config.max_requests,
            GREATEST(0, v_config.max_requests - v_limit_record.request_count),
            v_limit_record.window_start + (v_config.window_seconds || ' seconds')::INTERVAL,
            v_limit_record.request_count >= v_config.max_requests;
    ELSE
        RETURN QUERY SELECT 
            p_action,
            0::INTEGER,
            v_config.max_requests,
            v_config.max_requests,
            CURRENT_TIMESTAMP + (v_config.window_seconds || ' seconds')::INTERVAL,
            false;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.get_rate_limit_status IS 'Get current rate limit status for user/action';

GRANT EXECUTE ON FUNCTION public.get_rate_limit_status TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. RATE LIMIT MIDDLEWARE HELPER
-- ------------------------------------------------------------------------------
-- This function is called by middleware before executing rate-limited actions
CREATE OR REPLACE FUNCTION public.enforce_rate_limit(
    p_user_id UUID DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_action TEXT DEFAULT 'api_general'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_result RECORD;
BEGIN
    SELECT * INTO v_result
    FROM public.check_rate_limit(p_user_id, p_ip_address, p_action);
    
    RETURN v_result.allowed;
END;
$$;

COMMENT ON FUNCTION public.enforce_rate_limit IS 'Simple boolean check for rate limit enforcement';

GRANT EXECUTE ON FUNCTION public.enforce_rate_limit TO authenticated, anon;
