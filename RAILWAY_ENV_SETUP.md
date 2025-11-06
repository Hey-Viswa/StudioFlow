# 🚂 Railway Environment Variables Setup

## Required Environment Variables for Backend

Go to your Railway dashboard → Your project → Variables tab and add these:

### Core Configuration
```
PORT=5000
NODE_ENV=production
```

### Database
```
MONGO_URI=mongodb+srv://viswaranjandev_db_user:1Q48l2OoBycR1L0V@studioflow-cluster.hvu8xji.mongodb.net/studioflow?retryWrites=true&w=majority&appName=studioflow-cluster
```

### JWT
```
JWT_SECRET=05faae3d7406ab7270dd6c1b8c2edf4540aeb9ab2e046470283b78efc867b536
```

### Clerk Authentication
```
CLERK_JWKS_URL=https://splendid-shiner-56.clerk.accounts.dev/.well-known/jwks.json
CLERK_ALLOWED_ORIGINS=https://www.studioflow.studio,https://studioflow.vercel.app
CLERK_PUBLISHABLE_KEY=pk_test_c3BsZW5kaWQtc2hpbmVyLTU2LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_bXa1OaxHnRPyqpnPdGaUOAKE9mfB2U8NgsiRHQe1AA
CLERK_WEBHOOK_SECRET=whsec_OiS7zR6FnsbPbO0GcPZXi9QDY83ceXwa
```

### 🔥 Razorpay (UPDATED - Nov 6, 2025)
```
RAZORPAY_KEY_ID=rzp_test_Rc79SqocIuhDPp
RAZORPAY_KEY_SECRET=5AZq9psjrBDF3ZD3EctUOJ4o
RAZORPAY_PRO_PLAN_ID=plan_RcTPS7sz19ku5N
RAZORPAY_STUDIO_PLAN_ID=plan_RcTPuLbBYG9E8N
RAZORPAY_WEBHOOK_SECRET=[Get this from Razorpay Dashboard → Settings → Webhooks]
```

**Plan Details:**
- **Pro Plan**: ₹100/month - `plan_RcTPS7sz19ku5N`
- **Studio Plan**: ₹499/month - `plan_RcTPuLbBYG9E8N`

**Webhook Setup:**
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-railway-url.up.railway.app/api/payment/razorpay-webhook`
3. Select events:
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.expired`
   - `subscription.paused`
   - `subscription.resumed`
   - `payment.failed`
4. Copy the webhook secret and add it to `RAZORPAY_WEBHOOK_SECRET`

### Frontend URL
```
FRONTEND_URL=https://www.studioflow.studio
```

### 🔥 Sentry Error Tracking (UPDATED - Nov 6, 2025)
```
SENTRY_DSN=https://e634b2b440c4edc19f7ec7487ccc4dfd@o4508902601392128.ingest.us.sentry.io/4510318288896000
SENTRY_AUTH_TOKEN=0a25a848bb1411f0b9ecb2ce1b8b4a0b
SENTRY_PROJECT_ID=4510318288896000
```

---

## 📋 Quick Copy-Paste Format for Railway

Copy each line and paste into Railway Variables:

```
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://viswaranjandev_db_user:1Q48l2OoBycR1L0V@studioflow-cluster.hvu8xji.mongodb.net/studioflow?retryWrites=true&w=majority&appName=studioflow-cluster
JWT_SECRET=05faae3d7406ab7270dd6c1b8c2edf4540aeb9ab2e046470283b78efc867b536
CLERK_JWKS_URL=https://splendid-shiner-56.clerk.accounts.dev/.well-known/jwks.json
CLERK_ALLOWED_ORIGINS=https://www.studioflow.studio,https://studioflow.vercel.app
CLERK_PUBLISHABLE_KEY=pk_test_c3BsZW5kaWQtc2hpbmVyLTU2LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_bXa1OaxHnRPyqpnPdGaUOAKE9mfB2U8NgsiRHQe1AA
CLERK_WEBHOOK_SECRET=whsec_OiS7zR6FnsbPbO0GcPZXi9QDY83ceXwa
RAZORPAY_KEY_ID=rzp_test_Rc79SqocIuhDPp
RAZORPAY_KEY_SECRET=5AZq9psjrBDF3ZD3EctUOJ4o
RAZORPAY_PRO_PLAN_ID=plan_RcTPS7sz19ku5N
RAZORPAY_STUDIO_PLAN_ID=plan_RcTPuLbBYG9E8N
RAZORPAY_WEBHOOK_SECRET=
FRONTEND_URL=https://www.studioflow.studio
SENTRY_DSN=https://e634b2b440c4edc19f7ec7487ccc4dfd@o4508902601392128.ingest.us.sentry.io/4510318288896000
SENTRY_AUTH_TOKEN=0a25a848bb1411f0b9ecb2ce1b8b4a0b
SENTRY_PROJECT_ID=4510318288896000
```

