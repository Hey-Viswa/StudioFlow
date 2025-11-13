# Subscription Management Testing Guide

## Overview
This guide provides step-by-step instructions for testing the comprehensive subscription management system with Razorpay integration.

## Test Environment Setup

### Prerequisites
1. **Razorpay Account**: Test mode keys configured
2. **Webhook URL**: Configured in Razorpay dashboard pointing to your server
3. **Environment Variables**:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   RAZORPAY_WEBHOOK_SECRET=xxxxx
   RAZORPAY_PRO_PLAN_ID=plan_xxxxx
   RAZORPAY_STUDIO_PLAN_ID=plan_xxxxx
   ```

### Start Services
```bash
# Server (Terminal 1)
cd studioflow/server
npm run dev

# Client (Terminal 2)
cd studioflow/client
npm run dev
```

## Test Scenarios

### 1. Subscription Creation Flow

#### Test Steps:
1. **Navigate to Pricing Page**
   - Go to `/pricing` or `/subscription`
   - Verify plan cards display correctly (Free, Pro, Studio)

2. **Select a Plan**
   - Click "Upgrade to Pro" or "Upgrade to Studio"
   - System should create Razorpay subscription

3. **Complete Payment**
   - Razorpay modal should appear
   - Use test card: `4111 1111 1111 1111`
   - Any future expiry date
   - Any CVV

4. **Verify Success**
   - Toast notification: "Subscription activated successfully"
   - Check browser console for logs
   - Verify webhook received in server logs

#### Expected Results:
- **Database State**:
  ```javascript
  subscription: {
    plan: 'pro',
    status: 'active',
    razorpaySubscriptionId: 'sub_xxxxx',
    razorpayPaymentId: 'pay_xxxxx',
    subscriptionStartDate: Date,
    subscriptionEndDate: Date (30 days later),
    nextBillingDate: Date,
    lastStatusChange: Date,
    autoRenew: true
  }
  ```

- **Server Logs**:
  ```
  [timestamp] 📨 WEBHOOK RECEIVED: subscription.activated
  [timestamp] ✅ Subscription activated
  [timestamp]   User: user@example.com
  [timestamp]   Status: created → active
  [timestamp]   Plan: free → pro
  ```

---

### 2. Subscription Cancellation Flow

#### Test Steps:
1. **Navigate to Settings**
   - Go to `/dashboard/settings`
   - Click "Billing & Subscription" tab

2. **Cancel Subscription**
   - Click "Cancel Subscription" button
   - Confirm cancellation in dialog
   - Optional: Provide cancellation reason

3. **Verify Cancellation**
   - Check toast notification with refund details
   - Note the "Access Until" date
   - Verify subscription shows as "Cancelled" but still active

#### Expected Results:
- **Database State**:
  ```javascript
  subscription: {
    plan: 'pro', // Still Pro until end date!
    status: 'cancelled',
    cancelledAt: Date,
    cancelReason: 'User requested cancellation',
    lastStatusChange: Date,
    subscriptionEndDate: Date (original end date maintained),
    autoRenew: false
  }
  ```

- **Server Logs**:
  ```
  [timestamp] === CANCEL SUBSCRIPTION REQUEST ===
  [timestamp] 💰 Initiating refund...
  [timestamp] ✓ Refund created: rfnd_xxxxx
  [timestamp]   Amount: ₹XX
  [timestamp] ✓ Razorpay subscription cancelled
  [timestamp] ✓ Invoice generated: INV-xxxxx
  [timestamp] ✓ User subscription updated:
  [timestamp]   Status: active → cancelled
  [timestamp]   Access until: 2025-12-XX
  ```

- **Webhook Logs**:
  ```
  [timestamp] 📨 WEBHOOK RECEIVED: subscription.cancelled
  [timestamp] ✅ Subscription cancelled
  [timestamp]   User: user@example.com
  [timestamp]   Plan: pro (retained until end date)
  [timestamp]   Access until: 2025-12-XX
  ```

- **Invoice Created**:
  - Type: `refund`
  - Amount: Negative (prorated refund)
  - Status: `pending` or `refunded`

---

### 3. Subscription Expiration (Automated)

#### Test Setup:
To test expiration without waiting, you can:
1. Use debug endpoint to set end date to past:
   ```bash
   POST /api/subscriptions/fix/user_xxxxx
   {
     "plan": "pro",
     "endDate": "2025-11-12T00:00:00Z" # Yesterday
   }
   ```

2. Manually trigger checker:
   ```javascript
   // In server console or add temporary route
   import { checkExpiredSubscriptions } from './src/jobs/subscriptionChecker.js';
   checkExpiredSubscriptions();
   ```

#### Expected Results:
- **Server Logs**:
  ```
  [timestamp] 🔍 Starting subscription expiration check...
  [timestamp] Found 1 expired subscription(s) to process
  [timestamp] 📋 Processing expired subscription for: user@example.com
  [timestamp]   Plan: pro
  [timestamp]   Status: cancelled
  [timestamp]   End date: 2025-11-12
  [timestamp]   → Archived 10 project(s) (over free limit of 5)
  [timestamp]   → Downgraded from pro (cancelled) to free plan
  [timestamp] ✅ Subscription check complete. Success: 1, Failed: 0
  ```

- **Database State**:
  ```javascript
  subscription: {
    plan: 'free', // Downgraded!
    status: 'expired',
    razorpaySubscriptionId: null,
    subscriptionEndDate: null,
    autoRenew: false
  }
  ```

- **Projects**:
  - Only first 5 projects remain active
  - Projects 6+ are `status: 'archived'`

---

### 4. Status Verification Endpoint

#### Test Steps:
```bash
# Using curl or Postman
POST /api/subscriptions/verify-status
Authorization: Bearer {clerk-token}
```

#### Expected Response:
```json
{
  "message": "Subscription synced successfully",
  "updated": true,
  "changes": [
    "status: active → cancelled",
    "nextBillingDate updated to 2025-12-15T00:00:00Z"
  ],
  "razorpayData": {
    "id": "sub_xxxxx",
    "status": "cancelled",
    "plan_id": "plan_xxxxx",
    "current_end": "2025-12-15T00:00:00.000Z",
    "total_count": 12,
    "paid_count": 1,
    "remaining_count": 11
  },
  "currentDbData": {
    "plan": "pro",
    "status": "cancelled",
    "subscriptionEndDate": "2025-12-15T00:00:00.000Z",
    "nextBillingDate": "2025-12-15T00:00:00.000Z"
  }
}
```

---

### 5. UI Feature Restrictions

#### Test Scenarios:

**A. Active Subscription (Status: active)**
- ✅ Can create new projects
- ✅ Pro features accessible
- ✅ No warning banners
- ✅ "Upgrade" button hidden

**B. Cancelled Subscription (Still within period)**
- ✅ Can create new projects (until end date)
- ✅ Pro features still accessible
- ⚠️  Warning banner: "Your pro plan expires in X days. Reactivate to keep access."
- ✅ "Reactivate" button visible

**C. Expired Subscription**
- ❌ Cannot create new projects (beyond free limit)
- ❌ Pro features disabled
- ❌ Error banner: "Your subscription has expired. Upgrade to regain access."
- ✅ "Upgrade" button visible
- Projects beyond limit moved to trash

**D. Payment Failed**
- ⚠️  Projects may be limited
- ❌ Error banner: "Payment failed. Please update your payment method."
- ✅ Can update payment and retry

#### Test UI Components:

1. **Projects Page** (`/dashboard/projects`)
   - Subscription alert at top
   - "New Project" button disabled when appropriate
   - Project count shows limit usage

2. **Settings Page** (`/dashboard/settings`)
   - Subscription alert at top
   - Billing tab shows current status
   - Cancel/Reactivate buttons based on status

3. **Navigation**
   - Pro features show lock icon when restricted
   - Tooltips explain limitations

---

### 6. Webhook Testing

#### Simulate Webhooks Manually:

```bash
# Test subscription.activated
curl -X POST http://localhost:5000/api/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: {calculated-signature}" \
  -d '{
    "event": "subscription.activated",
    "payload": {
      "subscription": {
        "entity": {
          "id": "sub_xxxxx",
          "status": "active",
          "plan_id": "plan_xxxxx",
          "start_at": 1731456000,
          "end_at": 1734048000,
          "current_end": 1731542400
        }
      }
    }
  }'

