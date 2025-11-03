# Razorpay Payment Integration - Setup Complete! 🎉

## 🔑 Get Your Razorpay API Keys

1. Go to: https://dashboard.razorpay.com/app/keys
2. Copy your **Key ID** and **Key Secret**
3. Add them to your `.env` file

## 📝 Environment Variables

Add these to `/mnt/d/School/StudioFlow/studioflow/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
```

## 🌐 All Page Links (For Razorpay Dashboard)

Use these URLs when setting up your Razorpay account:

### Main Website
**Website URL**: `https://studio-flow-alpha.vercel.app`

### Policy Pages (Required by Razorpay)
1. **Privacy Policy**: `https://studio-flow-alpha.vercel.app/privacy-policy`
2. **Terms & Conditions**: `https://studio-flow-alpha.vercel.app/terms-conditions`
3. **Cancellation & Refund**: `https://studio-flow-alpha.vercel.app/cancellation-refund`
4. **Shipping & Delivery**: `https://studio-flow-alpha.vercel.app/shipping-delivery`
5. **Contact Us**: `https://studio-flow-alpha.vercel.app/contact`

### Pricing Page
**Pricing**: `https://studio-flow-alpha.vercel.app/pricing`

## 💰 Pricing Plans

| Plan | Price | Features |
|------|-------|----------|
| **Starter** | ₹0/forever | • Up to 2 active projects<br>• Project management<br>• Basic invoicing<br>• Email support |
| **Pro** | ₹10/month | • Unlimited projects<br>• Client collaboration<br>• Branded invoices<br>• Priority support |
| **Studio** | ₹25/month | • Everything in Pro<br>• Team permissions<br>• Advanced reviews<br>• Dedicated support |

## 📡 API Endpoints

All endpoints are at: `http://localhost:5000/api/payment` (or your production URL)

- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify-payment` - Verify payment signature
- `GET /api/payment/subscription-status` - Get user subscription
- `POST /api/payment/cancel-subscription` - Cancel subscription

## ✅ Quick Start

1. **Add API Keys to .env**:
   ```bash
   echo "RAZORPAY_KEY_ID=your_key_id" >> .env
   echo "RAZORPAY_KEY_SECRET=your_key_secret" >> .env
   ```

2. **Start the server**:
   ```bash
   cd /mnt/d/School/StudioFlow/studioflow/server
   npm start
   ```

3. **Start the client**:
   ```bash
   cd /mnt/d/School/StudioFlow/studioflow/client
   npm start
   ```

4. **Test payment**:
   - Visit: http://localhost:3000/pricing
   - Click "Choose Pro" or "Choose Studio"
   - Complete payment with test credentials

## 🧪 Test Cards

| Card Number | Type | Result |
|-------------|------|--------|
| 4111 1111 1111 1111 | Visa | Success |
| 5555 5555 5555 4444 | Mastercard | Success |
| Any future CVV & expiry | - | Success |

## 🔒 Security Checklist

- ✅ Payment signature verification enabled
- ✅ User authentication required
- ✅ Razorpay SDK installed
- ✅ Environment variables secured
- ✅ HTTPS required in production

## 📞 Support Emails

- Support: support@studioflow.com
- Sales: sales@studioflow.com
- Billing: billing@studioflow.com

---

**Everything is set up! Add your Razorpay keys and start testing! 🚀**
