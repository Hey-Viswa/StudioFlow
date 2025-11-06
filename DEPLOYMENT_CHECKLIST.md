# ✅ DEPLOYMENT CHECKLIST

## 📋 Pre-Deployment Checklist

### Environment Variables Setup

#### Backend (.env in studioflow/server/)
```env
# Required
PORT=5000
MONGODB_URI=your_mongodb_uri
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_JWKS_URL=https://your-domain.clerk.accounts.dev/.well-known/jwks.json
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
NODE_ENV=production

# New - Add these
SENTRY_DSN=your_backend_sentry_dsn  # Get from https://sentry.io
FRONTEND_URL=https://www.studioflow.studio
```

#### Frontend (.env in studioflow/client/)
```env
# Required
VITE_API_URL=https://studioflow-production.up.railway.app
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id

# New - Add this
VITE_SENTRY_DSN=your_frontend_sentry_dsn  # Get from https://sentry.io
```

### Get Sentry DSN

1. Go to https://sentry.io
2. Create account (free tier)
3. Create two projects:
   - "studioflow-backend" (Node.js)
   - "studioflow-frontend" (React)
4. Copy DSN from project settings
5. Add to environment variables

---

## 🧪 Local Testing

### 1. Test Real-Time Features

**Terminal 1 - Start Backend:**
```powershell
cd studioflow/server
npm install  # Install new packages
npm start
# Should see: "Socket.IO server running on port 5000"
```

**Terminal 2 - Start Frontend:**
```powershell
cd studioflow/client
npm install  # Install new packages
npm run dev
# Open http://localhost:5173
```

**Test Checklist:**
- [ ] Open project in Chrome
- [ ] Open same project in Firefox (different user)
- [ ] User 1: Add comment → User 2 sees it instantly (no refresh)
- [ ] User 1: Create task → User 2 sees it instantly
- [ ] User 1: Update task → User 2 sees update instantly
- [ ] User 1: Invite member → User 2 sees notification
- [ ] Check browser console for Socket.IO connection: "Connected to Socket.IO"
- [ ] Check backend logs for: "User joined project: [projectId]"

### 2. Test Subscription Limits

**Free Plan (5 projects):**
- [ ] Create 5 projects → Success
- [ ] Try creating 6th project → Error: "Upgrade to Pro for more projects"
- [ ] Check error message shows current count: "You have 5 out of 5 projects"

**Pro Plan (50 projects):**
- [ ] Upgrade to Pro via Razorpay
- [ ] Create 50 projects → Success
- [ ] Try creating 51st → Error: "Upgrade to Studio"

### 3. Test Sentry (After Deploy)

**Trigger Test Error:**
```javascript
// In browser console on studioflow.studio
throw new Error("Test Sentry Integration");
```

**Check Sentry:**
- [ ] Go to sentry.io dashboard
- [ ] See error in "Issues" within 1 minute
- [ ] Verify error details, stack trace
- [ ] Check sampling rate (should see ~5-10% of total events)

### 4. Test Project Categorization

- [ ] Create project as owner → Appears in "My Projects" tab
- [ ] Accept invite to someone's project → Appears in "Shared with Me" tab
- [ ] Check "All Projects" shows both
- [ ] Verify owner name shown under project title
- [ ] Verify "Shared" badge on shared projects

### 5. Test User Names Display

- [ ] Open project with multiple members
- [ ] Check team members section shows:
  - [ ] Name (not user ID)
  - [ ] Email
  - [ ] Join date
- [ ] Check comments show author name
- [ ] Check project owner shows name (not ID)

---

## 🚀 Deployment Steps

### 1. Commit Changes

```powershell
# From root StudioFlow directory
git status
git add .
git commit -m "feat: real-time updates (Socket.IO), Sentry error tracking, subscription limits (Pro: 50, Studio: 100), project categorization with user names"
```

### 2. Deploy Backend (Railway)

```powershell
cd studioflow/server
git push origin main
```

