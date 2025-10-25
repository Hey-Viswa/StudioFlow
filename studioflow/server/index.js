import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/auth.js';
import protectedRoute from './src/routes/protected.js';

dotenv.config();

const app = express();
const allowedOrigins = (process.env.CLERK_ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
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
