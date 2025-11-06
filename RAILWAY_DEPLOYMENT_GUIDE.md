# Railway Server Deployment Guide

## Prerequisites
- Railway account (sign up at railway.app with GitHub)
- Your GitHub repo pushed with latest changes

## Step 1: Create Railway Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose **"Hey-Viswa/StudioFlow"** repository
5. Railway will detect your code

## Step 2: Configure Root Directory

Since you have a monorepo structure, you need to tell Railway to use the `studioflow/server` directory:

1. In your Railway project, click on your service
2. Go to **Settings** tab
3. Find **"Root Directory"** setting
4. Set it to: `studioflow/server`
5. Click **Save**

## Step 3: Add Environment Variables

Go to **Variables** tab and add these (copy from your `.env` file):

```
MONGO_URI=mongodb+srv://viswaranjandev_db_user:1Q48l2OoBycR1L0V@studioflow-cluster.hvu8xji.mongodb.net/studioflow?retryWrites=true&w=majority&appName=studioflow-cluster
JWT_SECRET=05faae3d7406ab7270dd6c1b8c2edf4540aeb9ab2e046470283b78efc867b536
CLERK_JWKS_URL=https://splendid-shiner-56.clerk.accounts.dev/.well-known/jwks.json
CLERK_PUBLISHABLE_KEY=pk_test_c3BsZW5kaWQtc2hpbmVyLTU2LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_bXa1OaxHnRPyqpnPdGaUOAKE9mfB2U8NgsiRHQe1AA
CLERK_WEBHOOK_SECRET=whsec_OiS7zR6FnsbPbO0GcPZXi9QDY83ceXwa
RAZORPAY_KEY_ID=rzp_test_Rc79SqocIuhDPp
RAZORPAY_KEY_SECRET=5AZq9psjrBDF3ZD3EctUOJ4o
RAZORPAY_PRO_PLAN_ID=plan_Rc6scnAb7IIgEb
RAZORPAY_STUDIO_PLAN_ID=plan_Rc6tn7Iq8gjxd7
NODE_ENV=production
```

**Important:** Add your Vercel URL once deployed:
```
FRONTEND_URL=https://your-app.vercel.app
CLERK_ALLOWED_ORIGINS=https://your-app.vercel.app
```

## Step 4: Deploy

1. Railway will auto-deploy after you add environment variables
2. Or click **"Deploy"** button manually
3. Wait 2-3 minutes for build to complete

## Step 5: Get Your Railway URL

1. Go to **Settings** tab
2. Under **"Networking"** section
3. Click **"Generate Domain"**
4. Copy the URL (something like `studioflow-production.up.railway.app`)

## Step 6: Test Server

Run this command (replace with your Railway URL):

```bash
curl https://your-railway-app.up.railway.app/api/health
```

Should return:
```json
{"ok":true,"time":"2025-11-06T...","status":"Server is running"}
```

## Step 7: Update Vercel Environment Variables

1. Go to Vercel Dashboard
2. Select your StudioFlow project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-railway-app.up.railway.app` (your Railway URL)
5. Click **Save**
6. Go to **Deployments** tab → Click **"..."** on latest deployment → **"Redeploy"**

## Troubleshooting

### Build Fails
- Check **Deployments** → **View Logs**
- Look for errors in the build phase
- Common issue: Wrong root directory (should be `studioflow/server`)

### Server Doesn't Start
- Check if `PORT` is using `process.env.PORT` (already done ✓)
- Verify MongoDB URI is correct
- Check logs for connection errors

### CORS Errors
- Add your Vercel domain to `CLERK_ALLOWED_ORIGINS` in Railway
- Add to `FRONTEND_URL` as well
- Format: `https://your-app.vercel.app` (no trailing slash)

### Health Check Fails
- Our server has `/api/health` endpoint ✓
- Railway config has healthcheck enabled ✓
- Check if server actually started in logs

## Common Railway Commands (if using CLI)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# View logs
railway logs

# Add variable
railway variables set KEY=value
```

## What's Already Configured

✅ Server uses `process.env.PORT`
✅ Health endpoint at `/api/health`
✅ CORS configured for Vercel domains
✅ Railway.json with proper settings
✅ Nixpacks.toml for monorepo structure
✅ ES modules properly configured

## Next Steps After Deployment

1. Update Clerk webhook URLs to point to Railway
2. Update Razorpay webhook URLs to point to Railway
3. Test all API endpoints from Vercel client
4. Monitor Railway logs for any issues
