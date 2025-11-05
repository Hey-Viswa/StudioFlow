# Razorpay Subscription Setup Guide

## Overview
Your subscription system is now implemented! Here's what's been set up:

### ✅ Completed
1. **Backend subscription controller** - Full CRUD operations + webhooks
2. **Subscription routes** - API endpoints at `/api/subscriptions`
3. **Subscription page** - Complete UI with payment integration
4. **Razorpay package** - Installed and configured
5. **Environment variables** - Basic setup complete

### 🔄 Next Steps

## 1. Create Razorpay Subscription Plans

You need to create subscription plans in your Razorpay dashboard:

1. **Login to Razorpay Dashboard**: https://dashboard.razorpay.com/
2. **Navigate to**: Subscriptions → Plans → Create Plan
3. **Create Pro Plan**:
   - Plan Name: `StudioFlow Pro`
   - Billing Amount: `₹79900` (amount in paise, so ₹799)
   - Billing Interval: `Monthly`
   - Description: `Unlimited projects, branded invoices, priority support`
   - Copy the Plan ID (format: `plan_XXXXX`)

4. **Create Studio Plan**:
   - Plan Name: `StudioFlow Studio`
   - Billing Amount: `₹199900` (amount in paise, so ₹1999)
   - Billing Interval: `Monthly`
   - Description: `Everything in Pro + team permissions, advanced reviews`
   - Copy the Plan ID (format: `plan_YYYYY`)

5. **Update Environment Variables**:
   - Open `d:\School\StudioFlow\.env`
   - Replace `RAZORPAY_PRO_PLAN_ID=plan_XXXXXX` with your actual Pro plan ID
   - Replace `RAZORPAY_STUDIO_PLAN_ID=plan_YYYYYY` with your actual Studio plan ID

## 2. Configure Webhook

1. **In Razorpay Dashboard**: Settings → Webhooks → Create Webhook
2. **Webhook URL**: `http://localhost:5000/api/subscriptions/webhook` (for testing)
   - For production, use your deployed backend URL
3. **Active Events** - Select these:
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.completed`
   - `subscription.paused`
4. **Secret**: Copy the webhook secret
5. **Update .env**: Replace `RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here`

## 3. Test the Subscription Flow

1. **Start the servers**:
   ```powershell
   # Terminal 1 - Backend (already running)
   cd d:/School/StudioFlow/studioflow/server
   npm run dev

   # Terminal 2 - Frontend
   cd d:/School/StudioFlow/studioflow/client
   npm run dev
   ```

2. **Navigate to Subscription Page**:
   - Open http://localhost:3002
   - Go to Settings → Subscription
   - Click "Choose Pro" or "Choose Studio"

3. **Test Payment**:
   - Use Razorpay test card: `4111 1111 1111 1111`
   - CVV: Any 3 digits
   - Expiry: Any future date
   - Complete the payment

4. **Verify**:
   - Check if subscription status updates to "Active"
   - Check backend logs for webhook events
   - Verify in database that `subscription.plan` and `subscription.status` updated

## 4. Subscription Plans Summary

### 🆓 Starter (Free)
- **Price**: ₹0
- **Projects**: 2 max
- **Features**:
  - Basic project tracking
  - Simple invoicing
  - Email support

### 💎 Pro
- **Price**: ₹799/month
- **Projects**: Unlimited
- **Features**:
  - Everything in Starter
  - Client collaboration
  - Branded invoices + Razorpay
  - Priority support
  - Advanced project analytics

### 🏢 Studio
- **Price**: ₹1999/month
- **Projects**: Unlimited
- **Features**:
  - Everything in Pro
  - Team permissions & roles
  - Advanced client reviews
  - White-label options
  - Dedicated account manager

## 5. Important Notes

### Current Limitations (To Implement)
- ❌ **Project creation limits not enforced** - Free users can create unlimited projects
- ❌ **Landing page pricing section** - Not added yet
- ❌ **Existing users migration** - Need to set default plan for existing users

### Security
- All payment processing happens on Razorpay's secure servers
- Webhook signatures are verified before processing
- User authentication required for all subscription operations

### Testing vs Production
- Current keys are **TEST MODE** - Use test cards only
- For production:
  1. Switch Razorpay to Live Mode in dashboard
  2. Generate Live API keys
  3. Update `.env` with live keys
  4. Create live subscription plans
  5. Update webhook URL to production domain

## 6. API Endpoints Available

- `GET /api/subscriptions/current` - Get current subscription
- `POST /api/subscriptions/create` - Create new subscription
- `POST /api/subscriptions/verify` - Verify payment
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/subscriptions/webhook` - Razorpay webhook handler

## 7. Need to Implement

### Project Creation Limits Middleware
Create `server/src/middlewares/subscriptionLimits.js`:
```javascript
export async function checkProjectLimit(req, res, next) {
  try {
    const user = await User.findOne({ clerkUserId: req.userId });
    
    if (user.subscription.plan === 'starter') {
      const projectCount = await Project.countDocuments({ 
        ownerId: req.userId,
        deletedAt: null 
      });
      
      if (projectCount >= 2) {
        return res.status(403).json({ 
          error: 'Project limit reached. Upgrade to Pro or Studio for unlimited projects.',
          upgradeUrl: '/settings/subscription'
        });
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
}
```

Then add to project routes:
```javascript
import { checkProjectLimit } from '../middlewares/subscriptionLimits.js';
router.post('/projects', verifyClerk, checkProjectLimit, createProject);
```

### Landing Page Pricing Section
Add pricing cards to your landing page matching the subscription page design.

## 8. Database Schema

The User model already has subscription fields:
```javascript
subscription: {
  plan: { type: String, enum: ['starter', 'pro', 'studio'], default: 'starter' },
  status: { type: String, enum: ['active', 'inactive', 'cancelled', 'expired', 'created'], default: 'inactive' },
  razorpayCustomerId: String,
  razorpaySubscriptionId: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  startDate: Date,
  endDate: Date
}
```

## 9. Troubleshooting

### Payment not completing
- Check browser console for errors
- Verify Razorpay key in frontend `.env`
- Check backend logs for API errors

### Webhook not received
- Verify webhook URL is accessible
- Check webhook secret matches `.env`
- Use ngrok for local testing: `ngrok http 5000`

### Subscription not updating
- Check backend logs for webhook processing
- Verify Razorpay signature validation
- Check database for subscription status

---

## Quick Start Checklist

- [ ] Create Pro plan in Razorpay dashboard
- [ ] Create Studio plan in Razorpay dashboard
- [ ] Update `RAZORPAY_PRO_PLAN_ID` in `.env`
- [ ] Update `RAZORPAY_STUDIO_PLAN_ID` in `.env`
- [ ] Create webhook in Razorpay dashboard
- [ ] Update `RAZORPAY_WEBHOOK_SECRET` in `.env`
- [ ] Restart backend server
- [ ] Restart frontend server
- [ ] Test subscription flow
- [ ] Implement project creation limits
- [ ] Add pricing section to landing page

**Need Help?** 
- Razorpay Docs: https://razorpay.com/docs/api/subscriptions/
- Test Cards: https://razorpay.com/docs/payments/payments/test-card-details/
