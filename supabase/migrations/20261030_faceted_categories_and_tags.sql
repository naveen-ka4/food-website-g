-- ==============================================================================
-- Hey Garlic - Dynamic Faceted Categories, Groups, and Community Tags Schema
-- Migration: 20261030_faceted_categories_and_tags.sql
-- Features:
--   1. categories table (with group_type, is_featured, sort_order, metadata)
--   2. tags table (for user-generated hashtags and community trends)
--   3. recipe_categories junction table (Many-to-Many faceted categorization)
--   4. recipe_tags junction table (Many-to-Many custom hashtags)
--   5. Partial & B-Tree indexes adhering to Supabase Postgres best practices
--   6. Full Row Level Security (RLS) policies with cached auth.uid()
--   7. Complete Initial Seed Data (24 Featured categories + Cuisines + Dietary)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    image TEXT NOT NULL,
    icon TEXT,
    group_type TEXT NOT NULL DEFAULT 'dish_type', -- 'meal_type', 'dish_type', 'cuisine', 'dietary', 'cooking_method'
    description TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false, -- True for the 24 on the Home page
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Comments for database schema docs
COMMENT ON TABLE public.categories IS 'Master catalog of recipe categories across all taxonomy dimensions';
COMMENT ON COLUMN public.categories.group_type IS 'Taxonomy dimension: meal_type, dish_type, cuisine, dietary, cooking_method';
COMMENT ON COLUMN public.categories.is_featured IS 'Whether to feature this category on the Home page grid (top 24)';

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_group_type ON public.categories(group_type);
-- Partial index for lightning-fast Home page query (fetches only featured categories)
CREATE INDEX IF NOT EXISTS idx_categories_featured_sort ON public.categories(sort_order ASC) WHERE is_featured = true;

-- ------------------------------------------------------------------------------
-- 2. TAGS TABLE (Community Hashtags)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    usage_count INTEGER NOT NULL DEFAULT 1,
    is_promoted BOOLEAN NOT NULL DEFAULT false, -- Can be promoted to official category by admin
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.tags IS 'User-generated tags and hashtags for recipes with trending metrics';

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON public.tags(usage_count DESC);

-- Ensure recipes table has cuisine and tags columns for high-performance direct querying
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='recipes' AND column_name='cuisine') THEN
        ALTER TABLE public.recipes ADD COLUMN cuisine TEXT;
        CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON public.recipes(cuisine);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='recipes' AND column_name='tags') THEN
        ALTER TABLE public.recipes ADD COLUMN tags TEXT[] DEFAULT '{}';
        CREATE INDEX IF NOT EXISTS idx_recipes_tags ON public.recipes USING GIN(tags);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. JUNCTION TABLE: RECIPE_CATEGORIES (Many-to-Many)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recipe_categories (
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (recipe_id, category_id)
);

-- Foreign key lookup indexes
CREATE INDEX IF NOT EXISTS idx_recipe_categories_recipe_id ON public.recipe_categories(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_categories_category_id ON public.recipe_categories(category_id);

-- ------------------------------------------------------------------------------
-- 4. JUNCTION TABLE: RECIPE_TAGS (Many-to-Many)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recipe_tags (
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (recipe_id, tag_id)
);

-- Foreign key lookup indexes
CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON public.recipe_tags(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id ON public.recipe_tags(tag_id);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;

-- Categories: Public read, Admin write (or authenticated view)
CREATE POLICY "Categories are viewable by everyone"
ON public.categories FOR SELECT
USING (true);

-- Tags: Public read, authenticated users can create tags
CREATE POLICY "Tags are viewable by everyone"
ON public.tags FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create tags"
ON public.tags FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND is_promoted = false
    AND length(trim(name)) > 0
    AND length(trim(slug)) > 0
);

-- Recipe Categories: Public read
CREATE POLICY "Recipe categories are viewable by everyone"
ON public.recipe_categories FOR SELECT
USING (true);

-- Recipe Categories: Users can manage categories for their own recipes
CREATE POLICY "Users can manage categories for their own recipes"
ON public.recipe_categories FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_categories.recipe_id
        AND r.user_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_categories.recipe_id
        AND r.user_id = (SELECT auth.uid())
    )
);

-- Recipe Tags: Public read
CREATE POLICY "Recipe tags are viewable by everyone"
ON public.recipe_tags FOR SELECT
USING (true);

-- Recipe Tags: Users can manage tags for their own recipes
CREATE POLICY "Users can manage tags for their own recipes"
ON public.recipe_tags FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_tags.recipe_id
        AND r.user_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_tags.recipe_id
        AND r.user_id = (SELECT auth.uid())
    )
);

