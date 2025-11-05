# Clerk Webhook Setup Guide

## Why Set Up Clerk Webhooks?

Clerk webhooks automatically sync user data to your database when users:
- ✅ Sign up (creates user in DB with starter plan)
- ✅ Update profile (syncs name, email, image)
- ✅ Delete account (marks user as deleted)

**Without webhooks**: Users are created "on-demand" when they first use a feature
**With webhooks**: Users are created immediately upon sign-up

---

## Setup Steps

### 1. Get Your ngrok URL (for local testing)

Your ngrok is already running. The URL is:
```
https://anderson-nonlubricating-aniyah.ngrok-free.dev
```

Webhook endpoint will be:
```
https://anderson-nonlubricating-aniyah.ngrok-free.dev/api/clerk/webhook
```

### 2. Configure Webhook in Clerk Dashboard

1. **Go to**: https://dashboard.clerk.com/
2. **Navigate to**: Webhooks (in left sidebar)
3. **Click**: "Add Endpoint"
4. **Endpoint URL**: 
   ```
   https://anderson-nonlubricating-aniyah.ngrok-free.dev/api/clerk/webhook
   ```
5. **Subscribe to events**:
   - ✅ `user.created`
   - ✅ `user.updated`  
   - ✅ `user.deleted`
6. **Click "Create"**
7. **Copy the Signing Secret** (starts with `whsec_`)

### 3. Add Webhook Secret to .env

Update your `.env` file:
```env
CLERK_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

Replace `your_clerk_webhook_secret_here` with the actual secret from Clerk.

### 4. Restart Your Server

```powershell
# The server should auto-restart with nodemon
# If not, manually restart:
cd d:/School/StudioFlow/studioflow/server
npm run dev
```

### 5. Test the Webhook

1. **Create a new test user** in your app (sign up)
2. **Check server logs** - you should see:
   ```
   Clerk webhook event: user.created
   ✅ User created via webhook: test@example.com
   ```
3. **Check database** - user should exist with `starter` plan

---

## What Each Event Does

### `user.created`
- Creates new user in database
- Sets default plan to `starter`
- Sets status to `active`
- Syncs: email, name, profile image

### `user.updated`
- Updates existing user info
- Syncs: email, name, profile image
- If user doesn't exist, creates them

### `user.deleted`
- Soft deletes user (sets `deletedAt` field)
- Keeps data for compliance
- User won't be able to sign in

---

## For Production

When you deploy to production:

1. **Update webhook URL** in Clerk Dashboard:
   ```
   https://yourdomain.com/api/clerk/webhook
   ```

2. **Generate new signing secret** for production

3. **Update production .env** with new secret

---

## Troubleshooting

### "Missing svix headers" error
- Make sure ngrok is running
- Check webhook URL is correct
- Verify Clerk is sending to correct endpoint

### "Invalid signature" error
- Double-check `CLERK_WEBHOOK_SECRET` in `.env`
- Make sure no extra spaces in the secret
- Restart server after updating `.env`

### Webhook not triggering
- Check ngrok is running: `ngrok http 5000`
- Test with Clerk Dashboard → Webhooks → Test Event
- Check server logs for incoming requests

---

## Current Status

- ✅ Webhook controller created
- ✅ Webhook routes configured  
- ✅ svix package installed
- ✅ Endpoint available at `/api/clerk/webhook`
- ❌ Need to add secret to `.env`
- ❌ Need to configure in Clerk Dashboard

---

## Optional: Skip Webhooks

If you don't want to set up webhooks right now:

1. Comment out the clerk webhook route in `server/index.js`:
   ```javascript
   // app.use('/api/clerk', clerkWebhookRoutes);
   ```

2. Users will still be created "on-demand" when they:
   - Create their first project
   - Access subscription page
   - Use any protected feature

This works fine for development/testing!
