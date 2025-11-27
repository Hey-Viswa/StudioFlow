# Appwrite Integration Guide for StudioFlow

## Overview
StudioFlow now uses **Appwrite** for:
- ✅ Email notifications (contact form, user notifications)
- ✅ Push notifications (real-time alerts)
- ✅ SMS notifications (optional)
- ✅ Realtime database subscriptions

---

## Prerequisites

### 1. Appwrite Account Setup
1. Go to [Appwrite Cloud](https://cloud.appwrite.io/)
2. Sign in with your GitHub Student Pack account
3. Create a new project named `studioflow`
4. Copy your Project ID from the dashboard

### 2. Create API Key
1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it `studioflow` 
4. Select **ALL scopes** (Auth, Database, Storage, Functions, Messaging, etc.)
5. Set expiration date (or never expire)
6. Copy the API key (you'll only see it once!)

---

## Environment Variables Setup

Add these to your `.env` file in the server directory:

```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT=<your-project-id>
APPWRITE_KEY=<your-api-key>

# Optional: Database and Collection IDs (if using Appwrite Database)
APPWRITE_DATABASE_ID=studioflow
APPWRITE_NOTIFICATIONS_COLLECTION_ID=notifications

# Admin email for contact form notifications
ADMIN_EMAIL=your-admin-email@example.com

# Client URL for email links
CLIENT_URL=http://localhost:3002
```

### How to Get Project ID:
1. Open your Appwrite project dashboard
2. Click on **Settings** in the left sidebar
3. Your **Project ID** is displayed at the top

### How to Create API Key:
1. Go to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. **Name**: `studioflow-production`
4. **Expiration**: Never (or custom)
5. **Scopes**: Select **ALL** for development (or specific ones for production)
6. Click **Create**
7. **Copy the key immediately** (shown only once!)

---

## Appwrite Messaging Setup

### 1. Enable Email Provider
1. Go to **Messaging** → **Providers**
2. Click **"Create provider"**
3. Select **Email**
4. Choose a provider:
   - **SMTP** (recommended for custom domain)
   - **SendGrid** (easy to set up)
   - **Mailgun**, **AWS SES**, etc.

#### Example: SMTP Configuration
```
Name: StudioFlow SMTP
Host: smtp.gmail.com
Port: 587
Encryption: TLS
Username: your-email@gmail.com
Password: your-app-password (not your Gmail password!)
From Email: noreply@studioflow.com
From Name: StudioFlow
```

**Gmail Users**: You need to create an [App Password](https://support.google.com/accounts/answer/185833)

### 2. Enable Push Notifications (Optional)
1. Go to **Messaging** → **Providers**
2. Click **"Create provider"**
3. Select **Push Notifications**
4. Choose platform:
   - **FCM** (Firebase Cloud Messaging) for Android/Web
   - **APNS** (Apple Push Notification Service) for iOS

#### FCM Setup:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Go to **Project Settings** → **Cloud Messaging**
4. Copy **Server Key**
5. Paste into Appwrite FCM provider config

### 3. Enable SMS (Optional)
1. Go to **Messaging** → **Providers**
2. Click **"Create provider"**
3. Select **SMS**
4. Choose provider: **Twilio**, **Vonage**, **Telesign**, etc.

---

## Testing the Integration

### 1. Remove Dummy Notifications
```bash
cd d:\School\StudioFlow\studioflow\server
node cleanup-dummy-notifications.js
```

### 2. Test Contact Form Email
```bash
# Start the server
cd d:\School\StudioFlow\studioflow\server
node index.js

# In another terminal, test the contact endpoint
curl -X POST http://localhost:5000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Testing Appwrite Email",
    "message": "This is a test message to verify Appwrite email integration."
  }'
```

Expected output:
```
✅ Contact notification sent via Appwrite
```

### 3. Test Push Notifications
```bash
# Create a test notification with push
node -e "
const { createNotification } = require('./src/services/notificationService.js');
createNotification({
  userId: 'user_XXXXXX',
  type: 'system',
  title: '🔔 Test Push Notification',
  message: 'Testing Appwrite push notifications',
  priority: 'high',
  sendPush: true
}).then(() => console.log('✅ Push notification sent'))
  .catch(err => console.error('❌ Error:', err));
"
```

### 4. Test Email Notifications
```bash
# Create a test notification with email
node -e "
const { createNotification } = require('./src/services/notificationService.js');
createNotification({
  userId: 'user_XXXXXX',
  type: 'project_updated',
  title: '📋 Project Updated',
  message: 'Your project has been updated',
  link: '/dashboard/projects/123',
  priority: 'medium',
  sendEmail: true
}).then(() => console.log('✅ Email notification sent'))
  .catch(err => console.error('❌ Error:', err));
"
```

---

## Verification Checklist

### Server Startup
When you start the server, you should see:
```
✅ Appwrite client initialized
   Endpoint: https://cloud.appwrite.io/v1
   Project: <your-project-id>
✅ Appwrite Messaging initialized
```

If not configured:
```
⚠️  Appwrite not configured - using Socket.IO fallback
   Set APPWRITE_ENDPOINT, APPWRITE_PROJECT, APPWRITE_KEY to enable
⚠️  Appwrite Messaging not configured
```

### Contact Form
- [ ] Submit contact form from frontend
- [ ] Check server logs for `✅ Contact notification sent via Appwrite`
- [ ] Check admin email inbox for notification
- [ ] Verify email contains correct sender info and message

### User Notifications
- [ ] Perform an action that triggers notification (e.g., create project, add comment)
- [ ] Check notification appears in NotificationBell
- [ ] Check server logs for `✅ Notification persisted`
- [ ] Check server logs for `📡 Realtime notification sent`
- [ ] If `sendEmail: true`, check email inbox

### Push Notifications (if enabled)
- [ ] Create notification with `sendPush: true`
- [ ] Check device receives push notification
- [ ] Verify notification data and action link

---

## Troubleshooting

### "Appwrite is not configured"
- ✅ Check `.env` file has APPWRITE_ENDPOINT, APPWRITE_PROJECT, APPWRITE_KEY
- ✅ Restart server after adding env variables
- ✅ Verify API key has correct scopes

### "Failed to send email via Appwrite"
- ✅ Ensure email provider is configured in Appwrite dashboard
- ✅ Check SMTP credentials are correct
- ✅ Verify "From Email" is authorized (for Gmail, use App Password)
- ✅ Check Appwrite Messaging logs in dashboard

### "Push notification error"
- ✅ Verify FCM/APNS provider is configured
- ✅ Check server key is correct
- ✅ Ensure client app has registered for push notifications
- ✅ Verify device token is valid

### Fallback to SendGrid
If Appwrite is not configured, the system will:
1. Use Socket.IO for realtime (already working)
2. Queue emails via BullMQ + SendGrid (if SENDGRID_API_KEY is set)
3. Log warnings in console

---

## Production Best Practices

### Security
1. **Use environment-specific API keys**
   - Development: API key with all scopes
   - Production: API key with only necessary scopes (Messaging, Database)

2. **Restrict API key by IP** (optional)
   - Go to API Key settings
   - Add your server IP address

3. **Use HTTPS for webhooks**
   - Appwrite supports webhooks for messaging events
   - Set webhook URL to `https://your-domain.com/api/webhooks/appwrite`

### Performance
1. **Monitor usage in Appwrite dashboard**
   - Go to **Overview** → **Usage**
   - Check email/SMS/push quota

2. **Implement rate limiting**
   - Already implemented in contact form (5 requests per 15 min)
   - Consider adding rate limits for notifications

3. **Enable caching**
   - Use idempotency keys to prevent duplicate notifications
   - Already implemented in `notificationService.js`

### Monitoring
1. **Check Appwrite Logs**
   - Go to **Logs** in Appwrite dashboard
   - Filter by messaging events
   - Monitor failures and retries

2. **Server Logs**
   - Watch for `✅ Notification email sent via Appwrite`
   - Watch for `❌ Failed to send email via Appwrite`
   - Set up error tracking (Sentry, etc.)

---

## Support

### Appwrite Support
- [Documentation](https://appwrite.io/docs)
- [Discord Community](https://appwrite.io/discord)
- [GitHub Issues](https://github.com/appwrite/appwrite/issues)

### StudioFlow Issues
- Check server logs for detailed error messages
- Verify environment variables are set correctly
- Test with simple curl commands first
- Check Appwrite dashboard for usage and errors

---

## Next Steps

1. ✅ Configure Appwrite project and API key
2. ✅ Set up email provider (SMTP/SendGrid)
3. ✅ Add environment variables
4. ✅ Run cleanup script to remove dummy notifications
5. ✅ Test contact form
6. ✅ Test notification emails
7. 🔄 (Optional) Set up push notifications
8. 🔄 (Optional) Set up SMS notifications
9. 🚀 Deploy to production

---

**Congratulations!** 🎉 Your notification system is now powered by Appwrite!