---

## ✅ What Changed

### Updated Variables (Need to change in Railway):
1. **RAZORPAY_PRO_PLAN_ID**: Changed from `plan_Rc6scnAb7IIgEb` to `plan_RcTPS7sz19ku5N`
2. **RAZORPAY_STUDIO_PLAN_ID**: Changed from `plan_Rc6tn7Iq8gjxd7` to `plan_RcTPuLbBYG9E8N`

### New Variables (Need to add in Railway):
3. **SENTRY_DSN**: `https://e634b2b440c4edc19f7ec7487ccc4dfd@o4508902601392128.ingest.us.sentry.io/4510318288896000`
4. **SENTRY_AUTH_TOKEN**: `0a25a848bb1411f0b9ecb2ce1b8b4a0b`
5. **SENTRY_PROJECT_ID**: `4510318288896000`

---

## 🚀 Deployment Steps

### 1. Update Railway Variables
- Go to https://railway.app/dashboard
- Select your project
- Click "Variables" tab
- Update the 2 Razorpay plan IDs
- Add the 3 new Sentry variables

### 2. Redeploy Backend
After updating variables, Railway will automatically redeploy. If not:
- Click "Deploy" button
- Or push a commit to trigger redeploy

### 3. Deploy Frontend (Vercel)
```powershell
cd D:\School\StudioFlow
npx vercel --prod --yes
```

### 4. Update Vercel Environment Variables
Go to Vercel dashboard → Your project → Settings → Environment Variables:

Add/Update:
```
VITE_SENTRY_DSN=https://e634b2b440c4edc19f7ec7487ccc4dfd@o4508902601392128.ingest.us.sentry.io/4510318288896000
VITE_SENTRY_AUTH_TOKEN=0a25a848bb1411f0b9ecb2ce1b8b4a0b
VITE_SENTRY_PROJECT_ID=4510318288896000
```

Then redeploy:
```powershell
npx vercel --prod --yes
```

---

## 🧪 Testing Checklist

After deployment:

### Backend (Railway)
- [ ] Go to https://studioflow-production.up.railway.app/health
- [ ] Should return `{"status":"ok"}`
- [ ] Check Railway logs for errors
- [ ] Verify Sentry initialization message

### Frontend (Vercel)
- [ ] Visit https://www.studioflow.studio
- [ ] Check pricing page shows ₹100 for Pro, ₹499 for Studio
- [ ] Test subscription flow with new plans
- [ ] Check browser console for Sentry initialization

### Sentry
- [ ] Go to https://sentry.io/dashboard
- [ ] Check if project is receiving events
- [ ] Trigger test error: `throw new Error("Test")`
- [ ] Verify error appears in Sentry dashboard

---

## 📊 Current Pricing Structure

| Plan | Price | Projects | Team Members | Plan ID |
|------|-------|----------|--------------|---------|
| **Starter** | ₹0/mo | 5 | 1 per project | N/A (Free) |
| **Pro** | ₹100/mo | 50 | 5 per project | `plan_RcTPS7sz19ku5N` |
| **Studio** | ₹499/mo | 100 | Unlimited | `plan_RcTPuLbBYG9E8N` |

---

## 🎯 Features Now Live

✅ Real-time updates with Socket.IO
✅ Error tracking with Sentry (GitHub Student Pro)
✅ Updated pricing (Pro: ₹100, Studio: ₹499)
✅ Project categorization (My/Shared tabs)
✅ User names display (fetched from Clerk)
✅ Subscription limits enforced (50/100 projects)

---

**All set! Update Railway variables and redeploy!** 🚀
