-- ==============================================================================
-- Hey Garlic - Performance Optimization Indexes
-- Migration: 20261103_performance_indexes.sql
-- Features:
--   1. Composite indexes for common query patterns
--   2. Partial indexes for filtered queries
--   3. Covering indexes to avoid table lookups
--   4. Index-only scans where possible
--   5. Performance monitoring views
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RECIPES TABLE OPTIMIZATION
-- ------------------------------------------------------------------------------

-- Composite index for feed queries (published recipes by creation date)
CREATE INDEX IF NOT EXISTS idx_recipes_published_created 
ON public.recipes(is_published, created_at DESC) 
WHERE is_published = true;

-- Composite index for user's recipes (common profile page query)
CREATE INDEX IF NOT EXISTS idx_recipes_author_published_created 
ON public.recipes(author_id, is_published, created_at DESC);

-- Composite index for category browsing with sorting
CREATE INDEX IF NOT EXISTS idx_recipes_category_rating_published 
ON public.recipes(category, rating DESC, created_at DESC) 
WHERE is_published = true;

-- Composite index for popularity sorting
CREATE INDEX IF NOT EXISTS idx_recipes_popularity_published 
ON public.recipes(popularity_score DESC NULLS LAST, created_at DESC) 
WHERE is_published = true;

-- Covering index for recipe cards (avoid table lookup)
CREATE INDEX IF NOT EXISTS idx_recipes_card_data 
ON public.recipes(id, title, hero_image, cook_time, rating, reviews_count, category, author_id) 
WHERE is_published = true;

-- Index for recently updated recipes
CREATE INDEX IF NOT EXISTS idx_recipes_updated_at 
ON public.recipes(updated_at DESC);

-- Index for recipe visibility checks
CREATE INDEX IF NOT EXISTS idx_recipes_visibility_author 
ON public.recipes(visibility, author_id, is_published);

-- ------------------------------------------------------------------------------
-- 2. SAVED RECIPES OPTIMIZATION
-- ------------------------------------------------------------------------------

-- Composite index for user's saved recipes with recipe data
CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_created 
ON public.saved_recipes(user_id, created_at DESC);

-- Covering index to avoid joins
CREATE INDEX IF NOT EXISTS idx_saved_recipes_covering 
ON public.saved_recipes(user_id, recipe_id, created_at);

-- Index for recipe's save count (leaderboard queries)
CREATE INDEX IF NOT EXISTS idx_saved_recipes_recipe_count 
ON public.saved_recipes(recipe_id);

-- ------------------------------------------------------------------------------
-- 3. USER FOLLOWS OPTIMIZATION
-- ------------------------------------------------------------------------------

-- Already have basic indexes, add composite ones for common queries

-- Index for follower feed (recipes from followed users)
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_created 
ON public.user_follows(follower_id, created_at DESC);

-- Index for checking mutual follows
CREATE INDEX IF NOT EXISTS idx_user_follows_mutual 
ON public.user_follows(follower_id, following_id);

-- ------------------------------------------------------------------------------
-- 4. RECIPE VIEWS OPTIMIZATION
-- ------------------------------------------------------------------------------

-- Index for recent views (trending calculation)
CREATE INDEX IF NOT EXISTS idx_recipe_views_recipe_recent 
ON public.recipe_views(recipe_id, viewed_at DESC);

-- Index for user's view history
CREATE INDEX IF NOT EXISTS idx_recipe_views_user_recent 
ON public.recipe_views(user_id, viewed_at DESC) 
WHERE user_id IS NOT NULL;

-- Index for session-based anonymous views
CREATE INDEX IF NOT EXISTS idx_recipe_views_session 
ON public.recipe_views(session_id, viewed_at DESC) 
WHERE session_id IS NOT NULL;

-- Composite index for view analytics
CREATE INDEX IF NOT EXISTS idx_recipe_views_analytics 
ON public.recipe_views(recipe_id, viewed_at, view_duration);

-- ------------------------------------------------------------------------------
-- 5. NOTIFICATIONS OPTIMIZATION
-- ------------------------------------------------------------------------------

