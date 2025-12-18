// server/src/middlewares/verifyClerkJWKS.js
import { verifyToken, createClerkClient } from '@clerk/backend';
import path from 'node:path';
import dotenv from 'dotenv';

// Ensure env vars are loaded when this module is imported directly
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

// Initialize Clerk client
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// In-memory cache for user details to reduce Clerk API calls
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

function getCachedUser(userId) {
    const cached = userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

function setCachedUser(userId, userData) {
    userCache.set(userId, {
        data: userData,
        timestamp: Date.now()
    });
}

// Cleanup expired cache entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [userId, cached] of userCache.entries()) {
        if (now - cached.timestamp >= CACHE_TTL) {
            userCache.delete(userId);
        }
    }
}, 10 * 60 * 1000);

export default async function verifyClerk(req, res, next) {
    try {
        // Get the session token from Authorization header or cookies
        let sessionToken = null;

        // Check Authorization header first (Bearer token)
        const authHeader = req.headers.authorization;
        if (process.env.NODE_ENV !== 'production') {
             console.log('🔍 VerifyClerk: Auth Header:', authHeader ? 'Present' : 'Missing');
        }

        if (authHeader && authHeader.startsWith('Bearer ')) {
            sessionToken = authHeader.substring(7);
        }

        // If no Bearer token, check cookies for __session
        if (!sessionToken) {
            const cookieHeader = req.headers.cookie;
            if (cookieHeader) {
                const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                    const [key, value] = cookie.trim().split('=');
                    acc[key] = value;
                    return acc;
                }, {});
                sessionToken = cookies.__session;
            }
        }

        if (!sessionToken) {
            console.log('No session token found in Authorization header or cookies');
            return res.status(401).json({ error: 'Not signed in' });
        }

        const secretKey = process.env.CLERK_SECRET_KEY;
        if (!secretKey) {
            console.error('CLERK_SECRET_KEY is not defined.');
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        if (process.env.NODE_ENV !== 'production') {
            console.log('Verifying Clerk token...');
        }

        // Verify the token using Clerk's verifyToken function with small clock skew tolerance
        // to avoid false negatives when server/client clocks drift by a few seconds.
        const payload = await verifyToken(sessionToken, {
            secretKey: secretKey,
            clockSkewInMs: 60000, // allow up to 60s skew
            // Optional: Add audience if configured in Clerk
            // audience: process.env.CLERK_JWT_AUDIENCE
        });

        if (!payload || !payload.sub) {
            console.log('Token verification failed: no valid payload or subject (userId)');
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Clerk's default JWT payload includes:
        // - sub: user ID
        // - iss: issuer (Clerk)
        // - exp: expiration time
        // - iat: issued at time
        req.clerkPayload = payload;
        req.userId = payload.sub; // Clerk uses 'sub' claim for userId

        // Check cache first before making API call to Clerk
        const cachedUserData = getCachedUser(payload.sub);
        if (cachedUserData) {
            req.userEmail = cachedUserData.email;
            req.userName = cachedUserData.name;
            if (process.env.NODE_ENV !== 'production') {
                console.log('✅ User data retrieved from cache:', req.userId);
            }
        } else {
            // Fetch user details from Clerk API only if not in cache
            try {
                const user = await clerkClient.users.getUser(payload.sub);
                const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
                const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || '';

                // Cache the user data
                setCachedUser(payload.sub, { email: userEmail, name: userName });

                req.userEmail = userEmail;
                req.userName = userName;

                if (process.env.NODE_ENV !== 'production') {
                    console.log('✅ User data fetched from Clerk API and cached:', req.userId);
                }
            } catch (userError) {
                console.warn('Could not fetch user details from Clerk:', userError.message);
                // Continue anyway, email/name will be empty
                req.userEmail = '';
                req.userName = '';
            }
        }

        // Fetch User from MongoDB to get Role
        try {
            // Dynamic import to avoid circular dependencies if any
            const { default: User } = await import('../models/User.js');
            const dbUser = await User.findOne({ clerkUserId: payload.sub });

            if (dbUser) {
                req.user = dbUser;
                req.userRole = dbUser.role;
            } else {
                // JIT Provisioning: Create user if not exists or Link if e-mail exists
                console.log('✨ JIT Provisioning: Checking for user creation/linking', payload.sub);
                console.log(`   Email: ${req.userEmail || 'N/A'}, Name: ${req.userName || 'N/A'}`);

                try {
                    // Check if user exists by email first (to avoid duplicate key error)
                    let existingUserByEmail = null;
                    if (req.userEmail) {
                        console.log(`   Checking for existing user by email: ${req.userEmail}`);
                        existingUserByEmail = await User.findOne({ email: req.userEmail });
                    }

                    if (existingUserByEmail) {
                        console.log(`ℹ️ User found by email (${req.userEmail}). Linking Clerk ID ${payload.sub} to existing user ${existingUserByEmail._id}`);
                        // Update the existing user with the new Clerk ID
                        existingUserByEmail.clerkUserId = payload.sub;
                        // Also ensure name is up to date if missing
                        if (!existingUserByEmail.name && req.userName) {
                            existingUserByEmail.name = req.userName;
                        }
                        await existingUserByEmail.save();
                        console.log(`✅ Clerk ID linked successfully to existing user`);

                        req.user = existingUserByEmail;
                        req.userRole = existingUserByEmail.role;
                    } else {
                        // Create new user
                        const newUser = await User.create({
                            clerkUserId: payload.sub,
                            email: req.userEmail || '',
                            name: req.userName || 'New User',
                            role: 'owner', // Default to owner so they can create projects
                            subscription: {
                                plan: 'free',
                                status: 'active'
                            }
                        });

                        console.log('✅ User created successfully:', newUser._id);
                        req.user = newUser;
                        req.userRole = newUser.role;
                    }
                } catch (createError) {
                    // Handle Race Condition: Duplicate Key (E11000)
                    // If between findOne() and create(), another request created the user (or if findOne missed it for some reason)
                    if (createError.code === 11000 && createError.keyPattern?.email) {
                        console.warn(`⚠️ Race condition detected: Email ${req.userEmail} already exists. Attempting to link...`);
                        try {
                            const raceUser = await User.findOne({ email: req.userEmail });
                            if (raceUser) {
                                raceUser.clerkUserId = payload.sub;
                                if (!raceUser.name && req.userName) raceUser.name = req.userName;
                                await raceUser.save();
                                console.log(`✅ Recovered from duplicate error: Linked Clerk ID to ${raceUser._id}`);
                                req.user = raceUser;
                                req.userRole = raceUser.role;
                                // Exit early since we handled it
                            } else {
                                // Weird edge case: duplicate key error but can't find it??
                                throw createError;
                            }
                        } catch (linkError) {
                            console.error('❌ Failed to link user after duplicate detection:', linkError);
                            req.user = null;
                            req.userRole = 'guest';
                        }
                    } else {
                        console.error('❌ Failed to provision user during JIT:', createError);
                        req.user = null;
                        req.userRole = 'guest';
                    }
                }
            }
        } catch (dbError) {
            console.error('Error fetching user from DB:', dbError);
            req.user = null;
            req.userRole = 'guest';
        }

        return next();
    } catch (err) {
        console.error('Clerk token verification failed:', err.message);
        if (process.env.NODE_ENV !== 'production') {
            console.error('Full error:', err);
        }

        // Provide more specific error messaging for expired tokens
        if (err?.reason === 'token-expired') {
            return res.status(401).json({ error: 'Token expired. Please sign in again.' });
        }

        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Named exports for different import styles
export const verifyClerkJWKS = verifyClerk;
export const verifyClerkToken = verifyClerk;
