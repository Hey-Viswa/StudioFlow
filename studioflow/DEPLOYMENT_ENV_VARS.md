# Environment Variables for Production Deployment

## ⚠️ CRITICAL: Add These to Railway & Vercel

### Railway (Backend Server)
🔗 https://railway.app/dashboard

Add these 4 variables to your **server project**:

```
RAZORPAY_KEY_ID=rzp_test_RbHukLhdtq1xlM
RAZORPAY_KEY_SECRET=O9Y60LcDOc2EO5kMz5rgQcMt
RAZORPAY_PRO_PLAN_ID=plan_RcTPS7s2l9ku5N
RAZORPAY_STUDIO_PLAN_ID=plan_RcTPuLbBYG9E8N
```

**Steps:**
1. Open your Railway project
2. Click on your service
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Add each variable above
6. Railway will auto-redeploy

---

### Vercel (Frontend Client)
🔗 https://vercel.com/hey-viswas-projects/studio-flow/settings/environment-variables

Add this 1 variable:

```
VITE_RAZORPAY_KEY_ID=rzp_test_RbHukLhdtq1xlM
```

**Steps:**
1. Go to Settings → Environment Variables
2. Click **Add New**
3. Name: `VITE_RAZORPAY_KEY_ID`
4. Value: `rzp_test_RbHukLhdtq1xlM`
5. Environment: Check **Production** ✓
6. Click **Save**
7. Go to Deployments → Redeploy latest

---

## ✅ Verification

After adding variables:

1. **Check Railway Logs**: You should see:
   ```
   === Razorpay Configuration Check ===
   RAZORPAY_KEY_ID: rzp_test_RbHukL...
   RAZORPAY_KEY_SECRET: Set ✓
   RAZORPAY_PRO_PLAN_ID: plan_RcTPS7s2l9ku5N
   RAZORPAY_STUDIO_PLAN_ID: plan_RcTPuLbBYG9E8N
   ```

2. **Test Subscription**: Try upgrading to Pro/Studio plan

---

## 🔒 Security Note
- These are **TEST MODE** credentials (rzp_test_*)
- No real money will be charged
- Safe to use for development
- Never commit .env files to git (already in .gitignore)
