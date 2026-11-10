-- ==============================================================================
-- Hey Garlic - User Following System Migration
-- Migration: 20261103_user_following_system.sql
-- Features:
--   1. user_follows table with optimized bidirectional indexes
--   2. Denormalized follower/following counts in profiles
--   3. Database triggers for automatic counter updates
--   4. Comprehensive RLS policies for social features
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. USER_FOLLOWS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Prevent self-follows and duplicate follows
    CONSTRAINT no_self_follow CHECK (follower_id != following_id),
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

COMMENT ON TABLE public.user_follows IS 'User following relationships with bidirectional lookup optimization';
COMMENT ON COLUMN public.user_follows.follower_id IS 'User who is following';
COMMENT ON COLUMN public.user_follows.following_id IS 'User being followed';

-- Bidirectional indexes for fast follower/following queries
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON public.user_follows(created_at DESC);
-- Composite index for "mutual follows" queries
CREATE INDEX IF NOT EXISTS idx_user_follows_mutual ON public.user_follows(follower_id, following_id);

-- ------------------------------------------------------------------------------
-- 2. ADD DENORMALIZED COUNTERS TO PROFILES TABLE
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='profiles' AND column_name='follower_count') THEN
        ALTER TABLE public.profiles ADD COLUMN follower_count INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='profiles' AND column_name='following_count') THEN
        ALTER TABLE public.profiles ADD COLUMN following_count INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Index for sorting users by popularity
CREATE INDEX IF NOT EXISTS idx_profiles_follower_count ON public.profiles(follower_count DESC);

-- ------------------------------------------------------------------------------
-- 3. DATABASE TRIGGER TO UPDATE FOLLOWER/FOLLOWING COUNTS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment following count for follower
        UPDATE public.profiles
        SET following_count = following_count + 1,
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.follower_id;
        
        -- Increment follower count for the user being followed
        UPDATE public.profiles
        SET follower_count = follower_count + 1,
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.following_id;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement following count for follower
        UPDATE public.profiles
        SET following_count = GREATEST(0, following_count - 1),
            updated_at = timezone('utc'::text, now())
        WHERE id = OLD.follower_id;
        
        -- Decrement follower count for the user being unfollowed
        UPDATE public.profiles
        SET follower_count = GREATEST(0, follower_count - 1),
            updated_at = timezone('utc'::text, now())
        WHERE id = OLD.following_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_follow_counts ON public.user_follows;
CREATE TRIGGER trg_update_follow_counts
    AFTER INSERT OR DELETE ON public.user_follows
    FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- Revoke direct REST API RPC execution (Trigger only)
REVOKE EXECUTE ON FUNCTION public.update_follow_counts() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. INITIALIZE EXISTING FOLLOWER/FOLLOWING COUNTS (BACKFILL)
-- ------------------------------------------------------------------------------
-- This ensures any existing data has accurate counts
UPDATE public.profiles p
SET 
    following_count = (
        SELECT COUNT(*) FROM public.user_follows uf 
        WHERE uf.follower_id = p.id
    ),
    follower_count = (
        SELECT COUNT(*) FROM public.user_follows uf 
        WHERE uf.following_id = p.id
    );

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can view who follows whom (public social graph)
DROP POLICY IF EXISTS "User follows are viewable by everyone" ON public.user_follows;
CREATE POLICY "User follows are viewable by everyone"
ON public.user_follows FOR SELECT
USING (true);

-- Authenticated users can follow others
DROP POLICY IF EXISTS "Authenticated users can follow others" ON public.user_follows;
CREATE POLICY "Authenticated users can follow others"
ON public.user_follows FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = follower_id);

-- Users can only unfollow people they are following
DROP POLICY IF EXISTS "Users can unfollow their own follows" ON public.user_follows;
CREATE POLICY "Users can unfollow their own follows"
ON public.user_follows FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = follower_id);

-- Explicit grants for Data API
GRANT SELECT ON public.user_follows TO authenticated, anon;
GRANT INSERT, DELETE ON public.user_follows TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. HELPER FUNCTIONS FOR COMMON QUERIES
-- ------------------------------------------------------------------------------

-- Check if user A follows user B
CREATE OR REPLACE FUNCTION public.is_following(
    user_a UUID,
    user_b UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_follows
        WHERE follower_id = user_a AND following_id = user_b
    );
END;
$$;

COMMENT ON FUNCTION public.is_following IS 'Check if user_a is following user_b';

-- Check if two users follow each other (mutual follow)
CREATE OR REPLACE FUNCTION public.is_mutual_follow(
    user_a UUID,
    user_b UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) = 2 FROM public.user_follows
        WHERE (follower_id = user_a AND following_id = user_b)
           OR (follower_id = user_b AND following_id = user_a)
    );
END;
$$;

COMMENT ON FUNCTION public.is_mutual_follow IS 'Check if user_a and user_b follow each other';

-- Grant execute permissions for authenticated users
GRANT EXECUTE ON FUNCTION public.is_following TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_mutual_follow TO authenticated, anon;
