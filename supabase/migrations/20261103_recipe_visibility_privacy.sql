-- ==============================================================================
-- Hey Garlic - Recipe Visibility and Privacy Controls
-- Migration: 20261103_recipe_visibility_privacy.sql
-- Features:
--   1. visibility ENUM column (public, private, unlisted)
--   2. published_at timestamp for accurate sorting
--   3. Updated RLS policies respecting visibility settings
--   4. Helper function to check recipe visibility based on context
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATE VISIBILITY ENUM TYPE
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recipe_visibility') THEN
        CREATE TYPE public.recipe_visibility AS ENUM ('public', 'private', 'unlisted');
    END IF;
END $$;

COMMENT ON TYPE public.recipe_visibility IS 'Recipe visibility levels: public (discoverable), private (owner only), unlisted (link only)';

-- ------------------------------------------------------------------------------
-- 2. ADD VISIBILITY COLUMNS TO RECIPES TABLE
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    -- Add visibility column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='recipes' AND column_name='visibility') THEN
        ALTER TABLE public.recipes ADD COLUMN visibility public.recipe_visibility NOT NULL DEFAULT 'public';
    END IF;
    
    -- Add published_at timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='recipes' AND column_name='published_at') THEN
        ALTER TABLE public.recipes ADD COLUMN published_at TIMESTAMPTZ;
    END IF;
    
    -- Add draft flag (for backward compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='recipes' AND column_name='is_draft') THEN
        ALTER TABLE public.recipes ADD COLUMN is_draft BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Backfill published_at for existing published recipes
UPDATE public.recipes
SET published_at = created_at
WHERE is_published = true AND published_at IS NULL;

-- Sync is_draft with is_published
UPDATE public.recipes
SET is_draft = NOT is_published
WHERE is_draft = false AND is_published = false;

-- Index for filtering by visibility
CREATE INDEX IF NOT EXISTS idx_recipes_visibility ON public.recipes(visibility);
CREATE INDEX IF NOT EXISTS idx_recipes_published_at ON public.recipes(published_at DESC NULLS LAST);

-- Composite index for common query pattern: visibility + published date
CREATE INDEX IF NOT EXISTS idx_recipes_visibility_published 
ON public.recipes(visibility, published_at DESC NULLS LAST) 
WHERE is_published = true;

-- ------------------------------------------------------------------------------
-- 3. TRIGGER TO SET PUBLISHED_AT ON FIRST PUBLISH
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_published_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    -- If recipe is being published for the first time
    IF NEW.is_published = true AND OLD.is_published = false AND NEW.published_at IS NULL THEN
        NEW.published_at := timezone('utc'::text, now());
        NEW.is_draft := false;
    END IF;
    
    -- If recipe is being unpublished, mark as draft
    IF NEW.is_published = false AND OLD.is_published = true THEN
        NEW.is_draft := true;
    END IF;
    
    -- If visibility is set to private, ensure it's not marked as published in searches
    IF NEW.visibility = 'private' THEN
        NEW.is_published := false;
        NEW.is_draft := true;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_published_at ON public.recipes;
CREATE TRIGGER trg_set_published_at
    BEFORE UPDATE ON public.recipes
    FOR EACH ROW EXECUTE FUNCTION public.set_published_at();

