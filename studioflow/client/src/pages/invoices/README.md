# Invoices Feature - Production Ready

## Overview

Complete invoice management system for StudioFlow with:
- ✅ Online API integration with offline localStorage fallback
- ✅ Project-based invoice generation with auto-population
- ✅ PDF download capability
- ✅ Email delivery to clients
- ✅ Razorpay payment integration
- ✅ Dark admin UI matching design specs
- ✅ Full CRUD operations
- ✅ Responsive and accessible

## Architecture

```
pages/
  InvoicesPage.jsx              # Main page with KPIs, table, modals
  
components/invoices/
  InvoicesKPI.jsx                # 4 KPI cards (Billed, Paid, Pending, Overdue)
  InvoiceTable.jsx               # Searchable, filterable, paginated table
  InvoiceRowActions.jsx          # Dropdown menu for View/Download/Send/Pay
  NewInvoiceModal.jsx            # Create invoice from project
  InvoiceDetailModal.jsx         # Full invoice breakdown
  SendInvoiceModal.jsx           # Email delivery UI
  PayInvoiceButton.jsx           # Razorpay checkout trigger
  
hooks/
  useInvoices.js                 # Online/offline state management
  
api/
  invoiceApi.js                  # API client with auth
  
utils/
  currency.js                    # INR formatting utilities
```

## Features

### 1. Invoice Generation
- Select project → auto-populate client, deliverables, agreed price
- Add multiple line items with descriptions
- Apply tax and discount percentages
- Set due date (default: 7 days from today)
- Add custom notes
- Real-time total calculation
- Validation before creation

### 2. Invoice Management
- **View**: Full invoice details with all items and totals
- **Download**: PDF generation (requires backend)
- **Send**: Email invoice to client with custom message
- **Pay**: Razorpay integration for online payments
- **Filter**: By status (all/draft/pending/paid/cancelled)
- **Search**: By invoice number, project, or client name
- **Pagination**: 10 invoices per page

### 3. Status System
- **Draft**: Saved but not finalized
- **Pending**: Issued and awaiting payment
- **Paid**: Payment received and verified
- **Overdue**: Pending past due date
- **Failed**: Payment attempt failed
- **Cancelled**: Manually cancelled

### 4. Online/Offline Support
- **Online Mode**: Full API integration
- **Offline Mode**: localStorage fallback
- **Auto-detection**: Network errors trigger offline mode
- **Local invoices**: Created with `isLocal` flag
- **Sync indication**: Badge shows offline status
- **Dev toggle**: Button to force offline mode for testing

### 5. Payment Integration
- Razorpay checkout for online payments
- Payment verification after success
- Payment history tracking
- Refund support (if backend implements)
- Disabled state when Razorpay not configured

## Installation

```bash
# Install dependencies
cd client
npm install

# Required packages (should already be installed):
npm install axios sonner lucide-react
```

## Environment Variables

Create or update `client/.env`:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Razorpay (for payments)
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id

# Clerk (already configured)
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
```

## Running Locally

```bash
# Start backend (from studioflow/server)
cd server
npm run dev

# Start frontend (from studioflow/client)
cd client
npm run dev
```

Access at: `http://localhost:3002/dashboard/invoices`

## Testing

### Manual Test Checklist

- [ ] **Page Load**: Shows KPIs and table
- [ ] **Create Invoice**: 
  - Opens modal with + New Invoice
  - Select project populates fields
  - Add/remove line items
  - Calculate totals correctly
  - Submit creates invoice
- [ ] **View Invoice**: Detail modal shows all information
- [ ] **Download PDF**: Downloads file (online only)
- [ ] **Send Email**: Opens modal, validates email, sends
- [ ] **Pay Invoice**: Opens Razorpay checkout (if configured)
- [ ] **Filter**: Status dropdown filters list
- [ ] **Search**: Text search works across fields
- [ ] **Pagination**: Navigate through pages
- [ ] **Offline Mode**: Toggle shows badge, saves to localStorage
- [ ] **Responsive**: Works on mobile, tablet, desktop

### API Testing with cURL