**Railway Dashboard:**
- [ ] Go to railway.app dashboard
- [ ] Open "studioflow-production" project
- [ ] Check deployment logs
- [ ] Wait for "Deployment successful"
- [ ] Add SENTRY_DSN environment variable
- [ ] Redeploy

**Verify:**
- [ ] Visit https://studioflow-production.up.railway.app/health
- [ ] Should return: `{"status":"ok"}`
- [ ] Check logs for Socket.IO initialization

### 3. Deploy Frontend (Vercel)

```powershell
cd studioflow/client
git push origin main
```

**Vercel Dashboard:**
- [ ] Go to vercel.com dashboard
- [ ] Open "studioflow-client" project
- [ ] Check deployment logs
- [ ] Wait for "Deployment completed"
- [ ] Add VITE_SENTRY_DSN environment variable
- [ ] Redeploy

**Verify:**
- [ ] Visit https://www.studioflow.studio
- [ ] Should load without errors
- [ ] Check browser console for errors

### 4. Configure CORS (Backend)

**Railway Environment Variables:**
- [ ] Verify FRONTEND_URL=https://www.studioflow.studio
- [ ] Check Socket.IO CORS includes frontend URL

---

## ✅ Post-Deployment Testing

### 1. Production Real-Time Test

- [ ] Open www.studioflow.studio in two browsers
- [ ] Login as different users
- [ ] Create project and invite second user
- [ ] First user: Add comment
- [ ] Second user: Should see comment instantly (no refresh)
- [ ] Check Network tab for WebSocket connection (ws://)

### 2. Production Sentry Test

**Backend Error Test:**
```powershell
# Call invalid endpoint
curl https://studioflow-production.up.railway.app/api/test-error
```

**Frontend Error Test:**
```javascript
// In browser console on www.studioflow.studio
throw new Error("Production Sentry Test");
```

- [ ] Check sentry.io dashboard for both errors
- [ ] Verify source maps working (shows actual code, not minified)
- [ ] Check error rate is <10% of requests (sampling working)

### 3. Production Subscription Limits

- [ ] Create 5 projects on free plan
- [ ] Verify 6th project blocked
- [ ] Upgrade to Pro (₹199)
- [ ] Verify can create up to 50 projects
- [ ] Check Razorpay dashboard for payment

### 4. Production Database Check

**MongoDB Atlas:**
- [ ] Login to cloud.mongodb.com
- [ ] Check "users" collection
- [ ] Verify new users being created
- [ ] Check "projects" collection
- [ ] Verify members array has names (not just IDs)
- [ ] Check storage usage (should be <512MB for free tier)

---

## 📊 Monitoring Setup

### 1. Railway Metrics

- [ ] Set up deployment notifications (Slack/Email)
- [ ] Monitor CPU/Memory usage
- [ ] Set alert for >80% resource usage
- [ ] Monitor request logs for errors

### 2. Vercel Analytics

- [ ] Enable Web Vitals monitoring
- [ ] Check page load times (<3s)
- [ ] Monitor Core Web Vitals (LCP, FID, CLS)
- [ ] Set up deployment notifications

### 3. Sentry Alerts

- [ ] Create alert rule for critical errors
- [ ] Set notification to email
- [ ] Configure Slack integration (optional)
- [ ] Set weekly error summary report

### 4. MongoDB Monitoring

- [ ] Enable free monitoring
- [ ] Check connection count (<500 for free tier)
- [ ] Monitor storage growth
- [ ] Set alert for 80% storage usage (409MB)

### 5. Clerk Dashboard

- [ ] Monitor Monthly Active Users (MAU)
- [ ] Check authentication success rate
- [ ] Monitor user sign-ups
- [ ] Set alert for approaching 10k MAU (free tier limit)

---

## 🐛 Troubleshooting

### Socket.IO Not Working

**Symptoms:** Comments don't appear instantly, no WebSocket connection

**Fix:**
1. Check browser console for Socket.IO connection error
2. Verify CORS settings in server/index.js
3. Check Railway logs for Socket.IO initialization
4. Verify FRONTEND_URL environment variable
5. Test with: `const socket = io('https://studioflow-production.up.railway.app')`

### Sentry Not Receiving Errors

**Symptoms:** No errors in Sentry dashboard

**Fix:**
1. Check SENTRY_DSN environment variables (both frontend and backend)
2. Verify NODE_ENV=production (Sentry only works in production)
3. Trigger manual error: `Sentry.captureException(new Error("Test"))`
4. Check browser/server console for Sentry initialization logs
5. Verify network tab shows requests to sentry.io

### Subscription Limits Not Enforced

**Symptoms:** Can create unlimited projects

**Fix:**
1. Check middleware order in server/index.js
2. Verify subscriptionLimits middleware is applied to POST /api/projects
3. Check user's subscription plan in MongoDB
4. Verify Clerk metadata has correct plan
5. Test with console.log in subscriptionLimits.js

### User Names Not Showing

**Symptoms:** Still seeing user IDs instead of names

**Fix:**
1. Check Clerk API key has read permissions
2. Verify CLERK_SECRET_KEY environment variable
3. Check projectController.js logs for Clerk API errors
4. Test Clerk API directly: `await clerkClient.users.getUser(userId)`
5. Clear browser cache and refresh

### Real-Time Updates Delayed

**Symptoms:** Updates take >5 seconds to appear

**Fix:**
1. Check Socket.IO connection quality (ping/pong)
2. Verify Railway/Vercel network not throttling
3. Check for rate limiting middleware interference
4. Monitor Railway CPU usage (should be <80%)
5. Consider increasing Railway plan if consistently slow

---

## 📈 Success Metrics (First Month)

### Week 1 Goals
- [ ] 10-50 sign-ups
- [ ] 0-5 paid users (test payment flow)
- [ ] <100 Sentry errors
- [ ] 100% uptime
- [ ] Socket.IO working for all users

### Week 2-4 Goals
- [ ] 50-200 sign-ups
- [ ] 5-20 paid users (₹1000-4000 MRR)
- [ ] <500 Sentry errors
- [ ] 99%+ uptime
- [ ] Positive user feedback

### Cost Tracking
- [ ] Railway: Stay under $5/month (free tier)
- [ ] MongoDB: Stay under 512MB (free tier)
- [ ] Clerk: Stay under 10k MAU (free tier)
- [ ] Sentry: Stay under 5k errors/month (free tier)
- [ ] Total cost: ₹100/month (domain only)

---

## 🎯 Launch Checklist

### Before Going Live
- [ ] All environment variables set
- [ ] Local testing complete (all features work)
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Database connected and working
- [ ] Sentry integrated (both frontend and backend)
- [ ] Socket.IO working in production
- [ ] Razorpay test payment successful
- [ ] User names displaying correctly
- [ ] Project categorization working

### Launch Day
- [ ] Post on social media (LinkedIn, Twitter)
- [ ] Send to friends/family for testing
- [ ] Monitor Sentry for errors (first 24h)
- [ ] Monitor Railway logs for issues
- [ ] Check MongoDB connection count
- [ ] Respond to user feedback
- [ ] Fix any critical bugs immediately

### First Week
- [ ] Daily error monitoring (Sentry)
- [ ] Daily user feedback review
- [ ] Monitor payment conversions
- [ ] Check server performance (Railway)
- [ ] Optimize based on user behavior
- [ ] Document common issues
- [ ] Prepare FAQ based on questions

---

## 🎉 You're Ready to Launch!

**All systems implemented:**
✅ Real-time updates (Socket.IO)
✅ Error tracking (Sentry)
✅ Subscription limits (50/100)
✅ Project categorization
✅ User name display
✅ Budget optimization (all free tiers)

**Total monthly cost: ₹100** (just domain)
**Break-even: 1 paid user** (₹199 Pro plan)

Good luck with your launch! 🚀
