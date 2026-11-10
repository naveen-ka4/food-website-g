-- ==============================================================================
-- 20261104_admin_role_and_policies.sql
-- Migration: Add Admin Role, Escalation Protection, and Admin RLS Policies
-- ==============================================================================

-- 1. Add role column to profiles table if it doesn't already exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN role TEXT NOT NULL DEFAULT 'user' 
    CHECK (role IN ('user', 'moderator', 'admin'));
  END IF;
END $$;

-- Index on role for fast role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ------------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS: is_admin & is_staff
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(lookup_uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = COALESCE(lookup_uid, auth.uid()) AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff(lookup_uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = COALESCE(lookup_uid, auth.uid()) AND role IN ('admin', 'moderator')
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 3. ROLE ESCALATION PREVENTION TRIGGER
-- Regular users must NOT be able to change their own or others' roles!
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If role is being changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Only allow if calling user is already an admin OR executed via service_role / superuser
    IF NOT public.is_admin(auth.uid()) AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
      RAISE EXCEPTION 'Access Denied: You are not authorized to modify user roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- ------------------------------------------------------------------------------
-- 4. ADMIN RLS POLICIES FOR RECIPES
-- ------------------------------------------------------------------------------
-- Admins and staff can view all recipes (including unpublished ones)
DROP POLICY IF EXISTS "Staff can view all recipes" ON public.recipes;
CREATE POLICY "Staff can view all recipes"
ON public.recipes FOR SELECT
TO authenticated
USING (public.is_staff());

-- Admins can update any recipe (toggle publish, edit, feature)
DROP POLICY IF EXISTS "Admins can update all recipes" ON public.recipes;
CREATE POLICY "Admins can update all recipes"
ON public.recipes FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- Admins can delete any recipe
DROP POLICY IF EXISTS "Admins can delete all recipes" ON public.recipes;
CREATE POLICY "Admins can delete all recipes"
ON public.recipes FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. ADMIN RLS POLICIES FOR REVIEWS
-- ------------------------------------------------------------------------------
-- Staff can delete any review (spam/moderation)
DROP POLICY IF EXISTS "Staff can delete reviews" ON public.recipe_reviews;
CREATE POLICY "Staff can delete reviews"
ON public.recipe_reviews FOR DELETE
TO authenticated
USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 6. ADMIN RLS POLICIES FOR CATEGORIES & TAGS
-- ------------------------------------------------------------------------------
-- Admins can manage categories
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
ON public.categories FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE
TO authenticated
USING (public.is_admin());

-- Admins can update tags (e.g. set is_promoted = true) and delete tags
DROP POLICY IF EXISTS "Staff can update tags" ON public.tags;
CREATE POLICY "Staff can update tags"
ON public.tags FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Admins can delete tags" ON public.tags;
CREATE POLICY "Admins can delete tags"
ON public.tags FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. ADMIN RLS POLICIES FOR USER PROFILES
-- ------------------------------------------------------------------------------
-- Admins can update profiles (including roles via trigger validation)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

