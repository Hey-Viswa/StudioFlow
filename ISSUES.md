# Known Issues

## 🔴 Critical Issues

### 1. Clerk Authentication Buttons Not Functional
**Status:** To be fixed  
**Priority:** High  
**Description:**  
Sign In and Get Started buttons on the landing page are not opening the Clerk authentication modals.

**Location:** `studioflow/client/src/pages/Landing.jsx`

**Steps to Reproduce:**
1. Navigate to landing page (http://localhost:5173)
2. Click "Sign in" or "Get Started" buttons
3. Modal does not open

**Expected Behavior:**  
Clerk authentication modal should open when clicking Sign In/Get Started buttons and redirect to `/dashboard` after successful authentication.

**Technical Notes:**
- ClerkProvider configured with `afterSignInUrl="/dashboard"` and `afterSignUpUrl="/dashboard"`
- SignInButton and SignUpButton components from `@clerk/clerk-react` are implemented
- Issue may be related to Clerk initialization or modal configuration

---

### 2. MongoDB Authentication Failure
**Status:** To be fixed  
**Priority:** High  
**Description:**  
Backend server fails to connect to MongoDB Atlas with authentication error.

**Location:** `studioflow/server/src/config/db.js`

**Error Message:**
```
❌ MongoDB connection error: bad auth : authentication failed
MongoServerError: bad auth : authentication failed
code: 8000,
codeName: 'AtlasError'
```

**Steps to Reproduce:**
1. Start backend server: `npm run dev` (from studioflow/server)
2. Server fails to start due to MongoDB connection error

**Possible Causes:**
- Incorrect MongoDB credentials in `.env` file
- MongoDB Atlas IP whitelist restrictions
- Incorrect connection string format
- User permissions not properly configured in Atlas

**To Fix:**
1. Verify MongoDB Atlas credentials
2. Check IP whitelist in MongoDB Atlas (add current IP or allow all: 0.0.0.0/0)
3. Ensure database user has proper read/write permissions
4. Verify connection string format in `.env`

**Environment Variables Required:**
```
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

---

## 📝 Notes for Future Development

### Authentication Flow
- Frontend is using Clerk for authentication
- Backend expects JWT tokens from Clerk
- Clerk webhook integration may be needed for user sync

### Database Setup
- User model includes: username, email, password (hashed), projects array
- Indexes configured on email field for performance
- Connected to MongoDB Atlas (cloud database)

### Environment Setup
Both client and server require proper `.env` configuration:
- Client: `VITE_CLERK_PUBLISHABLE_KEY`
- Server: `MONGO_URI`, `JWT_SECRET`, `CLERK_SECRET_KEY`, etc.

---

**Last Updated:** 2025-10-29
