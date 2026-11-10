-- ==============================================================================
-- Hey Garlic - Complete Dynamic Backend Schema Migration
-- Database: PostgreSQL (Supabase)
-- Features: Auth Sync, Profiles, Recipes, Ingredients, Instructions,
--           Saved Recipes (Bookmarks), Likes/Ratings, Full-Text Search,
--           Storage Buckets, RLS Policies, and Realtime Configuration.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;

-- ------------------------------------------------------------------------------
-- 2. ENUMS & DOMAINS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recipe_meal_type') THEN
        CREATE TYPE public.recipe_meal_type AS ENUM (
            'Breakfast',
            'Lunch',
            'Dinner',
            'Snack',
            'Dessert'
        );
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. PROFILES TABLE (Linked to auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    tagline TEXT,
    status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast lookup by username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- ------------------------------------------------------------------------------
-- 4. AUTOMATIC PROFILE CREATION TRIGGER (auth.users -> public.profiles)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    user_name TEXT;
    avatar TEXT;
BEGIN
    user_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );
    avatar := COALESCE(
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'picture',
        NULL
    );

    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
        new.id,
        LOWER(REGEXP_REPLACE(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')) || '_' || SUBSTRING(new.id::text, 1, 4),
        user_name,
        avatar
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        updated_at = timezone('utc'::text, now());

    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Revoke direct REST API RPC execution (Trigger only)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 5. RECIPES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    hero_image TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    meal_type public.recipe_meal_type NOT NULL DEFAULT 'Dinner',
    tag TEXT DEFAULT 'Quick & Easy',
    dietary_tag TEXT,
    tip TEXT,
    cook_time INTEGER NOT NULL DEFAULT 20, -- in minutes
    prep_time INTEGER NOT NULL DEFAULT 10, -- in minutes
    default_servings INTEGER NOT NULL DEFAULT 2,
    rating NUMERIC(2, 1) NOT NULL DEFAULT 5.0,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
    instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
    search_tokens TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(ingredients::text, '')), 'D')
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Unique index for slug per user or global unique slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_slug ON public.recipes(slug);

-- Foreign key & filtering indexes (Crucial for Postgres performance)
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON public.recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON public.recipes(meal_type);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON public.recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_search_tokens ON public.recipes USING GIN(search_tokens);

-- RLS for Recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published recipes are viewable by everyone"
ON public.recipes FOR SELECT
USING (is_published = true OR (select auth.uid()) = user_id);

CREATE POLICY "Authenticated users can create recipes"
ON public.recipes FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own recipes"
ON public.recipes FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own recipes"
ON public.recipes FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- ------------------------------------------------------------------------------
-- 6. SAVED RECIPES (Bookmarks)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_saved_recipe UNIQUE (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON public.saved_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_recipe_id ON public.saved_recipes(recipe_id);

ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved recipes"
ON public.saved_recipes FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can save recipes"
ON public.saved_recipes FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can unsave recipes"
ON public.saved_recipes FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- ------------------------------------------------------------------------------
-- 7. RECIPE RATINGS & REVIEWS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recipe_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_recipe_review UNIQUE (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_reviews_recipe_id ON public.recipe_reviews(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_reviews_user_id ON public.recipe_reviews(user_id);

ALTER TABLE public.recipe_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipe reviews are viewable by everyone"
ON public.recipe_reviews FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can submit a review"
ON public.recipe_reviews FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own review"
ON public.recipe_reviews FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own review"
ON public.recipe_reviews FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- Function to recalculate average recipe rating on review change
CREATE OR REPLACE FUNCTION public.sync_recipe_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    target_recipe_id UUID;
    avg_rating NUMERIC(2, 1);
    total_reviews INTEGER;
BEGIN
    target_recipe_id := COALESCE(NEW.recipe_id, OLD.recipe_id);

    SELECT COALESCE(AVG(rating), 5.0), COUNT(*)
    INTO avg_rating, total_reviews
    FROM public.recipe_reviews
    WHERE recipe_id = target_recipe_id;

    UPDATE public.recipes
    SET rating = avg_rating,
        reviews_count = total_reviews,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_recipe_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_recipe_rating ON public.recipe_reviews;
CREATE TRIGGER trg_sync_recipe_rating
    AFTER INSERT OR UPDATE OR DELETE ON public.recipe_reviews
    FOR EACH ROW EXECUTE FUNCTION public.sync_recipe_rating();

-- Revoke direct REST API RPC execution (Trigger only)
REVOKE EXECUTE ON FUNCTION public.sync_recipe_rating() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 8. STORAGE BUCKETS SETUP & POLICIES
-- ------------------------------------------------------------------------------
-- Insert buckets if they don't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('recipe-images', 'recipe-images', true, 5242880, ARRAY['image/webp', 'image/jpeg', 'image/png']),
    ('avatars', 'avatars', true, 2097152, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public buckets (public = true) do not need SELECT policies on storage.objects.
-- Public object URLs work automatically without exposing file listing/enumeration.

-- Storage RLS: Authenticated upload for recipe images
CREATE POLICY "Authenticated users can upload recipe images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recipe-images');

CREATE POLICY "Users can update own recipe images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'recipe-images');

CREATE POLICY "Users can delete own recipe images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'recipe-images');

-- Storage RLS: Authenticated upload for avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- ------------------------------------------------------------------------------
-- 9. REALTIME PUBLICATION SETUP
-- ------------------------------------------------------------------------------
-- Enable Supabase Realtime replication on dynamic tables
DO $$ BEGIN
    -- Add recipes to realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'recipes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.recipes;
    END IF;

    -- Add saved_recipes to realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'saved_recipes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_recipes;
    END IF;

    -- Add recipe_reviews to realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'recipe_reviews'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.recipe_reviews;
    END IF;
END $$;
