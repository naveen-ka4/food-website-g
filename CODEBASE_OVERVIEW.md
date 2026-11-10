# Codebase Overview: Food Web Application

## 1. Project Summary

This project (`food-web/app`) is a modern web application built on the **Next.js 16 (App Router)** framework with **React 19** and **Tailwind CSS v4**. It is currently configured with **Supabase** for backend services (authentication, database, and storage), **Shadcn UI (Base UI)** for accessible UI components, and a robust validation and form management toolchain.

Currently, the project is in the **foundational/scaffolding phase**: all core architecture, libraries, environment configurations, and theme tokens are set up and ready for feature implementation.

---

## 2. Technology Stack & Key Dependencies

### Core Framework & Runtime
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **Next.js** | `16.4.2` | React framework with App Router, Turbopack, and Server Components |
| **React / React DOM** | `19.3.0` | Core UI library |
| **TypeScript** | `^5` | Strict static typing (`tsconfig.json`) |

### Styling & Design System
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **Tailwind CSS** | `^4` | Modern CSS framework configured with `@theme inline` & OKLCH color model |
| **@tailwindcss/turbopack**| `^4` | Turbopack CSS compilation support |
| **tw-animate-css** | `^1.4.0` | CSS keyframe animations for Tailwind |
| **class-variance-authority** | `^0.7.1` | Type-safe component variant management |
| **clsx / tailwind-merge** | Latest | Class name merging and conditional styling |

### UI Components & Icons
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **@base-ui/react** | `^1.9.0` | Unstyled headless accessible primitives (backing Shadcn) |
| **shadcn** | `^1.0.0` | Component styling pattern (`base-nova` style) |
| **lucide-react** | `^1.60.0` | Icon system |
| **sonner** | `^2.0.8` | Toast notifications |

### Backend, Database & Auth
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **@supabase/supabase-js** | `^2.118.0` | Supabase JavaScript client |
| **@supabase/ssr** | `^0.12.7` | Supabase server-side rendering & cookie session helpers |

### Forms, Validation & Utilities
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **react-hook-form** | `^7.90.0` | High-performance React form state management |
| **zod** | `^4.6.7` | Schema definition and data validation |
| **@hookform/resolvers** | `^6.0.0` | Zod resolver adapter for React Hook Form |
| **browser-image-compression**| `^2.0.2`| Client-side image optimization (e.g. food/profile uploads) |

---

## 3. Directory Structure

```text
d:/food-web/app/
├── .agents/                      # Custom AI agent skill configurations
│   └── skills/
│       ├── supabase/             # Supabase agent guidance & workflows
│       └── supabase-postgres-best-practices/ # Postgres optimization & security best practices
├── app/                          # Next.js App Router root
│   ├── favicon.ico               # Application favicon
│   ├── globals.css               # Global CSS, Tailwind v4 theme, OKLCH tokens
│   ├── layout.tsx                # Root layout (Geist font configuration)
│   └── page.tsx                  # Home page (placeholder Next.js template)
├── components/                   # Reusable UI components
│   └── ui/
│       └── button.tsx            # Base UI-backed button component with CVA variants
├── lib/                          # Utility functions and shared helpers
│   └── utils.ts                  # Classname merging utility (`cn`)
├── public/                       # Static public assets (SVGs, logos)
├── .env                          # Environment variables (Supabase URL & public key)
├── .gitignore                    # Git ignore file
├── AGENTS.md                     # Next.js 16 version notes for agentic coding tools
├── components.json               # Shadcn UI configuration file (base-nova)
├── eslint.config.mjs             # ESLint configuration
├── next.config.ts                # Next.js configuration (Turbopack, cacheComponents, partialPrefetching)
├── package.json                  # Project manifest, scripts, and dependencies
├── skills-lock.json              # Agent skill dependency lockfile
└── tsconfig.json                 # TypeScript compiler configuration with @/* path aliases
```

---

## 4. Key Configurations & Architectural Details

### 1. `next.config.ts`
- **Partial Prefetching**: Enabled (`partialPrefetching: true`) for performance.
- **Component Caching**: Enabled (`cacheComponents: true`).
- **Turbopack CSS Loader**: Custom rules for `@tailwindcss/turbopack`.
- **Experimental Flag**: `agentFeedback: true`.

### 2. Design System (`app/globals.css` & `components.json`)
- Uses Tailwind CSS v4 `@theme inline` with semantic CSS variables mapped to OKLCH color spaces.
- Full light & dark mode support configured via `@custom-variant dark`.
- Tokens defined for background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart-1..5, and sidebar components.
- Border radiuses scale dynamically from `--radius-sm` through `--radius-4xl`.

### 3. Backend Integration (`.env`)
- Configured with Supabase instance:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Ready for creating standard `@supabase/ssr` browser and server clients in `lib/supabase/`.

### 4. Components Architecture (`components/ui/button.tsx`)
- Built using `@base-ui/react/button` as the headless foundation.
- Styled using CVA with multiple variants (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`) and sizes (`default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`).

---

## 5. Development Workflow & Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server with Turbopack |
| `npm run build` | Builds optimized production bundle |
| `npm run start` | Starts production server |
| `npm run lint` | Runs ESLint check across TypeScript and JavaScript files |

---

## 6. Recommended Next Implementation Steps

1. **Supabase Client Setup**:
   - Create `lib/supabase/client.ts` for client components (using `createBrowserClient`).
   - Create `lib/supabase/server.ts` for server components and server actions (using `createServerClient` with cookie handlers).

2. **Database & Schema Models**:
   - Create Supabase migrations or schema for food items, categories, orders, carts, and customer profiles.
   - Generate TypeScript definitions from Supabase schema.

3. **Core Application UI**:
   - Replace boilerplate `app/page.tsx` with the food delivery / restaurant catalog homepage.
   - Add navigation bar (`components/navbar.tsx`), food card component, categories filter, and cart drawer.
   - Integrate authentication forms (sign in, sign up) with `react-hook-form` + `zod`.
