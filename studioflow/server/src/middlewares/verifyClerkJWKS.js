// server/src/middlewares/verifyClerkJWKS.js
import Cookies from 'cookies';
import { createClerkClient } from '@clerk/backend';
import path from 'node:path';
import dotenv from 'dotenv';

// Ensure env vars are loaded when this module is imported directly
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

let clerkClient;

export default async function verifyClerk(req, res, next) {
    const cookies = new Cookies(req, res);
    const sessionToken = cookies.get('__session');

    if (!sessionToken) {
        return res.status(401).json({ error: 'Not signed in' });
    }

    try {
        const secretKey = process.env.CLERK_SECRET_KEY;
        if (!secretKey) {
            console.error('CLERK_SECRET_KEY is not defined.');
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        if (!clerkClient) {
            clerkClient = createClerkClient({ secretKey });
        }

        if (process.env.NODE_ENV !== 'production') {
            console.log('Verifying Clerk session token via cookie; length:', sessionToken.length);
        }
        const { session } = await clerkClient.sessions.verifySession({ sessionToken });
        if (!session) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        req.clerkToken = session;
        req.userId = session.userId;

        return next();
    } catch (err) {
        console.error('Clerk session verification failed:', err);
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Named exports for different import styles
export const verifyClerkJWKS = verifyClerk;
export const verifyClerkToken = verifyClerk;
