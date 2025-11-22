# Quick Reference: Subscription Status Guide

## Status Overview

### Active Subscription States

#### `active`
- **Meaning**: User has an active paid subscription with auto-renew enabled
- **User sees**: "Active" badge (green)
- **Primary date**: Next billing/renewal date
- **Button state**: "Current Plan" (disabled)
- **Actions available**: Cancel auto-renew, upgrade/downgrade to other plans

#### `trial`  
- **Meaning**: User is in 7-day free trial period (first-time subscriber)
- **User sees**: "Free Trial Active" badge (amber) with Sparkles icon
- **Primary date**: Trial end date
- **Button state**: "Free Trial Active" (disabled)
- **Actions available**: None (must wait for trial to end or manually convert)
- **Special**: Trial progress indicator shows days remaining

### Inactive/Problematic States

#### `cancelled`
- **Meaning**: User cancelled subscription, auto-renew is OFF
- **User sees**: "Cancelled" badge (red)
- **Primary date**: Access ends date (when features expire)
- **Button state**: "Reactivate {Plan}" (enabled)
- **Actions available**: Reactivate subscription (starts new subscription)

#### `expired`
- **Meaning**: Subscription period ended, no active access
- **User sees**: "Expired" badge (red)  
- **Primary date**: Expired date
- **Button state**: "Reactivate {Plan}" (enabled)
- **Actions available**: Reactivate subscription (payment required)

#### `scheduled_downgrade`
- **Meaning**: User downgraded; current plan active until end of period
- **User sees**: "Downgrade Scheduled" badge (yellow)
- **Primary date**: Downgrade effective date
- **Button state**: "Downgrade Scheduled" (disabled)
- **Actions available**: Keep current features until scheduled date
- **Note**: Shows which plan user is moving to

### Payment/Setup States

#### `created`
- **Meaning**: Razorpay subscription created but payment not completed
- **User sees**: "Checkout Pending" badge (blue)
- **Primary date**: Checkout created date
- **Button state**: Depends on plan
- **Actions available**: Complete payment in Razorpay

#### `pending`
- **Meaning**: Waiting for Razorpay payment confirmation
- **User sees**: "Payment Pending" badge (blue)
- **Primary date**: Pending since date
- **Button state**: Depends on plan
- **Actions available**: Wait for payment confirmation

#### `inactive` / `default`
- **Meaning**: No active subscription (edge case)
- **User sees**: "Inactive" badge (grey)
- **Primary date**: Status updated date
- **Button state**: "Start Free Trial" or upgrade options (enabled)
- **Actions available**: Subscribe to paid plan

## Plan Types

### Free Plan
- **Price**: ₹0 (Free Forever)
- **Projects**: 5 max
- **Team Members**: 1 per project
- **Trial Eligible**: Yes (first paid subscription gets 7-day trial)
- **Button**: Always shows "Free Plan" (disabled)

### Pro Plan  
- **Price**: ₹100/month
- **Projects**: 50 max
- **Team Members**: 5 per project
- **Trial**: 7 days free for first-time subscribers
- **Popular**: Yes (marked with badge)
- **Features**: Real-time updates, branded invoices, priority support

### Studio Plan
- **Price**: ₹499/month
- **Projects**: 100 max
- **Team Members**: Unlimited
- **Trial**: 7 days free for first-time subscribers
- **Features**: All Pro features + custom workflows, dedicated support

## Button Logic Decision Tree

```
Is it the Free plan card?
├─ Yes → Show "Free Plan" (disabled)
└─ No → Is it my current plan?
    ├─ Yes → What's my status?
    │   ├─ active/trial → "Current Plan" / "Free Trial Active" (disabled)
    │   ├─ cancelled/expired → "Reactivate {Plan}" (enabled)
    │   └─ scheduled_downgrade → "Downgrade Scheduled" (disabled)
    └─ No → Am I on Free plan with no previous paid plan?
        ├─ Yes → "Start Free Trial" (enabled)
        └─ No → What's the target plan?
            ├─ Studio (from Pro) → "Upgrade to Studio" (enabled)
            ├─ Pro (from Studio) → "Downgrade to Pro" (enabled)  
            └─ Other → "Switch to {Plan}" (enabled)
```

