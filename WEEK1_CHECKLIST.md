# Week 1 — Core Infrastructure & Auth

## ✅ Completed

### Backend Infrastructure
- [x] Express server skeleton (`studioflow/server/index.js`)
- [x] MongoDB connection with Atlas support (`server/src/config/db.js`)
  - Connection pooling
  - Error handling and reconnection logic
  - State tracking
- [x] Enhanced User model with validation and indexes
- [x] Improved auth controller with:
  - Password strength validation (8+ chars, uppercase, lowercase, number)
  - Bcrypt with 12 salt rounds
  - JWT token generation (7-day expiry)
  - Last login tracking
  - Account active status checking

### Auth System
- [x] Clerk integration on frontend (ClerkProvider in `index.jsx`)
- [x] Clerk JWKS middleware (`server/src/middlewares/verifyClerkJWKS.js`)
- [x] Protected API route (`/api/protected`)
- [x] Custom JWT auth with bcrypt
- [x] Auth routes (`/api/auth/register`, `/api/auth/login`)

### Frontend
- [x] ClerkProvider wrapper
- [x] SignInButton integration
- [x] Protected Dashboard component with API test
- [x] Modern Landing page with:
  - Hero section
  - Features showcase
  - Pricing tiers
  - FAQ section
- [x] shadcn/ui components (Button, Card)
- [x] Tailwind CSS with dark theme

## 📋 Setup Instructions

### 1. Configure Environment Variables

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

Fill in your actual values:

```env
# MongoDB Atlas
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/studioflow

# JWT Secret (generate using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-32-character-minimum-secret

# Clerk (from https://dashboard.clerk.com)
CLERK_JWKS_URL=https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json
CLERK_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Razorpay (from https://dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

# Frontend
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_API_URL=http://localhost:5000/api
```

### 2. Install Dependencies

**Server:**
```bash
cd studioflow/server
npm install
```

**Client:**
```bash
cd studioflow/client
npm install
```

### 3. Start Development Servers

**Backend (Terminal 1):**
```bash
cd studioflow/server
npm run dev
# Server runs on http://localhost:5000
```

**Frontend (Terminal 2):**
```bash
cd studioflow/client
npm run dev
# Client runs on http://localhost:3000
```

### 4. Test the Auth Flow

#### Option A: Test with Clerk (Recommended for Week 1)

1. Visit `http://localhost:3000`
2. Click "Sign in" button
3. Complete Clerk authentication
4. You'll be redirected to Dashboard
5. Click "Call Protected API" button
6. Verify response shows: `{ok: true, userId: "...", claims: {...}}`
7. Check backend console for logged `req.clerkToken` claims

#### Option B: Test Custom JWT Auth

Use Postman or curl:

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test1234",
    "role": "editor"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

## 🎯 Week 1 Acceptance Criteria

- [x] MongoDB Atlas cluster configured
- [x] `MONGO_URI` in `.env`
- [x] Clerk configured on frontend and backend
- [x] JWKS middleware validates Clerk tokens
- [x] `/api/protected` endpoint returns user data
- [x] Frontend shows "Call Protected API" button
- [x] Clicking button returns `{ok:true, userId, claims}`
- [x] Backend logs `req.clerkToken` claims

## 📦 Dependencies Installed

### Backend
- ✅ `express` - Web framework
- ✅ `mongoose` - MongoDB ODM
- ✅ `dotenv` - Environment variables
- ✅ `cors` - CORS middleware
- ✅ `jsonwebtoken` - JWT creation/verification
- ✅ `bcrypt` - Password hashing
- ✅ `jwks-rsa` - Clerk JWKS verification
- ✅ `cookies` - Cookie parsing for Clerk

### Frontend
- ✅ `@clerk/clerk-react` - Clerk authentication
- ✅ `react-router-dom` - Routing
- ✅ `tailwindcss` - Styling
- ✅ `lucide-react` - Icons
- ✅ `class-variance-authority` - Component variants
- ✅ `clsx` + `tailwind-merge` - Class utilities

## 🔧 Additional Features Implemented

Beyond Week 1 requirements:

- Enhanced database configuration with connection pooling
- User model with comprehensive validation
- Password strength requirements
- Account status management (isActive field)
- Last login tracking
- Modern landing page with pricing
- shadcn/ui component library
- Dark theme support
- Improved error handling throughout

## 🚀 Next Steps (Week 2+)

- [ ] Add input validation library (Zod/Joi)
- [ ] Implement react-hook-form for frontend forms
- [ ] Add password reset flow
- [ ] Implement refresh tokens
- [ ] Add rate limiting
- [ ] Set up logging (Winston/Pino)
- [ ] Add API documentation (Swagger)
- [ ] Implement role-based access control (RBAC)

## 📝 Notes

- **Clerk vs Custom JWT**: Both systems are implemented. Use Clerk for production (social logins, email flows). Use custom JWT for learning and custom requirements.
- **Security**: All passwords are hashed with bcrypt (12 rounds). JWT secrets should be 32+ characters.
- **CORS**: Configured to allow localhost origins. Update for production.
- **MongoDB**: Using MongoDB Atlas is recommended. Local MongoDB works too.

## 🐛 Troubleshooting

**Issue: "Clerk key missing"**
- Ensure `VITE_CLERK_PUBLISHABLE_KEY` is in `.env`
- Restart the dev server after adding

**Issue: "MongoDB connection error"**
- Verify `MONGO_URI` is correct
- Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for development)
- Ensure database user has read/write permissions

**Issue: "CORS error calling API"**
- Verify `CLERK_ALLOWED_ORIGINS` includes your frontend URL
- Check that CORS is configured in `server/index.js`

**Issue: Protected API returns 401**
- Ensure you're signed in with Clerk
- Check that Clerk session token is being sent
- Verify `CLERK_JWKS_URL` is correct
- Check backend logs for specific error
