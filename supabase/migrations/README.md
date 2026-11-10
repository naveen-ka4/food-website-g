# Hey Garlic Database Migrations

## Migration Order

These migrations should be applied in chronological order (by filename timestamp):

1. `20261026_initial_dynamic_schema.sql` - **REQUIRED FIRST**
   - Base schema: profiles, recipes, saved_recipes, reviews
   - Full-text search foundation

2. `20261026_fix_security_advisors.sql`
   - Security policy fixes

3. `20261030_faceted_categories_and_tags.sql` - **RECOMMENDED**
   - Adds `cuisine` and `tags` columns to recipes
   - Categories and tags infrastructure
   - Enhances search capabilities

4. `20261031_fix_tags_rls_policy.sql`
   - RLS policy fixes for tags

5. `20261031_recipe_boards_and_author_sync.sql`
   - Recipe boards (collections) feature
   - Author sync improvements

6. `20261031_social_notifications_and_replies.sql`
   - Notifications system
   - Review replies

7. `20261103_engagement_tracking.sql`
   - View tracking and analytics
   - User interactions for recommendations
   - Popularity scoring

8. `20261103_rate_limiting_infrastructure.sql`
   - Database-backed rate limiting
   - Sliding window implementation

9. `20261103_recipe_visibility_privacy.sql`
   - Recipe visibility controls (public/private/unlisted)
   - Enhanced RLS policies

10. `20261103_user_following_system.sql`
    - User follows/followers
    - Social graph

11. `20261103_enhanced_search_discovery.sql`
    - Enhanced full-text search with ranking
    - Search autocomplete
    - Saved search filters
    - Search analytics
    - **Note**: Backwards compatible - works with or without `cuisine` column

## Applying Migrations

### Via Supabase Dashboard
1. Go to SQL Editor
2. Copy the migration file contents
3. Run the SQL
4. Verify no errors

### Via Supabase CLI
```bash
# Link to your project
supabase link --project-ref your-project-ref

# Apply all pending migrations
supabase db push

# Or apply a specific migration
supabase db execute --file supabase/migrations/FILENAME.sql
```

## Backwards Compatibility

Most migrations are designed to be **additive** and won't break existing functionality:

- ✅ New columns have defaults
- ✅ New tables are independent
- ✅ Existing queries continue to work
- ✅ RLS policies are non-breaking

### Special Notes

**Enhanced Search Migration** (`20261103_enhanced_search_discovery.sql`):
- Checks for `cuisine` column existence before using it
- Works with minimal schema (just initial migration)
- Enhanced features available when optional migrations applied

## Rollback Strategy

Each migration can be rolled back by:
1. Dropping the tables it created
2. Removing the functions it added
3. Restoring the previous schema state

**Example rollback for enhanced search:**
```sql
-- Drop new tables
DROP TABLE IF EXISTS public.search_suggestions CASCADE;
DROP TABLE IF EXISTS public.saved_searches CASCADE;
DROP TABLE IF EXISTS public.search_history CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.trending_searches CASCADE;

-- Drop new functions
DROP FUNCTION IF EXISTS public.search_recipes_advanced CASCADE;
DROP FUNCTION IF EXISTS public.get_search_autocomplete CASCADE;
DROP FUNCTION IF EXISTS public.get_search_facets CASCADE;
DROP FUNCTION IF EXISTS public.record_search CASCADE;
DROP FUNCTION IF EXISTS public.populate_search_suggestions CASCADE;
DROP FUNCTION IF EXISTS public.refresh_trending_searches CASCADE;

-- Restore original search_tokens (if needed)
ALTER TABLE public.recipes DROP COLUMN IF EXISTS search_tokens CASCADE;
ALTER TABLE public.recipes ADD COLUMN search_tokens TSVECTOR 
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
) STORED;
CREATE INDEX IF NOT EXISTS idx_recipes_search_tokens 
ON public.recipes USING GIN(search_tokens);
```

## Testing Migrations

After applying a migration, test:

1. **Schema exists:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

2. **Functions work:**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public';
   ```

3. **RLS policies applied:**
   ```sql
   SELECT tablename, policyname FROM pg_policies 
   WHERE schemaname = 'public';
   ```

4. **Sample queries:**
   ```sql
   -- Test search
   SELECT * FROM search_recipes_advanced(p_query := 'pasta', p_limit := 5);
   
   -- Test autocomplete
   SELECT * FROM get_search_autocomplete('chick', 10);
   ```

## Support

For issues with migrations:
1. Check PostgreSQL error logs in Supabase Dashboard
2. Verify migration order
3. Check for missing dependencies
4. Review RLS policies if access denied
