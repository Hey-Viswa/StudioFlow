import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/auth.js';
import protectedRoute from './src/routes/protected.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load shared environment variables from the repository root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const allowedOrigins = (process.env.CLERK_ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

// CORS configuration - allow localhost and Codespaces URLs
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        // Allow configured origins
        if (allowedOrigins.includes(origin)) return callback(null, true);
        
        // Allow any localhost or Codespaces URL in development
        if (origin.includes('localhost') || origin.includes('github.dev') || origin.includes('app.github.dev')) {
            return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());

// Health check route - test if the server is alive

app.get('/api/health', (req, res) => {
    res.json({ok: true, time: new Date().toISOString(), status: 'Server is running'});
});

// Auth routes
app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoute);

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
