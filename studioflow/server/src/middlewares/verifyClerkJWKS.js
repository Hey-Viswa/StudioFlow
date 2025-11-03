// server/src/middlewares/verifyClerkJWKS.js
import { verifyToken } from '@clerk/backend';
import path from 'node:path';
import dotenv from 'dotenv';

// Ensure env vars are loaded when this module is imported directly
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export default async function verifyClerk(req, res, next) {
    try {
        // Get the session token from Authorization header or cookies
        let sessionToken = null;
        
        // Check Authorization header first (Bearer token)
        const authHeader = req.headers.authorization;
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
            console.log('Verifying Clerk token; length:', sessionToken.length);
        }

        // Verify the token using Clerk's verifyToken function
        // This automatically fetches JWKS and verifies the signature
        const payload = await verifyToken(sessionToken, {
            secretKey: secretKey,
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
        
        if (process.env.NODE_ENV !== 'production') {
            console.log('Token verified successfully for user:', req.userId);
        }

        return next();
    } catch (err) {
        console.error('Clerk token verification failed:', err.message);
        if (process.env.NODE_ENV !== 'production') {
            console.error('Full error:', err);
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Named exports for different import styles
export const verifyClerkJWKS = verifyClerk;
export const verifyClerkToken = verifyClerk;