# Test subscription.cancelled
curl -X POST http://localhost:5000/api/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: {calculated-signature}" \
  -d '{
    "event": "subscription.cancelled",
    "payload": {
      "subscription": {
        "entity": {
          "id": "sub_xxxxx",
          "status": "cancelled"
        }
      }
    }
  }'
```

**Note**: Calculate signature correctly:
```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');
```

---

### 7. Cron Job Testing

#### Verify Scheduled Jobs:

1. **Check Server Startup Logs**:
   ```
   [timestamp] 📅 Initializing subscription checker with cron jobs...
   [timestamp] ✅ Subscription checker started:
   [timestamp]    - Expiration check: Daily at midnight + hourly backup
   [timestamp]    - Status verification: Every 6 hours
   ```

2. **Test Expiration Check** (runs at 00:00 daily):
   - Wait for midnight OR
   - Manually trigger in code

3. **Test Status Verification** (runs every 6 hours):
   - Checks all active subscriptions against Razorpay
   - Syncs any mismatches

---

## Common Issues & Solutions

### Issue 1: Webhook Not Received
**Symptoms**: Payment successful but subscription not activated in DB

**Solutions**:
1. Check Razorpay dashboard webhook logs
2. Verify webhook URL is publicly accessible (use ngrok for local testing)
3. Check webhook signature verification
4. Verify `RAZORPAY_WEBHOOK_SECRET` is correct

### Issue 2: Subscription Shows Expired Immediately
**Symptoms**: User cancelled but lost access immediately

**Check**:
1. Webhook handler should NOT downgrade on `subscription.cancelled`
2. Only cron job should downgrade when `subscriptionEndDate < now`
3. Verify `subscriptionEndDate` is set correctly (30 days from start)

### Issue 3: Refund Not Processing
**Symptoms**: Cancellation succeeds but no refund

**Check**:
1. Verify `razorpayPaymentId` exists in DB
2. Check Razorpay dashboard for payment status
3. View server logs for refund creation errors
4. Test payments in Razorpay must be captured first

### Issue 4: Projects Not Archived on Downgrade
**Symptoms**: User downgraded but all projects still active

**Check**:
1. Run subscription checker manually
2. Verify project count vs limit
3. Check `Project.status` field
4. View downgrade function logs

---

## Test Checklist

### Backend Tests
- [ ] Create subscription API works
- [ ] Payment verification works
- [ ] Cancel subscription API works
- [ ] Refund is created on cancellation
- [ ] Invoice generated for payments and refunds
- [ ] Webhook signature verification works
- [ ] All webhook events handled correctly
- [ ] Subscription checker runs on schedule
- [ ] Status verification endpoint syncs correctly
- [ ] Database state reflects all changes

### Frontend Tests
- [ ] Pricing page displays plans correctly
- [ ] Payment modal appears and works
- [ ] Success/error toasts appear
- [ ] Settings page shows current subscription
- [ ] Cancel button works with confirmation
- [ ] Reactivate button works
- [ ] Subscription alerts display correctly
- [ ] Feature restrictions work (project creation)
- [ ] UI updates after status changes
- [ ] Billing history displays correctly

### Integration Tests
- [ ] Full flow: Signup → Subscribe → Use Features → Cancel → Expire
- [ ] Payment failure handling
- [ ] Webhook delivery and processing
- [ ] Automated downgrade after expiration
- [ ] Reactivation flow
- [ ] Multiple plan upgrades/downgrades

---

## Monitoring & Debugging

### Server Logs to Watch:
```bash
# Follow server logs
cd studioflow/server
npm run dev | grep -E "(📨|✅|❌|⚠️|🔍|💳|💰)"
```

### Database Queries:
```javascript
// Check user subscription
db.users.findOne(
  { clerkUserId: "user_xxxxx" },
  { subscription: 1 }
)

