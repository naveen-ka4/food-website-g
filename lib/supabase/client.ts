import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a singleton Supabase client for use in browser / Client Components.
 * Persists session using cookies so server components and middleware can read it.
 * Uses environment variables without hardcoding.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env file."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
