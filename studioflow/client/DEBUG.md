# Invoice System Debugging Guide

## Changes Made (Latest)

### 1. Fixed API Endpoint Issue
**Problem**: Code was using full URL `http://localhost:5000/api/invoices/...` which bypasses Vite proxy
**Solution**: Changed to relative URL `/api/invoices/...` to use Vite proxy correctly

**File**: `InvoiceTable.jsx` - Line 186
```javascript
// OLD (bypasses proxy, creates double /api path):
const response = await fetch(`${apiUrl}/invoices/${invoice._id}`, ...)

// NEW (uses proxy correctly):
const response = await fetch(`/api/invoices/${invoice._id}`, ...)
```

**Why this fixes it**:
- Vite proxy maps `/api/*` → `http://localhost:5000/api/*`
- Using full URL bypasses proxy and hits wrong endpoint
- Server expects `/api/invoices/:id`, not `/api/api/invoices/:id`

### 2. Added Console Logging for Debugging

All console logs start with emojis for easy filtering:

- 🔍 - Diagnostic info
- 🖊️ - Inline editing started
- ❌ - Cancelled operation
- 📡 - Network response
- ✅ - Success
- 🖱️ - Button click
- 📅 - Due date edit
- 💰 - Amount edit

**Files with logging**:
- `InvoiceTable.jsx` - saveEdit, startEditing, cancelEditing
- `InvoiceRowActions.jsx` - Button click, menu item clicks, render diagnostics

## Testing Instructions

### Step 1: Open Browser Console
1. Press F12 in browser
2. Go to Console tab
3. Clear existing logs

### Step 2: Test Three-Dot Menu
1. Click any three-dot menu (⋮) button
2. **Expected console logs**:
   ```
   🔍 InvoiceRowActions render: {invoiceId: "...", pendingAction: null, isDeleting: false, buttonDisabled: false}
   🖱️ Three-dot button clicked, isDeleting: false
   ```
3. Menu should open

### Step 3: Test Edit Due Date
1. Click "Edit Due Date" from menu
2. **Expected console logs**:
   ```
   📅 Edit Due Date clicked
   🖊️ Starting inline edit: {invoiceId: "...", field: "dueDate", currentValue: Date {...}}
   ```
3. Should see calendar popover appear

### Step 4: Test Calendar Date Selection
1. Click any date in calendar
2. Calendar should select the date
3. Button should show selected date

### Step 5: Test Save
1. Click ✓ (check) button
2. **Expected console logs**:
   ```
   🔍 Updating invoice: "..." with data: {projectId: "...", items: [...], dueDate: "2024-...", ...}
   📡 Response status: 200
   ✅ Update successful: {invoice: {...}}
   ```
3. Should see success toast
4. Invoice table should refresh with new date

## Common Issues & Solutions

### Issue 1: Three-Dot Button Not Clickable
**Symptoms**: No console logs when clicking button
**Possible Causes**:
- CSS overlay blocking clicks
- Button actually disabled
- React event handlers not attached

**Debug**:
1. Right-click button → Inspect Element
2. Check computed styles for `pointer-events`
3. Check if `disabled` attribute is present
4. Look for any overlaying elements with higher z-index

**Fix**: If you see `pointer-events: none` or `disabled="true"`, check `pendingAction` state

### Issue 2: Calendar Not Appearing
**Symptoms**: Edit clicked, no calendar shows
**Possible Causes**:
- Popover not rendering
- Z-index too low
- Portal mounting issue

**Debug**:
1. Look for `<div data-slot="calendar">` in DOM (F12 → Elements)
2. Check if Popover exists in DOM
3. Check z-index of PopoverContent

**Fix**: If calendar exists but invisible, check z-index and positioning

### Issue 3: Date Save Fails
**Symptoms**: Success toast but data doesn't update
**Possible Causes**:
- API endpoint wrong (was the main issue - FIXED)
- Server not receiving request
- Authentication token invalid
- Server error

**Debug**:
1. Check console for `📡 Response status` log
2. If status is not 200, check error message
3. Check Network tab (F12 → Network) for actual request
4. Look for request to `/api/invoices/:id` (should show in Network tab)

**Fix**: 
- If 404: Check server is running, route exists
- If 401: Check authentication token
- If 500: Check server logs

### Issue 4: Page Reloads After Save
**Symptoms**: Screen flashes, all state lost
**Possible Causes**:
- Form submission (FIXED - added `type="button"` everywhere)
- Uncaught error triggering reload
- onRefresh not working

**Debug**:
1. Check for errors in console
2. Verify no `<form>` element wrapping buttons
3. Check all buttons have `type="button"`

**Fix**: Already fixed - all Calendar buttons have `type="button"`

## Environment Check

### Required Environment Variables (`.env` in client folder)
```env
VITE_API_URL=http://localhost:5000/api  # ✓ Verified present
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...   # Required for auth
```

### Vite Proxy Configuration (`vite.config.js`)
```javascript
server: {
  port: 3002,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
    },
  },
}
```
✓ Verified correct

### Server Route (`server/src/routes/projectInvoices.js`)
```javascript
router.put('/invoices/:invoiceId', verifyClerk, updateProjectInvoice);
```
✓ Verified exists

## Quick Fix Checklist

If nothing works, try these in order:

1. ✅ **Restart Dev Server**
   ```powershell
   # In client folder
   npm run dev
   ```

2. ✅ **Restart Backend Server**
   ```powershell
   # In server folder
   npm start
   # or npm run dev
   ```

3. ✅ **Clear Browser Cache**
   - Ctrl+Shift+Delete
   - Check "Cached images and files"
   - Clear

4. ✅ **Hard Refresh**
   - Ctrl+Shift+R (Chrome/Firefox)
   - Or Ctrl+F5

5. ✅ **Check All Services Running**
   ```powershell
   # Check Node processes
   Get-Process -Name node
   
   # Should see at least 2: client (Vite) and server
   ```

6. ✅ **Test API Directly**
   ```powershell
   # Get auth token from browser (F12 → Application → Session Storage → clerk token)
   # Then test endpoint:
   curl http://localhost:5000/api/invoices -H "Authorization: Bearer YOUR_TOKEN"
   ```

## What Should Work Now

✅ Three-dot menu button should be clickable (unless invoice is being deleted)
✅ "Edit Due Date" menu item should trigger inline editing
✅ Calendar should appear in popover
✅ Date selection should work
✅ Save should call correct API endpoint (`/api/invoices/:id`)
✅ Success toast should show
✅ Table should refresh with new data
✅ No page reload

## What to Report If Still Broken

Please provide:
1. **Console logs** (copy entire console output)
2. **Network tab** (F12 → Network → filter "invoices" → show failed requests)
3. **Which step failed** (menu click? calendar? save?)
4. **Error messages** (red text in console or toast notifications)
5. **Browser and version** (Chrome 120, Firefox 121, etc.)

## Next Steps If Still Not Working

1. Check browser console for errors (any red text)
2. Check Network tab for failed requests
3. Verify server is running on port 5000
4. Verify client is running on port 3002
5. Test with simple curl request to verify server endpoint works
6. Check if authentication token is valid
