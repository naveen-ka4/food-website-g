-- ==============================================================================
-- Hey Garlic - Engagement Tracking for Collaborative Filtering
-- Migration: 20261103_engagement_tracking.sql
-- Features:
--   1. recipe_views table tracking view duration and user behavior
--   2. user_interactions aggregate table for recommendation engine
--   3. Popularity scoring function with weighted engagement
--   4. Materialized view for trending and popular recipes
--   5. Optimized indexes for fast recommendation queries
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RECIPE VIEWS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recipe_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    view_duration INTEGER, -- seconds spent viewing (nullable for initial load)
    session_id TEXT, -- For tracking unique sessions (anonymous users)
    referrer TEXT, -- Where the user came from
    CONSTRAINT valid_duration CHECK (view_duration IS NULL OR view_duration >= 0)
);

COMMENT ON TABLE public.recipe_views IS 'Recipe view tracking for analytics and recommendations';
COMMENT ON COLUMN public.recipe_views.view_duration IS 'Time spent viewing recipe in seconds';
COMMENT ON COLUMN public.recipe_views.session_id IS 'Anonymous session tracking for guest users';

-- Indexes for fast analytics queries
CREATE INDEX IF NOT EXISTS idx_recipe_views_recipe_id ON public.recipe_views(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_views_user_id ON public.recipe_views(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipe_views_viewed_at ON public.recipe_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_views_recipe_date ON public.recipe_views(recipe_id, viewed_at DESC);

-- Partial index for recent views (last 30 days) - used for trending calculation
-- Note: Removed time-based predicate (CURRENT_TIMESTAMP not IMMUTABLE)
-- Queries will filter at query time; index remains efficient
CREATE INDEX IF NOT EXISTS idx_recipe_views_recent 
ON public.recipe_views(recipe_id, viewed_at DESC);

-- ------------------------------------------------------------------------------
-- 2. USER INTERACTIONS AGGREGATE TABLE
-- ------------------------------------------------------------------------------
-- This denormalized table speeds up recommendation queries
CREATE TABLE IF NOT EXISTS public.user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL, -- 'view', 'save', 'rate', 'share'
    interaction_score NUMERIC(3, 2) NOT NULL DEFAULT 1.0, -- Weighted score for recommendations
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional data (rating value, view duration)
    CONSTRAINT unique_interaction UNIQUE (user_id, recipe_id, interaction_type),
    CONSTRAINT valid_interaction_type CHECK (interaction_type IN ('view', 'save', 'rate', 'share'))
);

COMMENT ON TABLE public.user_interactions IS 'Aggregated user-recipe interactions for collaborative filtering';

-- Indexes for recommendation engine
CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON public.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_recipe ON public.user_interactions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_score ON public.user_interactions(interaction_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_score ON public.user_interactions(user_id, interaction_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created ON public.user_interactions(created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. ADD VIEW COUNT COLUMN TO RECIPES TABLE
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='recipes' AND column_name='view_count') THEN
        ALTER TABLE public.recipes ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='recipes' AND column_name='save_count') THEN
        ALTER TABLE public.recipes ADD COLUMN save_count INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='recipes' AND column_name='popularity_score') THEN
        ALTER TABLE public.recipes ADD COLUMN popularity_score NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='recipes' AND column_name='last_viewed_at') THEN
        ALTER TABLE public.recipes ADD COLUMN last_viewed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Index for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_recipes_popularity ON public.recipes(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_view_count ON public.recipes(view_count DESC);

-- ------------------------------------------------------------------------------
-- 4. POPULARITY SCORING FUNCTION
-- ------------------------------------------------------------------------------
-- Formula: (views × 1) + (saves × 3) + (ratings × 5) + (reviews_count × 2)
-- With time decay: score × (1 / (days_since_published + 1))
CREATE OR REPLACE FUNCTION public.calculate_popularity_score(
    p_recipe_id UUID
)
RETURNS NUMERIC(10, 2)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_view_count INTEGER;
    v_save_count INTEGER;
    v_rating NUMERIC(2, 1);
    v_reviews_count INTEGER;
    v_created_at TIMESTAMPTZ;
    v_base_score NUMERIC(10, 2);
    v_time_factor NUMERIC(5, 4);
    v_days_old NUMERIC;
BEGIN
    -- Get recipe metrics
    SELECT 
        COALESCE(view_count, 0),
        COALESCE(save_count, 0),
        COALESCE(rating, 5.0),
        COALESCE(reviews_count, 0),
        created_at
    INTO 
        v_view_count,
        v_save_count,
        v_rating,
        v_reviews_count,
        v_created_at
    FROM public.recipes
    WHERE id = p_recipe_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Calculate base score with weights
    v_base_score := (v_view_count * 1.0) + 
                    (v_save_count * 3.0) + 
                    (v_rating * v_reviews_count * 5.0) + 
                    (v_reviews_count * 2.0);
    
    -- Apply time decay (recipes lose 10% relevance per 30 days)
    v_days_old := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_created_at)) / 86400.0;
    v_time_factor := 1.0 / (1.0 + (v_days_old / 30.0) * 0.1);
    
    RETURN v_base_score * v_time_factor;
