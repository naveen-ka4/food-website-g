-- ==============================================================================
-- 20261105_ai_moderation_and_review_queue.sql
-- Migration: AI Moderation Pipeline, Review Queue, and User Ban Capabilities
-- ==============================================================================

-- 1. Add moderation columns to recipes table
DO $$ 
BEGIN
  -- status: 'pending' | 'approved' | 'rejected'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'recipes' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.recipes 
    ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;

  -- ai_score: 0.00 to 1.00 (e.g. 0.95 = 95% safe)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'recipes' 
      AND column_name = 'ai_score'
  ) THEN
    ALTER TABLE public.recipes 
    ADD COLUMN ai_score NUMERIC(3, 2);
  END IF;

  -- ai_analysis: JSONB storing issues, suggested tags, and summary
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'recipes' 
      AND column_name = 'ai_analysis'
  ) THEN
    ALTER TABLE public.recipes 
    ADD COLUMN ai_analysis JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- moderation_note: Rejection reasons or internal curator notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'recipes' 
      AND column_name = 'moderation_note'
  ) THEN
    ALTER TABLE public.recipes 
    ADD COLUMN moderation_note TEXT;
  END IF;

  -- reviewed_at: Timestamp when moderator reviewed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'recipes' 
      AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE public.recipes 
    ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;

  -- reviewed_by: Foreign key to staff profile
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'recipes' 
      AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE public.recipes 
    ADD COLUMN reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Add is_banned column to profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3. Indexes for fast queue and status filtering
CREATE INDEX IF NOT EXISTS idx_recipes_status ON public.recipes(status);
CREATE INDEX IF NOT EXISTS idx_recipes_ai_score ON public.recipes(ai_score);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);

-- 4. Backfill existing published recipes to 'approved'
UPDATE public.recipes 
SET status = 'approved',
    ai_score = COALESCE(ai_score, 0.98),
    reviewed_at = COALESCE(reviewed_at, created_at)
WHERE is_published = true AND (status IS NULL OR status = 'pending');

-- 5. RLS Policies: Restrict banned users from submitting new content
DROP POLICY IF EXISTS "Banned users cannot insert recipes" ON public.recipes;
CREATE POLICY "Banned users cannot insert recipes"
ON public.recipes FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_banned = true
  )
);

DROP POLICY IF EXISTS "Banned users cannot insert reviews" ON public.recipe_reviews;
CREATE POLICY "Banned users cannot insert reviews"
ON public.recipe_reviews FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_banned = true
  )
);

