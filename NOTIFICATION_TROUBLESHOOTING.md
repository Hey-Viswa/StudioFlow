# 🔍 Troubleshooting: No Notifications Visible

Let's diagnose why you're not seeing notifications in your dashboard.

## ✅ Quick Checks

### 1. Check Browser Console
Open your browser (http://localhost:3002) and press `F12` to open Developer Tools.

Look for these messages in the Console tab:
- ✅ `🔌 Socket connected` - Socket.IO is connected
- ✅ `✅ Socket authenticated: {...}` - Authentication successful
- ❌ Any errors related to `useNotifications` or `NotificationBell`

### 2. Check Network Tab
In Developer Tools > Network tab:
- Look for a request to `/api/notifications?limit=20`
- Check the response - it should show `{ notifications: [], unreadCount: 0 }` if no notifications exist
- Check for any 401 (Unauthorized) or 500 (Server Error) responses

### 3. Check if Server is Running
Your server should be running on port 5000. Check the terminal for:
- ✅ `🚀 Server is running on port 5000`
- ✅ `⚡ Socket.IO is ready for real-time updates`
- ✅ `📧 Email queue initialized`

## 🧪 Create a Test Notification

### Option 1: Using the Test Script (Easiest)

1. **Make sure your server is running** in one terminal
2. **Open a NEW terminal** and run:
   ```powershell
   cd d:\School\StudioFlow\studioflow\server
   node test-create-notification.js
   ```

This will create a welcome notification in your database.

### Option 2: Using MongoDB Compass (Manual)

1. Open MongoDB Compass and connect to your database
2. Navigate to: `studioflow` database → `notifications` collection
3. Click "Add Data" → "Insert Document"
4. Paste this JSON (replace `YOUR_CLERK_USER_ID` with your actual Clerk user ID):

```json
{
  "userId": "user_34ahC8n6ajkmZSIkEgnhz8PUh8k",
  "type": "info",
  "title": "🎉 Test Notification",
  "message": "This is a test notification to verify the system is working!",
  "icon": "🔔",
  "link": "/dashboard",
  "read": false,
  "priority": "medium",
  "category": "system",
  "createdAt": { "$date": { "$numberLong": "1732719600000" } }
}
```

5. Click "Insert"
6. **Refresh your browser** - you should see the notification bell badge appear!

### Option 3: Using REST API (Advanced)

You need a valid Clerk JWT token. Get it from your browser:

1. Open browser console (F12)
2. Run this command:
   ```javascript
   await window.Clerk.session.getToken()
   ```
3. Copy the token
4. In PowerShell, run:
   ```powershell
   $token = "YOUR_TOKEN_HERE"
   $body = @{
     title = "🎉 Test Notification"
     message = "Testing the notification system!"
     type = "info"
     link = "/dashboard"
   } | ConvertTo-Json
   
   Invoke-RestMethod -Uri "http://localhost:5000/api/notifications" `
     -Method POST `
     -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} `
     -Body $body
   ```

## 🔍 Common Issues

### Issue 1: "Socket connected" but no notifications
**Cause**: No notifications exist in the database yet
**Solution**: Create a test notification using Option 1 or 2 above

### Issue 2: 401 Unauthorized error
**Cause**: Clerk authentication issue
**Solution**: 
- Make sure you're logged in
- Check that `CLERK_JWKS_URL` in `.env` is correct
- Try logging out and back in

### Issue 3: NotificationBell not visible
**Cause**: Component may be hidden on collapsed sidebar
**Solution**: 
- Expand the sidebar (click the menu icon)
- On mobile, check the top-right header
- The bell icon should be visible on both desktop (when sidebar is expanded) and mobile header

### Issue 4: Socket.IO connection failed
**Cause**: Server not running or CORS issue
**Solution**:
- Check server is running on port 5000
- Check `VITE_API_URL` in `.env` is set to `http://localhost:5000/api`
- Restart both server and client

## 🎯 Expected Behavior

Once a notification is created, you should see:

1. **Bell Icon** in the dashboard header (🔔)
2. **Red Badge** with the number of unread notifications
3. **Dropdown Menu** when you click the bell showing:
   - List of notifications
   - "Mark all as read" button
   - Each notification with icon, title, message, and time

## 📊 Verify Database Connection

Check if notifications are being saved:

```powershell
# In a new terminal (while server is running)
cd d:\School\StudioFlow\studioflow\server
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGO_URI).then(() => { console.log('✅ MongoDB connected'); process.exit(0); }).catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });"
```

## 🚀 Next Steps

1. ✅ Verify server is running (check terminal)
2. ✅ Check browser console for errors (F12)
3. ✅ Create a test notification (use Option 1 - easiest)
4. ✅ Refresh browser (Ctrl + Shift + R)
5. ✅ Look for the bell icon with a badge

If you still don't see notifications after creating a test one, share:
- Browser console errors (F12 → Console tab)
- Network tab errors (F12 → Network tab → filter by "notifications")
- Server terminal output

---

**Quick Test**: Run this now to create a notification:

```powershell
cd d:\School\StudioFlow\studioflow\server
node test-create-notification.js
```

Then refresh your browser and check the bell icon! 🔔