REVOKE EXECUTE ON FUNCTION public.set_published_at() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. HELPER FUNCTION TO CHECK RECIPE VISIBILITY
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_recipe(
    p_recipe_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_visibility public.recipe_visibility;
    v_owner_id UUID;
    v_is_published BOOLEAN;
BEGIN
    -- Get recipe visibility and owner
    SELECT visibility, user_id, is_published
    INTO v_visibility, v_owner_id, v_is_published
    FROM public.recipes
    WHERE id = p_recipe_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Owner can always view their own recipes
    IF p_user_id = v_owner_id THEN
        RETURN true;
    END IF;
    
    -- Private recipes: owner only
    IF v_visibility = 'private' THEN
        RETURN false;
    END IF;
    
    -- Unlisted recipes: accessible by direct link only (if published)
    IF v_visibility = 'unlisted' THEN
        RETURN v_is_published;
    END IF;
    
    -- Public recipes: accessible to everyone (if published)
    IF v_visibility = 'public' THEN
        RETURN v_is_published;
    END IF;
    
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_view_recipe IS 'Check if user can view a recipe based on visibility settings';

GRANT EXECUTE ON FUNCTION public.can_view_recipe TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 5. UPDATE RLS POLICIES TO RESPECT VISIBILITY
-- ------------------------------------------------------------------------------

-- Drop existing recipe SELECT policy
DROP POLICY IF EXISTS "Published recipes are viewable by everyone" ON public.recipes;

-- New comprehensive SELECT policy respecting visibility
CREATE POLICY "Recipes viewable based on visibility and ownership"
ON public.recipes FOR SELECT
USING (
    -- Owner can always view their own recipes
    (SELECT auth.uid()) = user_id
    OR
    -- Public published recipes are viewable by everyone
    (visibility = 'public' AND is_published = true)
    OR
    -- Unlisted published recipes are viewable by direct access
    (visibility = 'unlisted' AND is_published = true)
    -- Private recipes are ONLY viewable by owner (covered by first condition)
);

-- Update INSERT policy to allow setting visibility
DROP POLICY IF EXISTS "Authenticated users can create recipes" ON public.recipes;
CREATE POLICY "Authenticated users can create recipes"
ON public.recipes FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND visibility IN ('public', 'private', 'unlisted')
);

-- Update UPDATE policy to allow changing visibility
DROP POLICY IF EXISTS "Users can update their own recipes" ON public.recipes;
CREATE POLICY "Users can update their own recipes"
ON public.recipes FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND visibility IN ('public', 'private', 'unlisted')
);

-- DELETE policy remains unchanged (owner can delete)

-- ------------------------------------------------------------------------------
-- 6. HELPER FUNCTION TO GET VISIBLE RECIPES FOR USER
-- ------------------------------------------------------------------------------
-- This function is useful for feed generation and search
CREATE OR REPLACE FUNCTION public.get_visible_recipes_for_user(
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    slug TEXT,
    title TEXT,
    hero_image TEXT,
    category TEXT,
    cook_time INTEGER,
    rating NUMERIC,
    reviews_count INTEGER,
    visibility recipe_visibility,
    published_at TIMESTAMPTZ,
    user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.slug,
        r.title,
        r.hero_image,
        r.category,
        r.cook_time,
        r.rating,
        r.reviews_count,
        r.visibility,
        r.published_at,
        r.user_id
    FROM public.recipes r
    WHERE 
        r.is_published = true
        AND (
            -- Public recipes
            r.visibility = 'public'
            OR
            -- Unlisted recipes (accessible via direct link)
            r.visibility = 'unlisted'
            OR
            -- User's own recipes (any visibility)
            (p_user_id IS NOT NULL AND r.user_id = p_user_id)
        )
    ORDER BY r.published_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.get_visible_recipes_for_user IS 'Get recipes visible to a user based on visibility rules';

GRANT EXECUTE ON FUNCTION public.get_visible_recipes_for_user TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 7. STATISTICS: COUNT RECIPES BY VISIBILITY
-- ------------------------------------------------------------------------------
-- Useful for user profile stats
CREATE OR REPLACE FUNCTION public.count_user_recipes_by_visibility(
    p_user_id UUID
)
RETURNS TABLE (
    visibility recipe_visibility,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.visibility,
        COUNT(*)::BIGINT
    FROM public.recipes r
    WHERE r.user_id = p_user_id
    GROUP BY r.visibility;
END;
$$;

COMMENT ON FUNCTION public.count_user_recipes_by_visibility IS 'Count user recipes by visibility type';

GRANT EXECUTE ON FUNCTION public.count_user_recipes_by_visibility TO authenticated;

-- ------------------------------------------------------------------------------
-- 8. MIGRATION HELPER: BACKFILL VISIBILITY FROM IS_PUBLISHED
-- ------------------------------------------------------------------------------
-- Convert existing is_published flags to appropriate visibility
UPDATE public.recipes
SET visibility = CASE
    WHEN is_published = true THEN 'public'::recipe_visibility
    ELSE 'private'::recipe_visibility
END
WHERE visibility IS NULL;

-- Ensure all published recipes have published_at
UPDATE public.recipes
SET published_at = COALESCE(published_at, created_at)
WHERE is_published = true AND published_at IS NULL;