END;
$$;

COMMENT ON FUNCTION public.calculate_popularity_score IS 'Calculate weighted popularity score with time decay';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.calculate_popularity_score TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 5. TRIGGER TO UPDATE VIEW COUNT ON NEW VIEW
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_recipe_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    UPDATE public.recipes
    SET 
        view_count = view_count + 1,
        last_viewed_at = NEW.viewed_at,
        popularity_score = public.calculate_popularity_score(NEW.recipe_id),
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.recipe_id;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_view_count ON public.recipe_views;
CREATE TRIGGER trg_increment_view_count
    AFTER INSERT ON public.recipe_views
    FOR EACH ROW EXECUTE FUNCTION public.increment_recipe_view_count();

REVOKE EXECUTE ON FUNCTION public.increment_recipe_view_count() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 6. TRIGGER TO UPDATE SAVE COUNT ON BOOKMARK
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_recipe_save_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.recipes
        SET 
            save_count = save_count + 1,
            popularity_score = public.calculate_popularity_score(NEW.recipe_id),
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.recipe_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.recipes
        SET 
            save_count = GREATEST(0, save_count - 1),
            popularity_score = public.calculate_popularity_score(OLD.recipe_id),
            updated_at = timezone('utc'::text, now())
        WHERE id = OLD.recipe_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_save_count ON public.saved_recipes;
CREATE TRIGGER trg_update_save_count
    AFTER INSERT OR DELETE ON public.saved_recipes
    FOR EACH ROW EXECUTE FUNCTION public.update_recipe_save_count();

REVOKE EXECUTE ON FUNCTION public.update_recipe_save_count() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 7. MATERIALIZED VIEW FOR TRENDING RECIPES
-- ------------------------------------------------------------------------------
-- Refresh this view hourly via cron job
CREATE MATERIALIZED VIEW IF NOT EXISTS public.trending_recipes AS
SELECT 
    r.id,
    r.slug,
    r.title,
    r.hero_image,
    r.category,
    r.cook_time,
    r.rating,
    r.reviews_count,
    r.view_count,
    r.save_count,
    r.popularity_score,
    -- Calculate recent engagement (last 7 days)
    COALESCE(
        (SELECT COUNT(*) 
         FROM public.recipe_views rv 
         WHERE rv.recipe_id = r.id 
         AND rv.viewed_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
        ), 0
    ) AS recent_views,
    -- Trending score with heavier weight on recent activity
    (r.popularity_score * 0.4) + 
    (COALESCE(
        (SELECT COUNT(*) 
         FROM public.recipe_views rv 
         WHERE rv.recipe_id = r.id 
         AND rv.viewed_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
        ), 0
    ) * 0.6) AS trending_score
FROM public.recipes r
WHERE r.is_published = true
ORDER BY trending_score DESC;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_recipes_id ON public.trending_recipes(id);
CREATE INDEX IF NOT EXISTS idx_trending_recipes_score ON public.trending_recipes(trending_score DESC);

-- Grant SELECT permission on materialized view
GRANT SELECT ON public.trending_recipes TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.recipe_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- Recipe views: Users can view their own, aggregates are public
DROP POLICY IF EXISTS "Users can view their own recipe views" ON public.recipe_views;
CREATE POLICY "Users can view their own recipe views"
ON public.recipe_views FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

-- Anyone can insert views (including anonymous users)
DROP POLICY IF EXISTS "Anyone can record recipe views" ON public.recipe_views;
CREATE POLICY "Anyone can record recipe views"
ON public.recipe_views FOR INSERT
WITH CHECK (true);

-- User interactions: Users can view their own
DROP POLICY IF EXISTS "Users can view their own interactions" ON public.user_interactions;
CREATE POLICY "Users can view their own interactions"
ON public.user_interactions FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Users can insert their own interactions
DROP POLICY IF EXISTS "Users can create their own interactions" ON public.user_interactions;
CREATE POLICY "Users can create their own interactions"
ON public.user_interactions FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Explicit grants
GRANT SELECT, INSERT ON public.recipe_views TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.user_interactions TO authenticated;

-- ------------------------------------------------------------------------------
-- 9. FUNCTION TO REFRESH TRENDING RECIPES VIEW
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_trending_recipes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.trending_recipes;
END;
$$;

COMMENT ON FUNCTION public.refresh_trending_recipes IS 'Refresh trending recipes materialized view (call hourly)';

-- This should be called via pg_cron or external scheduler
-- Example: SELECT cron.schedule('refresh-trending', '0 * * * *', 'SELECT public.refresh_trending_recipes()');