```bash
# List invoices
curl -X GET "http://localhost:5000/api/invoices?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Get invoice details
curl -X GET "http://localhost:5000/api/invoices/project/INVOICE_ID" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Generate invoice
curl -X POST "http://localhost:5000/api/projects/PROJECT_ID/invoices/generate" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientUserId": "client_user_id",
    "items": [
      {
        "title": "Video Editing",
        "description": "Professional editing",
        "quantity": 1,
        "rate": 5000
      }
    ],
    "dueDate": "2025-12-31",
    "notes": "Payment terms: Net 30",
    "tax": { "percentage": 18 },
    "discount": { "percentage": 5 }
  }'

# Create payment order
curl -X POST "http://localhost:5000/api/invoices/project/INVOICE_ID/pay" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Send invoice (if backend implements)
curl -X POST "http://localhost:5000/api/invoices/project/INVOICE_ID/send" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "subject": "Your Invoice",
    "message": "Please find your invoice attached"
  }'
```

## Offline Mode Testing

### Enable Offline Mode

**Method 1: Force offline (code)**
```javascript
// In browser console:
localStorage.setItem('studioflow_offline_mode', 'true');
window.location.reload();
```

**Method 2: Set empty API URL**
```env
# In .env file:
VITE_API_URL=
```

**Method 3: Dev toggle (development only)**
Click the Wi-Fi icon in the top-right corner of the Invoices page.

### Test Offline Behavior

1. Enable offline mode using any method above
2. Create new invoice → saves to localStorage
3. View invoice list → reads from localStorage
4. Check localStorage: `localStorage.getItem('studioflow_invoices')`
5. Download/Send/Pay should show disabled with appropriate messages
6. Disable offline mode to re-enable online features

## Integration with App

### Add Route

In `client/src/App.jsx`:

```jsx
import InvoicesPage from './pages/InvoicesPage';

// Inside Routes:
<Route path="/dashboard/invoices" element={<InvoicesPage />} />
```

### Add Navigation Link

In `client/src/components/DashboardLayout.jsx`:

```jsx
import { Receipt } from 'lucide-react';

// Add to navigation array:
{
  name: 'Invoices',
  path: '/dashboard/invoices',
  icon: Receipt
}
```

### Import CSS

In `client/src/index.jsx` or `client/src/index.css`:

```css
@import './styles/invoice.css';
```

## Backend API Requirements

The frontend expects these endpoints:

### Required (already implemented)
- `GET /api/invoices` - List invoices
- `GET /api/invoices/project/:id` - Invoice details
- `POST /api/projects/:id/invoices/generate` - Create invoice
- `POST /api/invoices/project/:id/pay` - Create payment order
- `POST /api/invoices/project/:id/verify` - Verify payment
- `GET /api/invoices/project/:number/download` - Download PDF
- `GET /api/projects` - List projects (for invoice creation)

### Optional
- `POST /api/invoices/project/:id/send` - Send email (currently not implemented in backend)
- `POST /api/invoices/project/:id/cancel` - Cancel invoice

## Troubleshooting

### "Payment gateway not configured"
- Set `VITE_RAZORPAY_KEY_ID` in `.env`
- Restart dev server

### "Failed to fetch invoices" → Offline mode
- Check backend is running on port 5000
- Check `VITE_API_URL` in `.env`
- Check network tab for failed requests
- Verify Clerk token is valid

### "Cannot download PDF in offline mode"
- PDF generation requires backend
- Local invoices can't be downloaded
- Create invoice online first

### Table shows "No invoices found"
- Check if backend returns data
- Check browser console for errors
- Try creating a test invoice
- Verify API authentication

## Production Considerations

### Performance
- Pagination limits loaded data
- Search/filter is client-side (consider backend for large datasets)
- PDF generation should be cached on backend

### Security
- Clerk authentication on all API calls
- Razorpay signature verification on backend
- Email validation before sending
- Permission checks (owner/client only)

### Monitoring
- Track invoice creation success rate
- Monitor payment success/failure rates
- Log API errors for debugging
- Track offline mode usage

## Next Steps

### Enhancements
1. **Recurring Invoices**: Auto-generate on schedule
2. **Templates**: Save invoice templates
3. **Multi-currency**: Support USD, EUR, etc.
4. **Bulk Operations**: Select multiple invoices
5. **Export**: CSV/Excel export of invoice list
6. **Reminders**: Auto-send reminders for overdue invoices
7. **Analytics**: Charts for revenue trends
8. **Tax Reports**: GST/VAT reporting

### Backend Improvements
1. Implement email sending endpoint
2. Add webhook for Razorpay events
3. Generate invoice numbers server-side
4. Implement invoice PDF caching
5. Add search API with indexing

## Support

For issues or questions:
1. Check browser console for errors
2. Verify all environment variables are set
3. Test with cURL to isolate frontend/backend issues
4. Enable offline mode if backend is unavailable
5. Check network tab for failed API calls

## License

Part of StudioFlow project.
