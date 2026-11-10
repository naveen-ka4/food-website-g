-- ==============================================================================
-- Hey Garlic - Enhanced Search & Discovery System
-- Migration: 20261103_enhanced_search_discovery.sql
-- Features:
--   1. Enhanced full-text search with ranking and highlighting
--   2. Search suggestions and autocomplete
--   3. Saved search filters for users
--   4. Search analytics and trending queries
--   5. Advanced faceted search helpers
--   6. Search history tracking
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENHANCE EXISTING SEARCH_TOKENS WITH BETTER WEIGHTING
-- ------------------------------------------------------------------------------
-- Drop existing search_tokens column if it exists and recreate with better weights
-- This improves search relevance by weighting title > category > tags > description

DO $$ 
DECLARE
    has_cuisine BOOLEAN;
    has_tags BOOLEAN;
BEGIN
    -- Check if cuisine column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='recipes' AND column_name='cuisine'
    ) INTO has_cuisine;
    
    -- Check if tags column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='recipes' AND column_name='tags'
    ) INTO has_tags;
    
    -- Drop existing search_tokens column
    ALTER TABLE public.recipes DROP COLUMN IF EXISTS search_tokens CASCADE;
    
    -- Recreate with available columns
    IF has_cuisine AND has_tags THEN
        -- All columns available
        ALTER TABLE public.recipes ADD COLUMN search_tokens TSVECTOR 
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(tag, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(cuisine, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
            setweight(to_tsvector('english', coalesce(dietary_tag, '')), 'C')
        ) STORED;
    ELSIF has_cuisine THEN
        -- Has cuisine but not tags
        ALTER TABLE public.recipes ADD COLUMN search_tokens TSVECTOR 
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(tag, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(cuisine, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
            setweight(to_tsvector('english', coalesce(dietary_tag, '')), 'C')
        ) STORED;
    ELSE
        -- Base columns only (backwards compatible with initial schema)
        ALTER TABLE public.recipes ADD COLUMN search_tokens TSVECTOR 
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(tag, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
            setweight(to_tsvector('english', coalesce(dietary_tag, '')), 'C')
        ) STORED;
    END IF;
    
    -- Recreate the GIN index
    CREATE INDEX IF NOT EXISTS idx_recipes_search_tokens 
    ON public.recipes USING GIN(search_tokens);
END $$;

COMMENT ON COLUMN public.recipes.search_tokens IS 'Full-text search tokens with weighted relevance (A=title, B=category/tag/cuisine, C=description/dietary)';

-- ------------------------------------------------------------------------------
-- 2. SEARCH SUGGESTIONS TABLE (Autocomplete)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    suggestion_type TEXT NOT NULL, -- 'recipe', 'category', 'cuisine', 'ingredient', 'tag'
    recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
    category_slug TEXT,
    popularity_score INTEGER NOT NULL DEFAULT 0, -- Based on click-through rate
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT valid_suggestion_type CHECK (suggestion_type IN ('recipe', 'category', 'cuisine', 'ingredient', 'tag'))
);

COMMENT ON TABLE public.search_suggestions IS 'Autocomplete suggestions for search with popularity tracking';

-- Indexes for fast autocomplete queries
CREATE INDEX IF NOT EXISTS idx_search_suggestions_query 
ON public.search_suggestions(query_text text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_type_popularity 
ON public.search_suggestions(suggestion_type, popularity_score DESC);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_last_used 
ON public.search_suggestions(last_used_at DESC);

-- ------------------------------------------------------------------------------
-- 3. SAVED SEARCH FILTERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    filter_name TEXT NOT NULL,
    search_query TEXT,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb, -- { categories, cuisines, mealTypes, dietary, cookingTime, difficulty, rating }
    is_notification_enabled BOOLEAN DEFAULT false, -- Notify when new recipes match this filter
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_filter_name UNIQUE (user_id, filter_name)
);

COMMENT ON TABLE public.saved_searches IS 'User-saved search filters for quick access';
COMMENT ON COLUMN public.saved_searches.filters IS 'JSONB object containing all filter criteria';
COMMENT ON COLUMN public.saved_searches.is_notification_enabled IS 'Send notifications when new recipes match this saved search';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_user 
ON public.saved_searches(user_id, last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_searches_notifications 
ON public.saved_searches(is_notification_enabled, updated_at DESC)
WHERE is_notification_enabled = true;

-- ------------------------------------------------------------------------------
-- 4. SEARCH HISTORY TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id TEXT, -- For anonymous users
    query_text TEXT NOT NULL,
    filters_applied JSONB DEFAULT '{}'::jsonb,
    results_count INTEGER NOT NULL DEFAULT 0,
    clicked_recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
    searched_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

COMMENT ON TABLE public.search_history IS 'Track search queries for analytics and personalization';

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_search_history_user 
ON public.search_history(user_id, searched_at DESC)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_search_history_query 
ON public.search_history(query_text, searched_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_history_searched_at 
ON public.search_history(searched_at DESC);

-- ------------------------------------------------------------------------------
-- 5. SEARCH ANALYTICS: TRENDING SEARCHES VIEW
-- ------------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.trending_searches AS
SELECT 
    query_text,
    COUNT(DISTINCT COALESCE(user_id::TEXT, session_id)) AS unique_searchers,
    COUNT(*) AS total_searches,
    AVG(results_count) AS avg_results,
    COUNT(clicked_recipe_id) * 1.0 / NULLIF(COUNT(*), 0) AS click_through_rate,
    MAX(searched_at) AS last_searched_at
FROM public.search_history
WHERE searched_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
  AND query_text IS NOT NULL
  AND trim(query_text) != ''
GROUP BY query_text
HAVING COUNT(*) >= 3
ORDER BY total_searches DESC, click_through_rate DESC
LIMIT 100;

COMMENT ON MATERIALIZED VIEW public.trending_searches IS 'Top 100 trending search queries in the last 7 days';

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_searches_query 
ON public.trending_searches(query_text);

-- Grant SELECT permission
GRANT SELECT ON public.trending_searches TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 6. ENHANCED SEARCH FUNCTION WITH RANKING & FACETED RESULTS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_recipes_advanced(
    p_query TEXT DEFAULT NULL,
    p_categories TEXT[] DEFAULT NULL,
    p_cuisines TEXT[] DEFAULT NULL,
    p_meal_types TEXT[] DEFAULT NULL,
    p_dietary TEXT[] DEFAULT NULL,
    p_min_rating NUMERIC DEFAULT NULL,
    p_max_cook_time INTEGER DEFAULT NULL,
    p_difficulty TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    slug TEXT,
    title TEXT,
    hero_image TEXT,
    category TEXT,
    cuisine TEXT,
    cook_time INTEGER,
    rating NUMERIC,
    reviews_count INTEGER,
    view_count INTEGER,
    author_id UUID,
    author_name TEXT,
    author_username TEXT,
    author_avatar TEXT,
    search_rank REAL,
    is_saved BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.slug,
        r.title,
        r.hero_image,
        r.category,
        r.cuisine,
        r.cook_time,
        r.rating,
        r.reviews_count,
        COALESCE(r.view_count, 0) AS view_count,
        p.id AS author_id,
        p.full_name AS author_name,
        p.username AS author_username,
        p.avatar_url AS author_avatar,
        -- Full-text search ranking (higher = more relevant)
        CASE 
            WHEN p_query IS NOT NULL AND trim(p_query) != '' 
            THEN ts_rank(r.search_tokens, plainto_tsquery('english', p_query))
            ELSE 0
        END AS search_rank,
        -- Check if user has saved this recipe
        EXISTS(
            SELECT 1 FROM public.saved_recipes sr 
            WHERE sr.recipe_id = r.id AND sr.user_id = p_user_id
        ) AS is_saved
    FROM public.recipes r
    LEFT JOIN public.profiles p ON r.author_id = p.id
    WHERE 
        -- Only visible recipes (respect RLS via helper)
        public.can_view_recipe(r.id, p_user_id)
        
        -- Full-text search filter
        AND (
            p_query IS NULL 
            OR trim(p_query) = '' 
            OR r.search_tokens @@ plainto_tsquery('english', p_query)
        )
        
        -- Category filter
        AND (
            p_categories IS NULL 
            OR r.category = ANY(p_categories)
        )
        
        -- Cuisine filter
        AND (
            p_cuisines IS NULL 
            OR r.cuisine = ANY(p_cuisines)
        )
        
        -- Meal type filter
        AND (
            p_meal_types IS NULL 
            OR r.meal_type = ANY(p_meal_types)
        )
        
        -- Dietary filter
        AND (
            p_dietary IS NULL 
            OR r.dietary_tag = ANY(p_dietary)
        )
        
        -- Minimum rating filter
        AND (
            p_min_rating IS NULL 
            OR r.rating >= p_min_rating
        )
        
        -- Maximum cooking time filter
        AND (
            p_max_cook_time IS NULL 
            OR r.cook_time <= p_max_cook_time
        )
        
        -- Difficulty filter
        AND (
            p_difficulty IS NULL 
            OR r.difficulty = p_difficulty
        )
        
    ORDER BY 
        -- Sort by search relevance if query provided, otherwise by popularity
        CASE 
            WHEN p_query IS NOT NULL AND trim(p_query) != '' 
            THEN ts_rank(r.search_tokens, plainto_tsquery('english', p_query))
            ELSE 0
        END DESC,
        r.popularity_score DESC NULLS LAST,
        r.rating DESC,
        r.created_at DESC
        
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.search_recipes_advanced IS 'Advanced recipe search with full-text ranking and faceted filters';

GRANT EXECUTE ON FUNCTION public.search_recipes_advanced TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 7. AUTOCOMPLETE FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_search_autocomplete(
    p_query TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    suggestion TEXT,
    suggestion_type TEXT,
    recipe_id UUID,
    popularity_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    -- Return suggestions matching the query prefix
    RETURN QUERY
    SELECT 
        ss.query_text AS suggestion,
        ss.suggestion_type,
        ss.recipe_id,
        ss.popularity_score
    FROM public.search_suggestions ss
    WHERE ss.query_text ILIKE (p_query || '%')
    ORDER BY ss.popularity_score DESC, ss.last_used_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_search_autocomplete IS 'Get autocomplete suggestions for search queries';

GRANT EXECUTE ON FUNCTION public.get_search_autocomplete TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 8. FUNCTION TO POPULATE SEARCH SUGGESTIONS (Run once after migration)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.populate_search_suggestions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    has_cuisine BOOLEAN;
BEGIN
    -- Check if cuisine column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='recipes' AND column_name='cuisine'
    ) INTO has_cuisine;
    
    -- Clear existing suggestions
    TRUNCATE public.search_suggestions;
    
    -- Insert recipe titles as suggestions
    INSERT INTO public.search_suggestions (query_text, suggestion_type, recipe_id, popularity_score)
    SELECT 
        title,
        'recipe',
        id,
        COALESCE(view_count, 0) + (COALESCE(save_count, 0) * 3)
    FROM public.recipes
    WHERE is_published = true
      AND title IS NOT NULL
      AND trim(title) != '';
    
    -- Insert categories as suggestions
    INSERT INTO public.search_suggestions (query_text, suggestion_type, category_slug, popularity_score)
    SELECT DISTINCT
        r.category,
        'category',
        c.slug,
        COUNT(*) * 10
    FROM public.recipes r
    LEFT JOIN public.categories c ON r.category = c.name
    WHERE r.is_published = true
      AND r.category IS NOT NULL
    GROUP BY r.category, c.slug;
    
    -- Insert cuisines as suggestions (only if column exists)
    IF has_cuisine THEN
        INSERT INTO public.search_suggestions (query_text, suggestion_type, popularity_score)
        SELECT DISTINCT
            cuisine,
            'cuisine',
            COUNT(*) * 10
        FROM public.recipes
        WHERE is_published = true
          AND cuisine IS NOT NULL
        GROUP BY cuisine;
    END IF;
    
    -- Insert popular tags as suggestions
    INSERT INTO public.search_suggestions (query_text, suggestion_type, popularity_score)
    SELECT DISTINCT
        tag,
        'tag',
        COUNT(*) * 5
    FROM public.recipes
    WHERE is_published = true
      AND tag IS NOT NULL
    GROUP BY tag;
    
END;
$$;

COMMENT ON FUNCTION public.populate_search_suggestions IS 'Populate search suggestions from existing recipes (run once after migration)';

-- ------------------------------------------------------------------------------
-- 9. FUNCTION TO RECORD SEARCH QUERY
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_search(
    p_user_id UUID DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_query TEXT DEFAULT NULL,
    p_filters JSONB DEFAULT '{}'::jsonb,
    p_results_count INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_search_id UUID;
BEGIN
    INSERT INTO public.search_history (
        user_id,
        session_id,
        query_text,
        filters_applied,
        results_count
    )
    VALUES (
        p_user_id,
        p_session_id,
        p_query,
        p_filters,
        p_results_count
    )
    RETURNING id INTO v_search_id;
    
    -- Update search suggestions popularity if query exists
    IF p_query IS NOT NULL AND trim(p_query) != '' THEN
        UPDATE public.search_suggestions
        SET 
            popularity_score = popularity_score + 1,
            last_used_at = CURRENT_TIMESTAMP
        WHERE query_text ILIKE p_query;
    END IF;
    
    RETURN v_search_id;
END;
$$;

COMMENT ON FUNCTION public.record_search IS 'Record a search query for analytics and personalization';

GRANT EXECUTE ON FUNCTION public.record_search TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 10. FUNCTION TO GET FACET COUNTS
-- ------------------------------------------------------------------------------
-- Returns counts for each filter option to show in UI
CREATE OR REPLACE FUNCTION public.get_search_facets(
    p_query TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    facet_type TEXT,
    facet_value TEXT,
    recipe_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    has_cuisine BOOLEAN;
BEGIN
    -- Check if cuisine column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='recipes' AND column_name='cuisine'
    ) INTO has_cuisine;
    
    -- Category facets
    RETURN QUERY
    SELECT 
        'category'::TEXT AS facet_type,
        r.category AS facet_value,
        COUNT(*) AS recipe_count
    FROM public.recipes r
    WHERE 
        public.can_view_recipe(r.id, p_user_id)
        AND (
            p_query IS NULL 
            OR trim(p_query) = '' 
            OR r.search_tokens @@ plainto_tsquery('english', p_query)
        )
    GROUP BY r.category;
    
    -- Cuisine facets (only if column exists)
    IF has_cuisine THEN
        RETURN QUERY
        SELECT 
            'cuisine'::TEXT,
            r.cuisine AS facet_value,
            COUNT(*) AS recipe_count
        FROM public.recipes r
        WHERE 
            public.can_view_recipe(r.id, p_user_id)
            AND r.cuisine IS NOT NULL
            AND (
                p_query IS NULL 
                OR trim(p_query) = '' 
                OR r.search_tokens @@ plainto_tsquery('english', p_query)
            )
        GROUP BY r.cuisine;
    END IF;
    
    -- Meal type facets
    RETURN QUERY
    SELECT 
        'meal_type'::TEXT,
        r.meal_type::TEXT AS facet_value,
        COUNT(*) AS recipe_count
    FROM public.recipes r
    WHERE 
        public.can_view_recipe(r.id, p_user_id)
        AND (
            p_query IS NULL 
            OR trim(p_query) = '' 
            OR r.search_tokens @@ plainto_tsquery('english', p_query)
        )
    GROUP BY r.meal_type;
    
    -- Dietary facets
    RETURN QUERY
    SELECT 
        'dietary'::TEXT,
        r.dietary_tag AS facet_value,
        COUNT(*) AS recipe_count
    FROM public.recipes r
    WHERE 
        public.can_view_recipe(r.id, p_user_id)
        AND r.dietary_tag IS NOT NULL
        AND (
            p_query IS NULL 
            OR trim(p_query) = '' 
            OR r.search_tokens @@ plainto_tsquery('english', p_query)
        )
    GROUP BY r.dietary_tag;
    
    RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_search_facets IS 'Get facet counts for search filters UI';

GRANT EXECUTE ON FUNCTION public.get_search_facets TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.search_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Search suggestions: Public read access
DROP POLICY IF EXISTS "Search suggestions are publicly readable" ON public.search_suggestions;
CREATE POLICY "Search suggestions are publicly readable"
ON public.search_suggestions FOR SELECT
USING (true);

-- Saved searches: Users can manage their own
DROP POLICY IF EXISTS "Users can view their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can view their own saved searches"
ON public.saved_searches FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can create their own saved searches"
ON public.saved_searches FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can update their own saved searches"
ON public.saved_searches FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can delete their own saved searches"
ON public.saved_searches FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Search history: Users can view their own
DROP POLICY IF EXISTS "Users can view their own search history" ON public.search_history;
CREATE POLICY "Users can view their own search history"
ON public.search_history FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Anyone can insert search history (for analytics)
DROP POLICY IF EXISTS "Anyone can record search history" ON public.search_history;
CREATE POLICY "Anyone can record search history"
ON public.search_history FOR INSERT
WITH CHECK (true);

-- Explicit grants
GRANT SELECT ON public.search_suggestions TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT SELECT, INSERT ON public.search_history TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 12. FUNCTION TO REFRESH TRENDING SEARCHES VIEW
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_trending_searches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.trending_searches;
END;
$$;

COMMENT ON FUNCTION public.refresh_trending_searches IS 'Refresh trending searches materialized view (call hourly)';

-- This should be called via pg_cron or external scheduler
-- Example: SELECT cron.schedule('refresh-trending', '0 * * * *', 'SELECT public.refresh_trending_searches()');

-- ------------------------------------------------------------------------------
-- 13. INITIAL DATA POPULATION
-- ------------------------------------------------------------------------------
-- Populate search suggestions from existing recipes
SELECT public.populate_search_suggestions();