-- Index for user's unread notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, created_at DESC) 
WHERE is_read = false;

-- Index for all user notifications with filtering
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created 
ON public.notifications(user_id, notification_type, created_at DESC);

-- Covering index for notification list
CREATE INDEX IF NOT EXISTS idx_notifications_covering 
ON public.notifications(user_id, id, notification_type, is_read, created_at, data);

-- ------------------------------------------------------------------------------
-- 6. SEARCH OPTIMIZATION
-- ------------------------------------------------------------------------------

-- Already have GIN index on search_tokens, add supporting indexes

-- Index for search with category filter
CREATE INDEX IF NOT EXISTS idx_recipes_search_category 
ON public.recipes(category, is_published) 
WHERE is_published = true;

-- Index for search with cuisine filter (if column exists)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='recipes' AND column_name='cuisine'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_recipes_search_cuisine 
        ON public.recipes(cuisine, is_published) 
        WHERE is_published = true AND cuisine IS NOT NULL;
    END IF;
END $$;

-- Index for cook time filtering
CREATE INDEX IF NOT EXISTS idx_recipes_cook_time 
ON public.recipes(cook_time, is_published) 
WHERE is_published = true;

-- Index for rating filtering
CREATE INDEX IF NOT EXISTS idx_recipes_rating_filter 
ON public.recipes(rating DESC, is_published) 
WHERE is_published = true AND rating >= 4.0;

-- ------------------------------------------------------------------------------
-- 7. PROFILES OPTIMIZATION
-- ------------------------------------------------------------------------------

-- Index for username lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower 
ON public.profiles(LOWER(username));

-- Index for profile search
CREATE INDEX IF NOT EXISTS idx_profiles_full_name 
ON public.profiles USING gin(to_tsvector('english', COALESCE(full_name, '')));

-- Covering index for profile cards
CREATE INDEX IF NOT EXISTS idx_profiles_card_data 
ON public.profiles(id, username, full_name, avatar_url, bio);

-- ------------------------------------------------------------------------------
-- 8. REVIEWS & RATINGS OPTIMIZATION
-- ------------------------------------------------------------------------------

-- Assuming you have a reviews table
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema='public' AND table_name='reviews'
    ) THEN
        -- Index for recipe's reviews
        CREATE INDEX IF NOT EXISTS idx_reviews_recipe_created 
        ON public.reviews(recipe_id, created_at DESC);
        
        -- Index for user's reviews
        CREATE INDEX IF NOT EXISTS idx_reviews_user_created 
        ON public.reviews(user_id, created_at DESC);
        
        -- Index for rating calculations
        CREATE INDEX IF NOT EXISTS idx_reviews_recipe_rating 
        ON public.reviews(recipe_id, rating);
        
        -- Covering index for review list
        CREATE INDEX IF NOT EXISTS idx_reviews_covering 
        ON public.reviews(recipe_id, id, user_id, rating, comment, created_at);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 9. PERFORMANCE MONITORING VIEW
-- ------------------------------------------------------------------------------

-- View to monitor slow queries
CREATE OR REPLACE VIEW public.slow_queries AS
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    rows,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS cache_hit_ratio
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- Queries taking more than 100ms on average
ORDER BY mean_exec_time DESC
LIMIT 20;

COMMENT ON VIEW public.slow_queries IS 'Monitor slow queries (requires pg_stat_statements extension)';

-- ------------------------------------------------------------------------------
-- 10. INDEX USAGE STATISTICS VIEW
-- ------------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.index_usage AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC; -- Unused indexes at the top

COMMENT ON VIEW public.index_usage IS 'Monitor index usage to identify unused indexes';

-- ------------------------------------------------------------------------------
-- 11. TABLE BLOAT MONITORING VIEW
-- ------------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.table_bloat AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    n_live_tup AS live_tuples,
    n_dead_tup AS dead_tuples,
    ROUND(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_tuple_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON VIEW public.table_bloat IS 'Monitor table bloat and dead tuples';

-- ------------------------------------------------------------------------------
-- 12. CACHE HIT RATIO VIEW
-- ------------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.cache_hit_ratio AS
SELECT
    'index hit rate' AS name,
    ROUND(
        100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0),
        2
    ) AS ratio
