-- ==============================================================================
-- Hey Garlic - Recipe Boards Persistence & Profile Sync Migration
-- Migration: 20261031_recipe_boards_and_author_sync.sql
-- Features:
--   1. recipe_boards table for permanent Pinterest-style user boards in PostgreSQL
--   2. Strict Row Level Security (RLS) policies for user data ownership
--   3. Foreign key performance index on user_id
--   4. Profile sync trigger on auth.users UPDATE to keep public.profiles fresh
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RECIPE BOARDS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recipe_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    recipe_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast user boards retrieval
CREATE INDEX IF NOT EXISTS idx_recipe_boards_user_id ON public.recipe_boards(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_boards_created_at ON public.recipe_boards(created_at DESC);

-- Enable RLS
ALTER TABLE public.recipe_boards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own boards" ON public.recipe_boards;
CREATE POLICY "Users can view their own boards"
ON public.recipe_boards FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own boards" ON public.recipe_boards;
CREATE POLICY "Users can create their own boards"
ON public.recipe_boards FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own boards" ON public.recipe_boards;
CREATE POLICY "Users can update their own boards"
ON public.recipe_boards FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own boards" ON public.recipe_boards;
CREATE POLICY "Users can delete their own boards"
ON public.recipe_boards FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Explicit Grants for Data API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_boards TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. PROFILE AUTO-SYNC TRIGGER (auth.users UPDATE -> public.profiles)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_user_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    UPDATE public.profiles
    SET
        full_name = COALESCE(
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'display_name',
            new.raw_user_meta_data->>'name',
            public.profiles.full_name
        ),
        avatar_url = COALESCE(
            new.raw_user_meta_data->>'avatar_url',
            new.raw_user_meta_data->>'picture',
            public.profiles.avatar_url
        ),
        bio = COALESCE(new.raw_user_meta_data->>'bio', public.profiles.bio),
        tagline = COALESCE(new.raw_user_meta_data->>'tagline', public.profiles.tagline),
        status = COALESCE(new.raw_user_meta_data->>'status', public.profiles.status),
        updated_at = timezone('utc'::text, now())
    WHERE id = new.id;

    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE OF raw_user_meta_data ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_profile_update();

REVOKE EXECUTE ON FUNCTION public.handle_user_profile_update() FROM PUBLIC, anon, authenticated;