// Find all cancelled subscriptions
db.users.find(
  { "subscription.status": "cancelled" },
  { email: 1, "subscription.plan": 1, "subscription.subscriptionEndDate": 1 }
)

// Find subscriptions expiring soon
db.users.find({
  "subscription.status": "cancelled",
  "subscription.subscriptionEndDate": {
    $gte: new Date(),
    $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
})
```

### Razorpay Dashboard:
- **Subscriptions**: View all subscriptions and their status
- **Payments**: Check payment history
- **Refunds**: Monitor refund processing
- **Webhooks**: View webhook delivery logs

---

## Success Criteria

✅ **Complete Implementation When:**
1. User can subscribe to any plan
2. Payment processing works end-to-end
3. Webhooks update DB correctly
4. Cancellation triggers refund and updates status
5. User retains access after cancellation until end date
6. Automated expiration downgrades user to free
7. Projects are archived when over limit
8. UI shows correct status and restrictions
9. Reactivation flow works
10. All logs are comprehensive and helpful

---

## Production Checklist

Before deploying to production:
- [ ] Switch to Razorpay live mode keys
- [ ] Update webhook URL to production domain
- [ ] Test all flows in production mode
- [ ] Set up monitoring and alerts
- [ ] Configure backup/restore for MongoDB
- [ ] Test cron jobs run correctly
- [ ] Verify SSL certificate for webhooks
- [ ] Add rate limiting to subscription endpoints
- [ ] Set up Sentry error tracking
- [ ] Document customer support procedures

---

## Support & Maintenance

### Daily Tasks:
- Check webhook delivery success rate
- Monitor subscription checker logs
- Review payment failures

### Weekly Tasks:
- Analyze subscription metrics
- Review refund requests
- Check for stuck subscriptions

### Monthly Tasks:
- Audit subscription states vs Razorpay
- Review and optimize cron job schedules
- Update pricing or plans if needed
