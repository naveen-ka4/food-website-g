-- ==============================================================================
-- 20261107_ai_moderation_agent_and_reports.sql
-- Migration: Autonomous AI Moderation Reports, Audit Trail, and Review Status
-- ==============================================================================

-- 1. Create ai_moderation_reports table
CREATE TABLE IF NOT EXISTS public.ai_moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('recipe', 'review', 'user')),
  entity_id UUID NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('safe', 'needs_info', 'flagged', 'rejected', 'banned')),
  confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 0.95,
  issues TEXT[] NOT NULL DEFAULT '{}',
  suggested_tags TEXT[] NOT NULL DEFAULT '{}',
  executive_summary TEXT NOT NULL,
  action_taken TEXT NOT NULL CHECK (action_taken IN ('auto_approved', 'author_notified', 'telegram_alert_sent', 'manual_reviewed', 'pending_confirmation')),
  image_analysis JSONB DEFAULT '{}'::jsonb,
  reviewed_by_channel TEXT NOT NULL DEFAULT 'ai_worker' CHECK (reviewed_by_channel IN ('ai_worker', 'telegram_button', 'admin_ui')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add moderation columns to recipe_reviews if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'recipe_reviews' 
      AND column_name = 'ai_status'
  ) THEN
    ALTER TABLE public.recipe_reviews 
    ADD COLUMN ai_status TEXT NOT NULL DEFAULT 'approved' 
    CHECK (ai_status IN ('pending', 'approved', 'flagged', 'deleted'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'recipe_reviews' 
      AND column_name = 'ai_analysis'
  ) THEN
    ALTER TABLE public.recipe_reviews 
    ADD COLUMN ai_analysis JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 3. Indexes for fast report queries and filtering
CREATE INDEX IF NOT EXISTS idx_ai_mod_reports_created_at ON public.ai_moderation_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_mod_reports_entity ON public.ai_moderation_reports(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_mod_reports_verdict ON public.ai_moderation_reports(verdict);
CREATE INDEX IF NOT EXISTS idx_ai_mod_reports_action ON public.ai_moderation_reports(action_taken);
CREATE INDEX IF NOT EXISTS idx_recipe_reviews_ai_status ON public.recipe_reviews(ai_status);

-- 4. Enable Row Level Security (RLS) on ai_moderation_reports
ALTER TABLE public.ai_moderation_reports ENABLE ROW LEVEL SECURITY;

-- Staff and administrators can view and manage all moderation reports
DROP POLICY IF EXISTS "Staff can view moderation reports" ON public.ai_moderation_reports;
CREATE POLICY "Staff can view moderation reports"
ON public.ai_moderation_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
  )
);

DROP POLICY IF EXISTS "Staff can insert moderation reports" ON public.ai_moderation_reports;
CREATE POLICY "Staff can insert moderation reports"
ON public.ai_moderation_reports FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
  )
  OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Staff can update moderation reports" ON public.ai_moderation_reports;
CREATE POLICY "Staff can update moderation reports"
ON public.ai_moderation_reports FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
  )
);

