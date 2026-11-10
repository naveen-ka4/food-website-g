-- ==============================================================================
-- Hey Garlic - Supabase Security Advisor Fixes
-- Run this script in the Supabase SQL Editor to clear all 7 security warnings.
-- ==============================================================================

-- 1. Move pg_trgm extension out of public schema to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE e.extname = 'pg_trgm' AND n.nspname = 'public'
    ) THEN
        ALTER EXTENSION pg_trgm SET SCHEMA extensions;
    ELSE
        CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;
    END IF;
END $$;

-- 2. Drop broad SELECT listing policies on public storage buckets
-- Public buckets (public = true) do NOT need SELECT policies on storage.objects.
-- Public URLs already work automatically, and removing these prevents unauthorized file listing.
DROP POLICY IF EXISTS "Public read recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

-- 3. Revoke direct RPC execution on internal SECURITY DEFINER trigger functions
-- These functions are executed automatically by Postgres database triggers.
-- Revoking EXECUTE prevents anon and authenticated users from invoking them via the REST API (/rpc/...)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_recipe_rating() FROM PUBLIC, anon, authenticated;
