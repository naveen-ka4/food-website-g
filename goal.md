### Site name

Hey Garlic

---

### Goal

Users can register/login, publish clean, human-crafted food recipes with zero blog fluff and lightweight photos, and search through community recipes using instant full-text filtering.

---

### Decisions

* **Tech Stack**: Next.js (App Router, TypeScript) with Tailwind CSS, shadcn/ui (Nova preset), and Lucide icons.
* **Backend & Data Access**: Self-hosted Supabase Lite on Oracle A1 VPS accessed strictly via `@supabase/ssr` to preserve Row Level Security (RLS) and eliminate ORM connection bloat.
* **Storage & Bandwidth**: Enforce client-side WebP compression (`browser-image-compression` under 100 KB) prior to uploading to local Supabase Storage to conserve VPS disk space.
* **Search Engine**: PostgreSQL native Full-Text Search (`tsvector` generated column + GIN index) instead of heavy external search APIs.
* **Content Structure**: Structured JSONB for ingredients and steps, deliberately excluding long biographical story sections.

---

### Out of scope

* Affiliate cart integrations (Instacart, Amazon Fresh) and payment gateways (Stripe).
* AI recipe generators, chatbots, or automated scrapers.
* Social networking features (comments, follows, direct messages).
* Multi-language localization (initial MVP defaults to English).

---

### Steps

#### 1. Supabase Database Schema, Storage, and RLS Setup

* **Prompt**: Connect to the self-hosted Supabase instance. Create the `profiles` table linked to `auth.users`, and the `recipes` table with columns: `id`, `user_id`, `title`, `cooking_time`, `ingredients` (JSONB), `steps` (JSONB), `image_url`, and a generated `search_tokens` TSVECTOR column indexed with GIN. Set up an open public storage bucket named `recipe-images`. Enable RLS on `recipes` with public SELECT policies and authenticated-only INSERT/UPDATE policies bound to `auth.uid() = user_id`.
* **Files**: `supabase/migrations/001_initial_schema.sql`
* **Done looks like**: Database tables, indexes, storage bucket, and RLS policies are applied and test queries succeed.

#### 2. Next.js Base Configuration & Supabase SSR Clients

* **Prompt**: Configure the Next.js project to support standalone output for Docker deployment. Set up environment variables in `.env.local` for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Implement the browser client in `src/lib/supabase/client.ts`, the server client in `src/lib/supabase/server.ts`, and the session update proxy in `src/middleware.ts`. Initialize shadcn/ui base layout and utility helpers (`cn`).
* **Files**: `next.config.mjs`, `.env.local`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/middleware.ts`, `src/lib/utils.ts`
* **Done looks like**: The app builds cleanly with `npm run build`, and both server components and client components can read auth sessions without errors.

#### 3. Authentication Flows (Sign Up, Sign In, Sign Out)

* **Prompt**: Build clean authentication pages at `/login` and `/register` using React Hook Form and Zod validation. Call `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()` through Server Actions. Include an automatic profile row trigger in Postgres upon user signup, and create a responsive `Navbar` component displaying active user state or login buttons.
* **Files**: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/components/navbar.tsx`, `src/app/actions/auth.ts`
* **Done looks like**: A new user can register, verify session persistence across page refreshes, and successfully log out.

#### 4. Recipe Creation with Client-Side Compression

* **Prompt**: Build the recipe submission page at `/recipes/create`. Use React Hook Form with `useFieldArray` to allow adding/removing dynamic ingredient rows (name, amount) and step instructions. Implement an image upload handler that compresses photos to `< 100 KB` WebP in the browser before pushing to the `recipe-images` Supabase storage bucket. Save the structured recipe record via a Next.js Server Action bound to the user's UUID.
* **Files**: `src/app/recipes/create/page.tsx`, `src/components/recipe-form.tsx`, `src/lib/compress.ts`, `src/app/actions/recipes.ts`
* **Done looks like**: Authenticated users can upload a compressed recipe image, add ingredients/steps dynamically, and save the record to Postgres, returning the created recipe ID.

#### 5. Recipe Feed, Search, and Clean Detail View

* **Prompt**: Build the homepage (`/`) featuring a search input and a clean card grid displaying recipe thumbnails, title, cooking time, and author. Integrate PostgreSQL Full-Text Search querying `search_tokens` using URL search parameters (`?q=...`). Create a minimalist recipe detail page at `/recipes/[id]` that showcases ingredients as an interactive checklist, numbered steps, and a clean reading interface without ads.
* **Files**: `src/app/page.tsx`, `src/components/recipe-card.tsx`, `src/app/recipes/[id]/page.tsx`, `src/components/search-bar.tsx`
* **Done looks like**: Search updates the recipe feed in real time without page reload, and clicking a card loads the full, ad-free recipe view.

---

### Verification

* **Auth Flow**: Register a new user, log in, refresh the page to confirm session retention, and log out.
* **Image Compression**: Upload an uncompressed 5 MB JPEG photo; verify in Supabase Storage network tab that the uploaded payload is WebP format and under 100 KB.
* **RLS Protection Check**: Attempt to insert a recipe without an active auth cookie or with a mismatched `user_id`; ensure Supabase rejects the write operation.
* **Search Execution**: Query specific recipe titles and ingredient words (e.g., "garlic", "pasta") using the search bar; verify only matching cards render.
* **End-to-End Run**: Register a user -> create a recipe with photo, 4 ingredients, and 3 steps -> search and find the recipe on the homepage -> view the recipe detail page and test the ingredient checkboxes.

---

### AGENTS.md updates

* **Architecture Rules (`# Architectural Standards`)**:
* Do not introduce Prisma or alternate ORMs; all database interactions must utilize `@supabase/ssr` or `@supabase/supabase-js` to preserve Row Level Security.
* Image uploads must always pass through client-side compression (`browser-image-compression`) before touching Supabase Storage to safeguard VPS disk space.
* Keep `output: 'standalone'` enabled in `next.config.mjs` for ARM64 Docker compatibility on Dokploy.
* Recipe schemas must remain strictly instructional (no narrative storytelling or blog-filler attributes permitted in models).