FROM pg_statio_user_indexes
UNION ALL
SELECT
    'table hit rate' AS name,
    ROUND(
        100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0),
        2
    ) AS ratio
FROM pg_statio_user_tables;

COMMENT ON VIEW public.cache_hit_ratio IS 'Monitor PostgreSQL buffer cache effectiveness (should be >99%)';

-- ------------------------------------------------------------------------------
-- 13. QUERY PERFORMANCE FUNCTION
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.analyze_query_performance(
    p_query TEXT
)
RETURNS TABLE (
    plan_line TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    RETURN QUERY EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ' || p_query;
END;
$$;

COMMENT ON FUNCTION public.analyze_query_performance IS 'Analyze query execution plan with timing';

-- Example usage:
-- SELECT * FROM public.analyze_query_performance('SELECT * FROM recipes WHERE is_published = true LIMIT 10');

-- ------------------------------------------------------------------------------
-- 14. VACUUM ANALYZE RECOMMENDATION
-- ------------------------------------------------------------------------------

-- Function to identify tables that need VACUUM ANALYZE
CREATE OR REPLACE FUNCTION public.tables_needing_vacuum()
RETURNS TABLE (
    schemaname TEXT,
    tablename TEXT,
    n_dead_tup BIGINT,
    dead_tuple_percent NUMERIC,
    last_vacuum TIMESTAMPTZ,
    last_autovacuum TIMESTAMPTZ,
    recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pstat.schemaname::TEXT,
        pstat.tablename::TEXT,
        pstat.n_dead_tup,
        ROUND(100.0 * pstat.n_dead_tup / NULLIF(pstat.n_live_tup + pstat.n_dead_tup, 0), 2) AS dead_tuple_percent,
        pstat.last_vacuum,
        pstat.last_autovacuum,
        CASE
            WHEN ROUND(100.0 * pstat.n_dead_tup / NULLIF(pstat.n_live_tup + pstat.n_dead_tup, 0), 2) > 20
            THEN 'VACUUM ANALYZE URGENTLY'
            WHEN ROUND(100.0 * pstat.n_dead_tup / NULLIF(pstat.n_live_tup + pstat.n_dead_tup, 0), 2) > 10
            THEN 'VACUUM ANALYZE RECOMMENDED'
            ELSE 'OK'
        END AS recommendation
    FROM pg_stat_user_tables pstat
    WHERE pstat.schemaname = 'public'
    ORDER BY dead_tuple_percent DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.tables_needing_vacuum IS 'Identify tables that need VACUUM ANALYZE';

-- ------------------------------------------------------------------------------
-- 15. GRANT PERMISSIONS FOR MONITORING VIEWS
-- ------------------------------------------------------------------------------

-- Note: These views are for admin use only
-- GRANT SELECT ON public.slow_queries TO authenticated;
-- GRANT SELECT ON public.index_usage TO authenticated;
-- GRANT SELECT ON public.table_bloat TO authenticated;
-- GRANT SELECT ON public.cache_hit_ratio TO authenticated;

-- ------------------------------------------------------------------------------
-- 16. ANALYZE ALL TABLES
-- ------------------------------------------------------------------------------

-- Update statistics for query planner
ANALYZE public.recipes;
ANALYZE public.profiles;
ANALYZE public.saved_recipes;
ANALYZE public.user_follows;
ANALYZE public.recipe_views;
ANALYZE public.notifications;
ANALYZE public.search_suggestions;
ANALYZE public.search_history;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================

-- To verify indexes were created:
-- SELECT schemaname, tablename, indexname FROM pg_indexes 
-- WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- To check index sizes:
-- SELECT tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid))
-- FROM pg_stat_user_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY pg_relation_size(indexrelid) DESC;
