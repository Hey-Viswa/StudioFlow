# Quick Railway Deployment Steps

## Step 1: Create Railway Account & Project

1. Go to: https://railway.app/new
2. Sign in with GitHub
3. Click "Deploy from GitHub repo"
4. Select "Hey-Viswa/StudioFlow"
5. Click "Deploy Now"

## Step 2: CRITICAL - Set Root Directory

After deployment starts:
1. Click on your service name
2. Go to "Settings" tab
3. Find "Root Directory" 
4. Set to: `studioflow/server`
5. Save

## Step 3: Add Environment Variables

Go to "Variables" tab and add ALL of these:

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

## Step 4: Add Your Vercel URL (REPLACE WITH YOUR ACTUAL URL)

Add these two more variables:
```
FRONTEND_URL=https://your-actual-vercel-url.vercel.app
CLERK_ALLOWED_ORIGINS=https://your-actual-vercel-url.vercel.app
```

## Step 5: Generate Public Domain

1. Go to "Settings" tab
2. Under "Networking" section
3. Click "Generate Domain"
4. Copy your Railway URL (e.g., studioflow-production.up.railway.app)

## Step 6: Check Deployment Logs

1. Go to "Deployments" tab
2. Click latest deployment
3. View logs - should see "Server is running on port XXXX"

---

## If Railway deployment fails, check:

1. Root directory is set to `studioflow/server`
2. All environment variables are added
3. Check logs for specific error messages