## Billing Information Display

### Active Paid Subscription
- **Label**: "Next Billing Date"
- **Date**: `subscriptionEndDate` (next charge date)
- **Auto-renew badge**: "Auto-renew ON" (green)
- **Cancel button**: Visible - "Cancel Auto-Renew"

### Trial Subscription
- **Label**: "Trial Ends On"
- **Date**: `trialEnd`
- **Auto-renew badge**: Not shown
- **Special**: Trial progress card showing conversion reminder

### Cancelled Subscription
- **Label**: "Access Until"
- **Date**: `subscriptionEndDate` (when access expires)
- **Auto-renew badge**: "Auto-renew OFF" (grey)
- **Reactivate button**: Visible

### Expired Subscription
- **Label**: "Expired On"
- **Date**: `subscriptionEndDate`
- **Auto-renew badge**: "Auto-renew OFF" (grey)
- **Reactivate button**: Visible

## Invoice History

### Invoice Status Colors
- **paid** / **refunded**: Green (default variant)
- **failed**: Red (destructive variant)
- **pending**: Grey (secondary variant)

### Invoice Types
- **payment**: Regular subscription payment
- **refund**: Prorated refund for cancellation
- **upgrade**: Prorated charge for plan upgrade
- **downgrade**: No charge (scheduled for future)

### Download Behavior
1. Click download button
2. If PDF exists → Download immediately
3. If PDF missing (404 error) → Auto-regenerate PDF
4. After regeneration → Retry download automatically
5. Show toast notifications for user feedback

## Data Flow

### API Response Structure
```javascript
GET /api/subscriptions/current returns:
{
  subscription: {
    plan: 'free' | 'pro' | 'studio',
    status: 'active' | 'trial' | 'cancelled' | ...,
    previousPlan: 'free' | 'pro' | 'studio' | null,
    trialStart: Date | null,
    trialEnd: Date | null,
    subscriptionStartDate: Date | null,
    subscriptionEndDate: Date | null,
    autoRenew: boolean,
    razorpaySubscriptionId: string | null,
    razorpayCustomerId: string | null,
    cancelledAt: Date | null,
    scheduledPlan: string | null,
    scheduledChangeDate: Date | null
  },
  plan: {
    id: string,
    name: string,
    price: number,
    currency: string,
    features: object
  },
  usage: {
    projectCount: number,
    maxProjects: number
  }
}
```

### Components Using Subscription Data
1. **Subscription.jsx** - Main subscription management page
2. **Settings.jsx** - Settings page billing section
3. **Projects.jsx** - Project limit warnings
4. **BillingDetails.jsx** - Detailed billing info component
5. **BillingHistory.jsx** - Invoice history display
6. **SubscriptionAlert.jsx** - Warning alerts across app

## Testing Scenarios

### Scenario 1: New Free User
- Status: `active`, Plan: `free`
- Should see: Free plan card, upgrade options with "Start Free Trial"
- Trial badge: Visible on Pro/Studio cards

### Scenario 2: Active Trial User
- Status: `trial`, Plan: `pro`
- Should see: Trial badge, trial end date, trial progress card
- Button: "Free Trial Active" (disabled)

### Scenario 3: Active Paid User
- Status: `active`, Plan: `pro`
- Should see: Active badge, next billing date, auto-renew ON
- Button: "Current Plan" (disabled)
- Actions: Can upgrade to Studio or cancel

### Scenario 4: Cancelled User
- Status: `cancelled`, Plan: `free` (downgraded)
- Should see: Cancelled badge, "Reactivate" buttons
- Alert: Shows warning about downgrade

### Scenario 5: Expired User
- Status: `expired`, Plan: `pro`
- Should see: Expired badge, "Reactivate Pro" button
- Alert: Shows urgent reactivation message
