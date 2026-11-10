# Hey Garlic Design System (v1.0)

A warm, organic, editorial design system implemented for Next.js 16, React 19, Tailwind CSS v4 (`@theme inline` with OKLCH), and Base UI (`base-nova` preset).

Derived directly from the **Hey Garlic Design System & Component Library (v1.0)** specifications.

---

## 1. Color Token Reference

All colors are defined mathematically in the **OKLCH** color space to ensure perceptual uniformity, consistent contrast ratios, and rich saturation across both light and dark modes.

| Token | Light value | Dark value | Used for |
| :--- | :--- | :--- | :--- |
| `--background` | `oklch(0.970 0.007 97.4)` (`#f6f5f0`) | `oklch(0.185 0.006 85.0)` | Application page background canvas (warm oatmeal/linen) |
| `--foreground` | `oklch(0.218 0.000 89.9)` (`#1a1a1a`) | `oklch(0.970 0.007 97.4)` | Primary typography, high-contrast borders |
| `--card` | `oklch(0.993 0.004 106.5)` (`#fdfdfa`) | `oklch(0.225 0.007 85.0)` | Elevated surfaces, recipe cards, inputs, popovers |
| `--card-foreground` | `oklch(0.218 0.000 89.9)` (`#1a1a1a`) | `oklch(0.970 0.007 97.4)` | Typography and icons rendered within card containers |
| `--popover` | `oklch(0.993 0.004 106.5)` (`#fdfdfa`) | `oklch(0.225 0.007 85.0)` | Dropdown menus, tooltips, dialogs |
| `--popover-foreground` | `oklch(0.218 0.000 89.9)` (`#1a1a1a`) | `oklch(0.970 0.007 97.4)` | Text within dropdowns and popover panels |
| `--primary` | `oklch(0.218 0.000 89.9)` (`#1a1a1a`) | `oklch(0.970 0.007 97.4)` | Primary dark buttons (`Save Recipe`, `Create Account`), high-contrast CTAs |
| `--primary-foreground` | `oklch(0.993 0.004 106.5)` (`#fdfdfa`) | `oklch(0.185 0.006 85.0)` | Text and icons on primary dark buttons |
| `--secondary` | `oklch(0.912 0.081 92.1)` (`#f5e1a4`) | `oklch(0.300 0.020 92.0)` | Warm butter highlights, secondary badges, warm chips |
| `--secondary-foreground` | `oklch(0.218 0.000 89.9)` (`#1a1a1a`) | `oklch(0.970 0.007 97.4)` | Text on warm butter buttons and secondary elements |
| `--muted` | `oklch(0.945 0.008 97.0)` (`#f0eee6`) | `oklch(0.260 0.006 85.0)` | Muted background fills, hover backgrounds, subtle chips |
| `--muted-foreground` | `oklch(0.552 0.014 285.9)` (`#71717a`) | `oklch(0.680 0.012 85.0)` | Secondary metadata (cook time, star ratings, review counts, hints) |
| `--accent` | `oklch(0.701 0.056 142.5)` (`#8ba888`) | `oklch(0.701 0.056 142.5)` | Organic Sage herbal accent, vegetarian badges, botanical icons |
| `--accent-foreground` | `oklch(1.000 0.000 0.0)` | `oklch(0.185 0.006 85.0)` | Text/icons on solid sage accents |
| `--destructive` | `oklch(0.642 0.170 27.5)` (`#e15b50`) | `oklch(0.642 0.170 27.5)` | Spicy chili red, error validations, delete actions |
| `--destructive-foreground` | `oklch(1.000 0.000 0.0)` | `oklch(1.000 0.000 0.0)` | Text on destructive buttons and banners |
| `--border` | `oklch(0.901 0.014 88.7)` (`#e2ded4`) | `oklch(0.320 0.006 85.0)` | Subtle borders on cards, table dividers, input boundaries |
| `--input` | `oklch(0.901 0.014 88.7)` (`#e2ded4`) | `oklch(0.320 0.006 85.0)` | Text field and select input borders |
| `--ring` | `oklch(0.701 0.056 142.5)` (`#8ba888`) | `oklch(0.701 0.056 142.5)` | Accessibility focus ring (Organic Sage with 2px offset) |
| `--sage` | `oklch(0.701 0.056 142.5)` (`#8ba888`) | `oklch(0.701 0.056 142.5)` | Extended token: Organic Sage brand color |
| `--sage-foreground` | `oklch(1.000 0.000 0.0)` | `oklch(0.185 0.006 85.0)` | Extended token |
| `--butter` | `oklch(0.912 0.081 92.1)` (`#f5e1a4`) | `oklch(0.300 0.020 92.0)` | Extended token: Warm Butter brand color |
| `--butter-foreground` | `oklch(0.218 0.000 89.9)` (`#1a1a1a`) | `oklch(0.970 0.007 97.4)` | Extended token |
| `--sidebar` | `oklch(0.993 0.004 106.5)` | `oklch(0.225 0.007 85.0)` | Sidebar navigation panel background |
| `--sidebar-foreground` | `oklch(0.218 0.000 89.9)` | `oklch(0.970 0.007 97.4)` | Sidebar typography |
| `--sidebar-primary` | `oklch(0.218 0.000 89.9)` | `oklch(0.970 0.007 97.4)` | Active item indicator in sidebar |
| `--sidebar-accent` | `oklch(0.945 0.008 97.0)` | `oklch(0.260 0.006 85.0)` | Hover background for sidebar links |
| `--sidebar-border` | `oklch(0.901 0.014 88.7)` | `oklch(0.320 0.006 85.0)` | Sidebar divider border |
| `--chart-1` | `oklch(0.701 0.056 142.5)` | `oklch(0.701 0.056 142.5)` | Organic Sage data visualizer |
| `--chart-2` | `oklch(0.912 0.081 92.1)` | `oklch(0.912 0.081 92.1)` | Warm Butter data visualizer |
| `--chart-3` | `oklch(0.642 0.170 27.5)` | `oklch(0.642 0.170 27.5)` | Spicy Red data visualizer |
| `--chart-4` | `oklch(0.552 0.014 285.9)` | `oklch(0.680 0.012 85.0)` | Muted Zinc data visualizer |
| `--chart-5` | `oklch(0.218 0.000 89.9)` | `oklch(0.970 0.007 97.4)` | Dark Charcoal data visualizer |

