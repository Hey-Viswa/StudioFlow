import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/auth.js';
import protectedRoute from './src/routes/protected.js';
import projectRoutes from './src/routes/projects.js';
import inviteRoutes from './src/routes/invites.js';
import paymentRoutes from './src/routes/payment.js';
import taskCommentRoutes from './src/routes/taskComment.js';
import trashRoutes from './src/routes/trash.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const allowedOrigins = (process.env.CLERK_ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin && process.env.NODE_ENV === 'production') {
            return callback(new Error('Origin header required'));
        }
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (process.env.NODE_ENV !== 'production') {
            if (!origin || origin.includes('localhost') || origin.includes('github.dev') || origin.includes('app.github.dev')) {
                return callback(null, true);
            }
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ok: true, time: new Date().toISOString(), status: 'Server is running'});
});

// Debug endpoint to test token
app.get('/api/test-auth', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided', headers: req.headers });
        }
        
        // Try to decode without verification to see what's in the token
        const parts = token.split('.');
        if (parts.length !== 3) {
            return res.status(401).json({ error: 'Invalid token format' });
        }
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        res.json({ 
            message: 'Token received', 
            tokenLength: token.length,
            payload: payload 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use('/api/protected', protectedRoute);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', taskCommentRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/trash', trashRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try{
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Error starting server:', error); 
    }
}

startServer();
