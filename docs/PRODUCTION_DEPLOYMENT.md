# Production Deployment Guide - Hey Garlic

## 🚀 Pre-Deployment Checklist

### ✅ Code Quality
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Code reviewed
- [ ] Security audit completed
- [ ] Dependencies updated (`npm audit fix`)

### ✅ Environment Configuration
- [ ] Production environment variables set
- [ ] Database credentials secured
- [ ] API keys configured
- [ ] CORS settings reviewed
- [ ] Rate limiting enabled

### ✅ Database
- [ ] All migrations applied
- [ ] RLS policies tested
- [ ] Indexes created
- [ ] Backups configured
- [ ] Connection pooling configured

### ✅ Security
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] Error tracking enabled
- [ ] Logging configured

### ✅ Monitoring
- [ ] Health check endpoint working
- [ ] Uptime monitoring configured
- [ ] Error tracking (Sentry) configured
- [ ] Analytics configured
- [ ] Log aggregation set up

### ✅ Legal & Compliance
- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] Cookie Policy published
- [ ] GDPR compliance checked
- [ ] Data retention policy defined

---

## 🔧 Environment Variables

### Required Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Monitoring (Optional)
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_DSN=https://...@sentry.io/...

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_VERCEL_ANALYTICS=true

# Logging (Optional)
LOG_LEVEL=info
ENABLE_REMOTE_LOGGING=true
LOGGING_ENDPOINT=https://your-logging-service.com
```

---

## 📦 Deployment Steps

### 1. Vercel Deployment (Recommended)

#### Initial Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

#### Deploy to Production
```bash
# Deploy to production
vercel --prod

# Or via Git (automatic)
git push origin main
```

#### Configure in Vercel Dashboard
1. Go to project settings
2. Add environment variables
3. Configure custom domain
4. Enable automatic deployments
5. Set up preview deployments

### 2. Alternative: Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
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

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Build & Run
```bash
# Build image
docker build -t hey-garlic .

# Run container
docker run -p 3000:3000 --env-file .env.production hey-garlic
```

### 3. Alternative: AWS/DigitalOcean

#### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start npm --name "hey-garlic" -- start

# Save PM2 config
pm2 save

# Set up auto-restart on reboot
pm2 startup
```

---

## 🗄️ Database Setup

### 1. Apply Migrations

In Supabase Dashboard:
```sql
-- Run migrations in order:
1. 20261026_initial_dynamic_schema.sql
2. 20261030_faceted_categories_and_tags.sql
3. 20261031_recipe_boards_and_author_sync.sql
4. 20261031_social_notifications_and_replies.sql
5. 20261103_engagement_tracking.sql
6. 20261103_rate_limiting_infrastructure.sql
7. 20261103_recipe_visibility_privacy.sql
8. 20261103_user_following_system.sql
9. 20261103_enhanced_search_discovery.sql
10. 20261103_performance_indexes.sql
```

### 2. Verify Database

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public';

-- Check indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';
```

### 3. Configure Backups

In Supabase Dashboard:
- Enable automatic daily backups
- Configure backup retention (7-30 days)
- Test backup restoration

---

## 🔒 Security Configuration

### 1. Security Headers (next.config.js)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

### 2. CORS Configuration

```typescript
// For API routes if needed
const allowedOrigins = [
  'https://your-domain.com',
  'https://www.your-domain.com',
];

function checkOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // Allow same-origin
  return allowedOrigins.includes(origin);
}
```

---

## 📊 Monitoring Setup

### 1. Sentry Error Tracking

```bash
# Install Sentry
npm install --save @sentry/nextjs

# Run Sentry wizard
npx @sentry/wizard@latest -i nextjs
```

Configure in `sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### 2. Uptime Monitoring

**Recommended Services:**
- UptimeRobot (Free)
- Pingdom
- Datadog
- Better Uptime

**Configure Health Check:**
- Monitor: `https://your-domain.com/api/health`
- Interval: Every 5 minutes
- Alert on: HTTP 503 or timeout
- Alert via: Email, SMS, Slack

### 3. Analytics

**Google Analytics:**
```typescript
// app/layout.tsx
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
  `}
</Script>
```

**Vercel Analytics:**
```bash
npm install @vercel/analytics

// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 🔍 Performance Optimization

### 1. Image Optimization

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-domain.com', 'supabase-storage-url'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
}
```

### 2. Caching Strategy

- Static pages: ISR with revalidate
- Dynamic pages: Server-side rendering with cache
- API routes: Cache headers

### 3. Bundle Optimization

```bash
# Analyze bundle
npm run build
npx @next/bundle-analyzer
```

---

## 🧪 Post-Deployment Testing

### 1. Smoke Tests

```bash
# Health check
curl https://your-domain.com/api/health

# Homepage loads
curl -I https://your-domain.com

# Authentication works
# (Manual test in browser)

# Recipe creation works
# (Manual test in browser)
```

### 2. Performance Testing

- Lighthouse score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3.0s
- Cumulative Layout Shift < 0.1

### 3. Security Testing

```bash
# SSL test
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

# Security headers
https://securityheaders.com/?q=your-domain.com

# Check for vulnerabilities
npm audit
```

---

## 🚨 Rollback Procedure

### Vercel
```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Docker
```bash
# Stop current container
docker stop hey-garlic

# Start previous version
docker run -p 3000:3000 hey-garlic:previous-tag
```

---

## 📞 Support & Maintenance

### Daily Tasks
- Check error dashboard
- Review user reports
- Monitor uptime

### Weekly Tasks
- Review analytics
- Check security logs
- Update dependencies

### Monthly Tasks
- Database backup test
- Security audit
- Performance review

### Contact
- Technical Support: tech@your-domain.com
- Security Issues: security@your-domain.com
- General Inquiries: info@your-domain.com

---

## ✅ Production Launch Checklist

### Pre-Launch
- [ ] All code deployed
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] Monitoring enabled
- [ ] Backups configured

### Launch Day
- [ ] Final smoke tests completed
- [ ] Team notified
- [ ] Support ready
- [ ] Monitoring dashboards open
- [ ] Announcement prepared

### Post-Launch (First 24h)
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Address critical issues
- [ ] Update status page

---

## 🎉 Congratulations!

Your Hey Garlic app is now live in production! 🚀

Remember to monitor regularly and respond quickly to issues.

For questions or support, contact the development team.