---

## 2. Radii Scale

Anchored by root `--radius: 0.75rem` (12px = Medium):

| Radius Token | Computed Size | Reference Size | Design Spec Usage |
| :--- | :--- | :--- | :--- |
| `--radius-sm` | `calc(var(--radius) * 0.667)` (~8px) | `S - 8px` | Inner container content, compact badges, tooltips |
| `--radius-md` | `calc(var(--radius) * 0.833)` (~10px) | `10px` | Small action buttons, micro icon controls |
| `--radius-lg` | `var(--radius)` (12px) | `M - 12px` | Form inputs, textareas, dropdowns, cards |
| `--radius-xl` | `calc(var(--radius) * 1.333)` (16px) | `16px` | Compact cards, preview tiles |
| `--radius-2xl` | `calc(var(--radius) * 2)` (24px) | `L - 24px` | Featured recipe cards, category tiles, image frames |
| `--radius-3xl` | `calc(var(--radius) * 2.667)` (32px) | `32px` | Large container callouts, why-choose section panels |
| `--radius-4xl` | `calc(var(--radius) * 3.333)` (40px) | `40px` | Hero image organic cutouts |
| `rounded-full` | `9999px` | `Full` | Primary/Secondary buttons, category pills, chips, search bar |

---

## 3. Typography Scale & Fonts

| Role | Font Family | Variable | Loaded via | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Headline Serif** | `Playfair Display` | `--font-heading` | `next/font/google` | `h1`, `h2`, `h3`, recipe titles, editorial callouts |
| **Body & UI Sans** | `Inter` | `--font-sans` | `next/font/google` | Body text, forms, navigation, buttons, metadata |
| **Accent Script** | `Caveat` | `--font-script` | `next/font/google` | Handwritten doodle scripts (e.g., "Cook it. Share it. ♡") |
| **Monospace** | `Geist Mono` | `--font-mono` | `next/font/google` | Numerical servings, cook times, code figures |

### Typography Semantic Classes:
- `.heading-1`: `font-heading text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-foreground leading-[1.1]`
- `.heading-2`: `font-heading text-2xl sm:text-3xl lg:text-4xl font-normal tracking-tight text-foreground leading-[1.2]`
- `.heading-3`: `font-heading text-xl sm:text-2xl font-normal tracking-snug text-foreground leading-[1.25]`
- `.heading-4`: `font-heading text-lg sm:text-xl font-normal text-foreground leading-snug`
- `.prose-recipe`: Optimized reading layout for recipe steps, ingredients, and instructions.

---

## 4. UI Primitives Overview

All components are located in `components/ui/` and adhere to `base-nova` (Base UI headless primitives + `cn()` + `cva`):

### Button (`components/ui/button.tsx`)
- **Pill Shape**: `rounded-full` by default.
- **Variants**:
  - `default`: Primary Dark pill (`bg-primary text-primary-foreground hover:bg-primary/90`)
  - `outline`: Secondary pill (`border border-border bg-card text-foreground hover:bg-muted`)
  - `secondary`: Warm butter pill (`bg-secondary text-secondary-foreground hover:bg-secondary/85`)
  - `sage` / `success`: Organic sage green button (`bg-accent text-accent-foreground hover:bg-accent/90`)
  - `soft`: Warm muted tint pill (`bg-muted text-foreground hover:bg-muted/80`)
  - `ghost`: Transparent hover
  - `destructive`: Spicy chili red pill
  - `link`: Clean text link
- **Sizes**: `default` (h-10 px-5), `xs` (h-7 px-3), `sm` (h-8.5 px-4), `lg` (h-12 px-7), `icon` (size-10), `icon-xs`, `icon-sm`, `icon-lg`.

### Input & Textarea (`components/ui/input.tsx`, `components/ui/textarea.tsx`)
- Built on `@base-ui/react/input` and native textarea.
- Styled with `rounded-xl border border-input bg-card px-4 py-2.5 text-sm`.
- Focus state: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring` (Organic Sage ring).

### Label (`components/ui/label.tsx`)
- Accessible form label with `text-sm font-medium leading-none text-foreground select-none`.

### Card (`components/ui/card.tsx`)
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- Surface styling: `rounded-2xl border border-border bg-card shadow-[0_2px_10px_-2px_oklch(0.218_0_0/0.04),0_1px_3px_-1px_oklch(0.218_0_0/0.03)]`.
- Card titles utilize `font-heading text-xl font-normal`.

### Badge (`components/ui/badge.tsx`)
- `rounded-full px-3 py-0.5 text-xs font-medium`.
- Variants: `default` (charcoal), `secondary` (butter), `sage` / `vegetarian` (soft sage background + accent text), `butter`, `outline`, `destructive`, `soft`.

### Separator (`components/ui/separator.tsx`)
- Built on `@base-ui/react/separator`.
- Orientation: `horizontal` (h-px w-full) or `vertical` (h-full w-px).
- Styling: `bg-border`.

### Notification Toasts (`sonner`)
- Configured in `app/layout.tsx` with `<Toaster />`.
- Styled to match Hey Garlic's ivory card surface, organic border, and rounded-xl corners.
