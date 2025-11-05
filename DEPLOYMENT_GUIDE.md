# 🚀 StudioFlow Production Deployment Guide

Complete guide to deploy StudioFlow with Railway (Backend) + Vercel (Frontend)

---

## 📋 Overview

- **Frontend**: React + Vite → Deploy to **Vercel**
- **Backend**: Node.js + Express → Deploy to **Railway**
- **Database**: MongoDB Atlas (already configured)
- **Auth**: Clerk (already configured)

---

## 🔧 Part 1: Deploy Backend to Railway

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `StudioFlow` repository
5. Railway will detect the repository

### Step 2: Configure Root Directory

**IMPORTANT**: Railway needs to know which folder to deploy

1. In Railway project settings, click on your service
2. Go to **Settings** tab
3. Under **Source**, set:
   - **Root Directory**: `studioflow/server`
4. Click **Save**

### Step 3: Add Environment Variables

In Railway, go to **Variables** tab and add these:

```bash
MONGO_URI=mongodb+srv://viswaranjandev_db_user:1Q48l2OoBycR1L0V@studioflow-cluster.hvu8xji.mongodb.net/studioflow?retryWrites=true&w=majority&appName=studioflow-cluster

JWT_SECRET=05faae3d7406ab7270dd6c1b8c2edf4540aeb9ab2e046470283b78efc867b536

CLERK_JWKS_URL=https://splendid-shiner-56.clerk.accounts.dev/.well-known/jwks.json

CLERK_SECRET_KEY=sk_test_bXa1OaxHnRPyqpnPdGaUOAKE9mfB2U8NgsiRHQe1AA

CLERK_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3002,http://localhost:3003

RAZORPAY_KEY_ID=rzp_test_RbHukLhdtq1xlM

RAZORPAY_KEY_SECRET=O9Y60LcDOc2EO5kMz5rgQcMt

FRONTEND_URL=http://localhost:3002

NODE_ENV=production

PORT=5000
```

⚠️ **Note**: We'll update `CLERK_ALLOWED_ORIGINS` and `FRONTEND_URL` after getting Vercel URL

### Step 4: Deploy

1. Railway will automatically start deploying
2. Wait for build to complete (check **Deployments** tab)
3. Once deployed, click on your service
4. Find the **public URL** (looks like: `https://studioflow-server-production-xxxx.up.railway.app`)
5. **Copy this URL** - you'll need it for Vercel!

### Step 5: Test Backend

Visit: `https://your-railway-url.up.railway.app/api/health`

You should see:
```json
{
  "ok": true,
  "time": "2025-11-05T...",
  "status": "Server is running"
}
```

---

## 🌐 Part 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your `StudioFlow` GitHub repository
4. Vercel will detect the repository

### Step 2: Configure Project Settings

**IMPORTANT**: Configure these settings:

- **Framework Preset**: `Vite`
- **Root Directory**: `studioflow/client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 3: Add Environment Variables

Before deploying, click **Environment Variables** and add:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_c3BsZW5kaWQtc2hpbmVyLTU2LmNsZXJrLmFjY291bnRzLmRldiQ

VITE_API_URL=https://your-railway-url.up.railway.app/api
```

⚠️ **Replace** `your-railway-url` with the actual Railway URL you copied earlier!

### Step 4: Deploy

1. Click **Deploy**
2. Wait for build to complete (3-5 minutes)
3. Once deployed, you'll get a URL like: `https://studioflow.vercel.app`
4. **Copy this Vercel URL**

### Step 5: Test Frontend

1. Visit your Vercel URL
2. You should see the StudioFlow landing page
3. Try signing in to test authentication

---

## 🔄 Part 3: Connect Frontend & Backend

### Update Railway CORS Settings

Now that you have your Vercel URL, go back to Railway:

1. Go to your Railway project
2. Click **Variables** tab
3. Update these variables:

```bash
CLERK_ALLOWED_ORIGINS=https://studioflow.vercel.app,https://www.studioflow.vercel.app,http://localhost:5173,http://localhost:3002

FRONTEND_URL=https://studioflow.vercel.app
```

4. Railway will automatically redeploy with new variables