-- ------------------------------------------------------------------------------
-- 6. SEED DATA: THE 24 FEATURED HOME CATEGORIES
-- ------------------------------------------------------------------------------
INSERT INTO public.categories (name, slug, image, group_type, is_featured, sort_order)
VALUES
    -- Featured 24 (Displayed on Home Grid)
    ('Curries', 'curries', '/category/curries.webp', 'dish_type', true, 1),
    ('Pasta & Noodles', 'pasta-noodles', '/category/pasta-noodles.webp', 'dish_type', true, 2),
    ('Rice Dishes', 'rice-dishes', '/category/rice-dishes.webp', 'dish_type', true, 3),
    ('Breakfast', 'breakfast', '/category/breakfast.webp', 'meal_type', true, 4),
    ('Lunch', 'lunch', '/category/lunch.webp', 'meal_type', true, 5),
    ('Dinner', 'dinner', '/category/dinner.webp', 'meal_type', true, 6),
    ('Dessert', 'dessert', '/category/dessert.webp', 'meal_type', true, 7),
    ('Snack', 'snack', '/category/snack.webp', 'meal_type', true, 8),
    ('Drink', 'drink', '/category/drink.webp', 'meal_type', true, 9),
    ('Baking', 'baking', '/category/baking.webp', 'cooking_method', true, 10),
    ('Seafood', 'seafood', '/category/seafood.webp', 'dish_type', true, 11),
    ('Soups & Stews', 'soups-stews', '/category/soups-stews.webp', 'dish_type', true, 12),
    ('Fresh Salads', 'fresh-salads', '/category/fresh-salads.webp', 'dish_type', true, 13),
    ('Vegetarian', 'vegetarian', '/category/vegetarian.webp', 'dietary', true, 14),
    ('Sauces & Dips', 'sauces-dips', '/category/sauces-dips.webp', 'cooking_method', true, 15),
    ('Grill & BBQ', 'grill-bbq', '/category/grill-bbq.webp', 'cooking_method', true, 16),
    ('Burgers & Sandwiches', 'burgers-sandwiches', '/category/burgers-sandwiches.webp', 'dish_type', true, 17),
    ('Pizza', 'pizza', '/category/pizza.webp', 'dish_type', true, 18),
    ('Street Food', 'street-food', '/category/street-food.webp', 'dish_type', true, 19),
    ('Smoothies & Shakes', 'smoothies-shakes', '/category/smoothies-shakes.webp', 'meal_type', true, 20),
    ('Ice Cream & Frozen', 'ice-cream-frozen', '/category/ice-cream-frozen.webp', 'meal_type', true, 21),
    ('Egg Dishes', 'egg-dishes', '/category/egg-dishes.webp', 'dish_type', true, 22),
    ('Appetizers', 'appetizers', '/category/appetizers.webp', 'meal_type', true, 23),
    ('Healthy Bowls', 'healthy-bowls', '/category/healthy-bowls.webp', 'dietary', true, 24),

    -- Additional Cuisines (Available in Search Filters & Create Recipe)
    ('Sri Lankan', 'sri-lankan', '/category/curries.webp', 'cuisine', false, 100),
    ('Italian', 'italian', '/category/pasta-noodles.webp', 'cuisine', false, 101),
    ('Asian', 'asian', '/category/rice-dishes.webp', 'cuisine', false, 102),
    ('Indian', 'indian', '/category/curries.webp', 'cuisine', false, 103),
    ('Mexican', 'mexican', '/category/street-food.webp', 'cuisine', false, 104),
    ('American', 'american', '/category/burgers-sandwiches.webp', 'cuisine', false, 105),
    ('Japanese', 'japanese', '/category/rice-dishes.webp', 'cuisine', false, 106),
    ('Thai', 'thai', '/category/rice-dishes.webp', 'cuisine', false, 107),
    ('Mediterranean', 'mediterranean', '/category/fresh-salads.webp', 'cuisine', false, 108),

    -- Additional Dietary Options
    ('Vegan', 'vegan', '/category/fresh-salads.webp', 'dietary', false, 200),
    ('Gluten-Free', 'gluten-free', '/category/healthy-bowls.webp', 'dietary', false, 201),
    ('Keto', 'keto', '/category/grill-bbq.webp', 'dietary', false, 202),
    ('Halal', 'halal', '/category/curries.webp', 'dietary', false, 203),

    -- Additional Cooking Methods / Prep
    ('Quick & Easy', 'quick-easy', '/category/breakfast.webp', 'cooking_method', false, 300),
    ('Air Fryer', 'air-fryer', '/category/grill-bbq.webp', 'cooking_method', false, 301),
    ('Meal Prep', 'meal-prep', '/category/healthy-bowls.webp', 'cooking_method', false, 302),
    ('Slow Cooker', 'slow-cooker', '/category/soups-stews.webp', 'cooking_method', false, 303)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    image = EXCLUDED.image,
    group_type = EXCLUDED.group_type,
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 7. INITIAL POPULAR COMMUNITY TAGS SEED
-- ------------------------------------------------------------------------------
INSERT INTO public.tags (name, slug, usage_count)
VALUES
    ('Spicy', 'spicy', 15),
    ('Comfort Food', 'comfort-food', 24),
    ('Budget Friendly', 'budget-friendly', 18),
    ('One Pot', 'one-pot', 32),
    ('High Protein', 'high-protein', 29),
    ('Kids Friendly', 'kids-friendly', 12),
    ('Weeknight Dinner', 'weeknight-dinner', 40)
ON CONFLICT (slug) DO NOTHING;

