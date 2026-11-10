-- ==============================================================================
-- Fix Supabase Linter Warning: rls_policy_always_true (0024_permissive_rls_policy)
-- Migration: 20261031_fix_tags_rls_policy.sql
-- Description: Replaces unrestricted `WITH CHECK (true)` on `public.tags` with
--              proper authorization and validation rules.
-- ==============================================================================

-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;

-- Recreate with proper validation:
-- 1. Caller must have an active authenticated session ((SELECT auth.uid()) IS NOT NULL)
-- 2. Users cannot self-promote tags (is_promoted = false)
-- 3. Tag name and slug must not be blank
CREATE POLICY "Authenticated users can create tags"
ON public.tags FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND is_promoted = false
    AND length(trim(name)) > 0
    AND length(trim(slug)) > 0
);