### Update Clerk Dashboard

1. Go to [clerk.com](https://clerk.com) dashboard
2. Select your application
3. Go to **Paths** or **Allowed Origins**
4. Add your Vercel URL: `https://studioflow.vercel.app`
5. Save changes

---

## ✅ Part 4: Verify Deployment

### Test Complete Flow

1. **Visit Vercel URL**: `https://studioflow.vercel.app`
2. **Sign In**: Test Clerk authentication
3. **Create Project**: Create a new test project
4. **Generate Invite**: Create an invite link
5. **Accept Invite**: Test invite acceptance flow
6. **Check Dashboard**: Verify projects load

### Check Analytics

- **Vercel Analytics**: Go to Vercel dashboard → Analytics
- **Speed Insights**: Go to Vercel dashboard → Speed Insights

---

## 🐛 Troubleshooting

### Backend Issues

#### Railway Build Fails
- Check **Deployments** → **Build Logs**
- Verify `nixpacks.toml` exists in `studioflow/server`
- Ensure Root Directory is set to `studioflow/server`

#### "Script start.sh not found"
- Railway is using wrong build system
- Solution: Check `railway.json` and `nixpacks.toml` are present
- Redeploy

#### MongoDB Connection Failed
- Verify `MONGO_URI` is correct in Railway variables
- Check MongoDB Atlas → Network Access
- Allow all IPs: `0.0.0.0/0` (or Railway's IPs)

### Frontend Issues

#### Vercel Build Fails
- Check build logs for specific errors
- Verify all dependencies in `package.json`
- Ensure `VITE_` prefix on all environment variables

#### API Calls Return 404
- Check `VITE_API_URL` in Vercel environment variables
- Verify Railway backend is running
- Test: `https://your-railway-url/api/health`

#### CORS Errors
- Check browser console for exact error
- Verify `CLERK_ALLOWED_ORIGINS` in Railway includes Vercel URL
- Make sure no trailing slashes in URLs
- Restart Railway deployment after changing variables

#### Authentication Not Working
- Verify `VITE_CLERK_PUBLISHABLE_KEY` in Vercel
- Check Clerk dashboard allowed origins
- Clear browser cookies and try again

---

## 📊 Monitoring

### Railway

- **Logs**: Railway dashboard → Your service → Logs
- **Metrics**: Railway dashboard → Your service → Metrics
- **Health Check**: `https://your-railway-url/api/health`

### Vercel

- **Logs**: Vercel dashboard → Your project → Logs
- **Analytics**: Vercel dashboard → Analytics (page views, visitors)
- **Speed Insights**: Vercel dashboard → Speed Insights (performance metrics)

---

## 🔐 Security Checklist

- [ ] All sensitive keys in environment variables (not in code)
- [ ] CORS properly configured with specific origins
- [ ] MongoDB network access configured
- [ ] Clerk production keys (if using production)
- [ ] HTTPS enabled on both deployments
- [ ] Rate limiting configured (consider adding)

---

## 🚀 Deployment Complete!

Your StudioFlow application is now live:

- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-app.up.railway.app
- **Database**: MongoDB Atlas (cloud)
- **Auth**: Clerk (cloud)
- **Analytics**: Vercel Analytics & Speed Insights

### Next Steps

1. Set up custom domain (optional)
2. Configure email notifications (if needed)
3. Set up monitoring alerts
4. Plan scaling strategy
5. Regular backups for MongoDB

---

## 📝 Quick Reference

### Railway URLs
- Dashboard: https://railway.app
- Deployment: https://your-app.up.railway.app
- Health: https://your-app.up.railway.app/api/health

### Vercel URLs
- Dashboard: https://vercel.com
- Production: https://your-app.vercel.app
- Preview: https://your-app-git-branch.vercel.app

### Important Commands

```bash
# Redeploy Railway (from local)
git push origin main

# Redeploy Vercel (automatic on push)
git push origin main

# Check Railway logs
railway logs

# Check Vercel logs
vercel logs
```

---

**Need Help?**
- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- MongoDB Docs: https://docs.mongodb.com
- Clerk Docs: https://clerk.com/docs
