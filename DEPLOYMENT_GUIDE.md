# Hey Garlic - Deployment & Testing Guide

## 🚀 Deployment Steps

### 1. Database Setup (Supabase)

#### A. Apply Migrations

Log into your Supabase Dashboard → SQL Editor and run these migrations **in order**:

```sql
-- 1. Engagement Tracking (run first)
-- Copy contents of: supabase/migrations/20261103_engagement_tracking.sql
-- Paste and execute

-- 2. Recipe Visibility & Privacy
-- Copy contents of: supabase/migrations/20261103_recipe_visibility_privacy.sql
-- Paste and execute

-- 3. Rate Limiting Infrastructure
-- Copy contents of: supabase/migrations/20261103_rate_limiting_infrastructure.sql
-- Paste and execute

-- 4. User Following System
-- Copy contents of: supabase/migrations/20261103_user_following_system.sql
-- Paste and execute
```

#### B. Verify Migrations

Run these queries to confirm everything is set up:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'recipe_views',
    'user_interactions',
    'rate_limits',
    'rate_limit_config',
    'user_follows'
  );

-- Check materialized view
SELECT * FROM trending_recipes LIMIT 5;

-- Check rate limit configs
SELECT * FROM rate_limit_config;

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('recipe_views', 'user_follows', 'rate_limits');
```

#### C. Set Up Cron Jobs (Optional but Recommended)

If you have `pg_cron` extension enabled:

```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Refresh trending recipes every hour
SELECT cron.schedule(
  'refresh-trending-recipes',
  '0 * * * *',
  'SELECT public.refresh_trending_recipes()'
);

-- Cleanup old rate limits every 15 minutes
SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/15 * * * *',
  'SELECT public.cleanup_old_rate_limits()'
);

-- View scheduled jobs
SELECT * FROM cron.job;
```

If `pg_cron` is not available, set up external cron job or scheduled function:

```bash
# Example: Using Vercel Cron Jobs
# Create API route: /api/cron/refresh-trending
# Then configure in vercel.json:

{
  "crons": [
    {
      "path": "/api/cron/refresh-trending",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/cleanup-rate-limits",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

### 2. Environment Variables

Ensure `.env` or `.env.local` has:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# Site URL (for redirects)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Optional: Sentry for error tracking
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

---

### 3. Install Dependencies

```bash
npm install

# Or if using pnpm
pnpm install

# Or yarn
yarn install
```

---

### 4. Build & Test Locally

```bash
# Development mode
npm run dev

# Production build
npm run build
npm run start
```

---

### 5. Deploy to Production

#### Option A: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### Option B: Docker

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t hey-garlic .
docker run -p 3000:3000 hey-garlic
```

---

## 🧪 Testing Guide

### Manual Testing Checklist

#### Authentication Flow ✅
- [ ] User can register with email/password
- [ ] User can register with Google OAuth
- [ ] Email verification works (if enabled)
- [ ] User can log in with correct credentials
- [ ] User cannot log in with incorrect credentials
- [ ] User can request password reset
- [ ] Password reset email is received
- [ ] User can set new password
- [ ] Session persists across page refreshes
- [ ] User can log out

#### Profile Management ✅
- [ ] User can view their own profile at `/profile`
- [ ] User can edit profile (name, bio, tagline, location)
- [ ] Avatar upload works (WebP compression)
- [ ] Profile updates persist
- [ ] Other users can view public profile at `/user/[username]`
- [ ] Stats display correctly (recipes, followers, following)

#### Recipe Visibility ✅
- [ ] User can create public recipe (visible to all)
- [ ] User can create private recipe (visible only to owner)
- [ ] User can create unlisted recipe (accessible via direct link)
- [ ] Public recipes appear in search
- [ ] Private recipes do NOT appear in search
- [ ] Unlisted recipes do NOT appear in search but are accessible via URL
- [ ] Owner can always access their own recipes

#### Social Features ✅
- [ ] User can follow another user
- [ ] Follower count increments immediately
- [ ] User can unfollow
- [ ] Follower count decrements immediately
- [ ] Mutual follow badge shows when both users follow each other
- [ ] Follower list shows correct users
- [ ] Following list shows correct users
- [ ] Follow suggestions work

#### Personalized Feed ✅
- [ ] Authenticated user sees personalized feed at `/feed`
- [ ] Feed shows recipes from followed users
- [ ] Feed shows trending recipes
- [ ] Feed shows recommendations
- [ ] Feed reason badges display correctly
- [ ] Infinite scroll loads more recipes
- [ ] Pull-to-refresh works
- [ ] Empty state shows for users with no follows

#### Rate Limiting ✅
- [ ] Making 100+ requests in 1 minute triggers rate limit
- [ ] Rate limit error shows correct retry time
- [ ] Creating 10+ recipes in 1 minute triggers rate limit
- [ ] Login attempts limited to 5 per 5 minutes
- [ ] Signup attempts limited to 3 per hour

#### Security ✅
- [ ] XSS attempts are sanitized (try `<script>alert('xss')</script>` in bio)
- [ ] SQL injection attempts fail (try `' OR '1'='1` in inputs)
- [ ] Cannot access other user's private recipes
- [ ] Cannot delete other user's recipes
- [ ] CSRF token required for mutations
- [ ] Unauthorized access redirects to login

#### Search & Discovery ✅
- [ ] Search finds relevant recipes
- [ ] Filters work correctly (category, cook time, rating)
- [ ] Trending section shows popular recipes
- [ ] Recommendations align with user preferences

---

### Automated Testing (To Be Implemented)

#### Unit Tests Structure

```typescript
// tests/actions/social.test.ts
import { describe, it, expect } from "vitest";
import { followUserAction } from "@/app/actions/social";

describe("followUserAction", () => {
  it("should follow a user successfully", async () => {
    // Test implementation
  });

  it("should prevent self-follow", async () => {
    // Test implementation
  });

  it("should prevent duplicate follows", async () => {
    // Test implementation
  });

  it("should enforce rate limits", async () => {
    // Test implementation
  });
});
```

#### Integration Tests Structure

```typescript
// tests/integration/user-journey.test.ts
import { describe, it, expect } from "vitest";

describe("User Journey: Follow and Feed", () => {
  it("should complete full journey", async () => {
    // 1. Register user
    // 2. Follow another user
    // 3. View personalized feed
    // 4. See followed user's recipes
  });
});
```

---

## 🔍 Monitoring & Debugging

### Database Monitoring

```sql
-- Check trending recipes are updating
SELECT id, title, trending_score, updated_at 
FROM trending_recipes 
ORDER BY trending_score DESC 
LIMIT 10;

-- Check rate limit activity
SELECT 
  action, 
  COUNT(*) as request_count,
  MAX(last_request_at) as last_request
FROM rate_limits
WHERE window_start > NOW() - INTERVAL '1 hour'
GROUP BY action;

-- Check follower relationships
SELECT 
  COUNT(*) as total_follows,
  COUNT(DISTINCT follower_id) as unique_followers,
  COUNT(DISTINCT following_id) as unique_followed
FROM user_follows;

-- Check engagement metrics
SELECT 
  COUNT(*) as total_views,
  COUNT(DISTINCT user_id) as unique_viewers,
  AVG(view_duration) as avg_duration
FROM recipe_views
WHERE viewed_at > NOW() - INTERVAL '24 hours';
```

### Application Monitoring

```typescript
// Add to middleware or API routes
export async function middleware(request: NextRequest) {
  const start = Date.now();
  
  const response = NextResponse.next();
  
  const duration = Date.now() - start;
  console.log({
    method: request.method,
    path: request.nextUrl.pathname,
    duration,
    status: response.status,
  });
  
  return response;
}
```

### Error Tracking with Sentry (Optional)

```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

---

## 🐛 Common Issues & Solutions

### Issue: Trending recipes not updating

**Solution**: Run materialized view refresh manually:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY trending_recipes;
```

### Issue: Rate limits not working

**Solution**: Check rate_limit_config table:
```sql
SELECT * FROM rate_limit_config;
```

If empty, run the migration again or insert manually.

### Issue: Follow count incorrect

**Solution**: Recalculate counts:
```sql
UPDATE profiles p
SET 
  following_count = (
    SELECT COUNT(*) FROM user_follows uf 
    WHERE uf.follower_id = p.id
  ),
  follower_count = (
    SELECT COUNT(*) FROM user_follows uf 
    WHERE uf.following_id = p.id
  );
```

### Issue: Feed not showing recipes

**Solution**: Check if user is following anyone:
```sql
SELECT * FROM user_follows WHERE follower_id = 'user-id';
```

If no follows, feed will show trending + recommendations only.

### Issue: Image upload failing

**Solution**: Check Supabase storage bucket permissions:
```sql
-- Ensure bucket exists and is public
SELECT * FROM storage.buckets WHERE id IN ('recipe-images', 'avatars');
```

---

## 📊 Performance Benchmarks

### Target Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Feed Generation | < 500ms | TBD |
| Recipe View | < 200ms | TBD |
| Search Query | < 300ms | TBD |
| Follow Action | < 100ms | TBD |
| Database Query | < 100ms | TBD |
| Page Load (Lighthouse) | > 85 | TBD |

### How to Measure

```bash
# Lighthouse audit
npx lighthouse https://yourdomain.com --view

# Server-side timing
console.time("feed-generation");
await generatePersonalizedFeed(userId);
console.timeEnd("feed-generation");
```

---

## 🔒 Security Checklist

Before going live:

- [ ] All environment variables are secure (not committed to git)
- [ ] Supabase RLS policies are enabled and tested
- [ ] Rate limiting is active
- [ ] CSRF protection is enabled
- [ ] Input validation is working (try injection attacks)
- [ ] Error messages don't expose sensitive data
- [ ] HTTPS is enforced in production
- [ ] Secure cookies (HttpOnly, Secure, SameSite)
- [ ] Content Security Policy headers set
- [ ] SQL injection tests pass
- [ ] XSS tests pass
- [ ] Authentication tests pass
- [ ] Authorization tests pass

---

## 📈 Post-Launch Monitoring

### Week 1 Checklist

- [ ] Monitor error rates (should be < 1%)
- [ ] Check database performance
- [ ] Review security logs
- [ ] Monitor rate limit hits
- [ ] Check trending recipes accuracy
- [ ] Review user feedback
- [ ] Monitor server costs

### Metrics to Track

1. **User Engagement**
   - Daily Active Users (DAU)
   - Recipe views per user
   - Average session duration
   - Follow rate

2. **Content Metrics**
   - Recipes created per day
   - Recipe save rate
   - Average recipe rating
   - Trending recipes accuracy

3. **Performance Metrics**
   - API response times
   - Database query times
   - Error rates
   - Rate limit hits

4. **Security Metrics**
   - Failed login attempts
   - Rate limit violations
   - CSRF token failures
   - RLS policy violations

---

## 🎯 Optimization Tips

### Database Optimization

```sql
-- Find slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public';
```

### Application Optimization

1. **Enable caching** for feed generation (Redis)
2. **Add CDN** for static assets (Cloudflare, Vercel Edge)
3. **Optimize images** (WebP, AVIF with Next.js Image)
4. **Lazy load** below-the-fold content
5. **Implement service worker** for offline mode

---

## 📞 Support

For issues or questions:

1. Check this deployment guide
2. Review `BUILD_SUMMARY.md`
3. Check Supabase logs
4. Review application logs
5. Create GitHub issue with details

---

## 📝 Change Log

### Version 1.0.0 (Current)
- ✅ User authentication
- ✅ Recipe CRUD
- ✅ Social following system
- ✅ Personalized feed with collaborative filtering
- ✅ Trending recipes
- ✅ Rate limiting
- ✅ Security hardening

### Planned for v1.1.0
- [ ] Direct messaging
- [ ] Push notifications
- [ ] Advanced search filters
- [ ] Recipe collections
- [ ] Video uploads

---

🎉 **Congratulations! Your Hey Garlic platform is ready for deployment!**
