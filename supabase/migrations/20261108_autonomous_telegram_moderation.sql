-- ==============================================================================
-- 20261108_autonomous_telegram_moderation.sql
-- Migration: Autonomous AI & Telegram Moderation with Anti-Tamper Locks & Cooldown
-- ==============================================================================

-- 1. Update recipe status check constraint to support 'locked' status
DO $$
BEGIN
  -- Drop existing status check constraints if any
  ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_status_check;
  
  -- Add updated check constraint allowing 'locked'
  ALTER TABLE public.recipes 
  ADD CONSTRAINT recipes_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'locked'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Add review_token to recipes for unguessable 1-click secret admin review URL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'recipes' 
      AND column_name = 'review_token'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN review_token TEXT UNIQUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recipes_review_token ON public.recipes(review_token) WHERE review_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipes_status_locked ON public.recipes(status) WHERE status = 'locked';

-- 3. Add cooldown_until and spam_strikes tracking to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'cooldown_until'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN cooldown_until TIMESTAMPTZ DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'spam_strikes'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN spam_strikes INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 4. Update Row Level Security (RLS) on recipes:
-- Locked recipes cannot be read, edited, or deleted by the author or public.

-- A. SELECT: Only approved published recipes or author's non-locked recipes
DROP POLICY IF EXISTS "Published recipes are viewable by everyone" ON public.recipes;
DROP POLICY IF EXISTS "Recipes are viewable by everyone if published" ON public.recipes;

CREATE POLICY "Published recipes are viewable by everyone"
ON public.recipes FOR SELECT
USING (
  (is_published = true AND status = 'approved')
  OR (auth.uid() = user_id AND status != 'locked')
  OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
);

-- B. UPDATE: Author cannot update a locked recipe
DROP POLICY IF EXISTS "Users can update their own recipes" ON public.recipes;

CREATE POLICY "Users can update their own recipes"
ON public.recipes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status != 'locked')
WITH CHECK (auth.uid() = user_id AND status != 'locked');

-- C. DELETE: Author cannot delete a locked recipe (Anti-Tamper: evidence preserved for admin review)
DROP POLICY IF EXISTS "Users can delete their own recipes" ON public.recipes;

CREATE POLICY "Users can delete their own recipes"
ON public.recipes FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status != 'locked');

-- 5. Notify PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';

