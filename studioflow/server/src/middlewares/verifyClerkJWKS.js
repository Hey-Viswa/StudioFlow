// server/src/middlewares/verifyClerkJWKS.js
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import Cookies from 'cookies';

const JWKS_URI = process.env.CLERK_JWKS_URL || 'https://api.clerk.com/v1/jwks';
const PERMITTED_ORIGINS = (process.env.CLERK_ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

const client = jwksClient({
    jwksUri: JWKS_URI,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 10 * 60 * 1000,
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            return callback(err);
        }
        const pubKey = key.getPublicKey();
        callback(null, pubKey);
    });
}

export default function verifyClerk(req, res, next) {
    const cookies = new Cookies(req, res);
    const tokenCookie = cookies.get('__session');
    const authHeader = req.headers.authorization;
    const token = tokenCookie || (authHeader && authHeader.replace(/^Bearer\s+/i, ''));

    if (!token) {
        return res.status(401).json({ error: 'Not signed in' });
    }

    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) {
            console.error('JWT verify error:', err);
            return res.status(401).json({ error: 'Invalid token' });
        }

        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < now) {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (decoded.nbf && decoded.nbf > now) {
            return res.status(401).json({ error: 'Token not yet valid' });
        }
        if (decoded.azp && !PERMITTED_ORIGINS.includes(decoded.azp)) {
            return res.status(401).json({ error: 'Invalid azp claim' });
        }
        if (decoded.sts && decoded.sts === 'pending') {
            return res.status(403).json({ error: 'Organization membership pending' });
        }

        req.clerkToken = decoded;
        req.userId = decoded.sub || decoded.user_id;
        next();
    });
}
