-- ==============================================================================
-- Hey Garlic - Social Notifications & Review Replies Schema
-- Migration: 20261031_social_notifications_and_replies.sql
-- Features:
--   1. review_replies table (threaded replies on recipe reviews)
--   2. notifications table (reviews, replies, saves, likes, milestones)
--   3. Partial and compound indexes for fast inbox & unread badge queries
--   4. Strict Row Level Security (RLS) with cached auth.uid()
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REVIEW REPLIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.recipe_reviews(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.review_replies IS 'Threaded discussion comments and replies on recipe reviews';

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON public.review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_recipe_id ON public.review_replies(recipe_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON public.review_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_created_at ON public.review_replies(created_at ASC);

-- Row Level Security
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review replies are viewable by everyone"
ON public.review_replies FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create review replies"
ON public.review_replies FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND length(trim(comment)) > 0
);

CREATE POLICY "Users can update their own review replies"
ON public.review_replies FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND length(trim(comment)) > 0
);

CREATE POLICY "Users can delete their own review replies"
ON public.review_replies FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- ------------------------------------------------------------------------------
-- 2. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Recipient
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,         -- Triggerer / Performer
    type TEXT NOT NULL,                                                     -- 'review', 'review_reply', 'save', 'recipe_like', 'milestone', 'system'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT NOT NULL,                                                     -- Direct navigation URL (/recipe/slug#reviews)
    is_read BOOLEAN NOT NULL DEFAULT false,
    entity_id TEXT,                                                         -- Target ID (recipe or review UUID)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.notifications IS 'User inbox notifications for reviews, replies, saves, and community events';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_date ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications(actor_id);
-- Partial index for lightning-fast unread count checks
CREATE INDEX IF NOT EXISTS idx_notifications_unread_count ON public.notifications(user_id) WHERE is_read = false;

-- Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Authenticated users can insert notifications for recipients"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) = actor_id
    AND user_id != (SELECT auth.uid())
);

