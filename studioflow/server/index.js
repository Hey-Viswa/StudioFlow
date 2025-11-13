import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
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
import subscriptionRoutes from './src/routes/subscriptions.js';
import invoiceRoutes from './src/routes/invoices.js';
import contactRoutes from './src/routes/contact.js';
import clerkWebhookRoutes from './src/routes/clerkWebhook.js';
import { startSubscriptionChecker } from './src/jobs/subscriptionChecker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const httpServer = createServer(app);

// CRITICAL: Health check MUST be first - before any middleware
// Railway needs instant response for healthchecks
app.get('/api/health', (req, res) => {
    res.status(200).json({ ok: true, status: 'alive' });
});

// Setup Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin
      if (!origin) return callback(null, true);
      
      const allowedOrigins = (process.env.CLERK_ALLOWED_ORIGINS || 'http://localhost:5173')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      
      if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL);
      }
      
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.includes('.vercel.app')) return callback(null, true);
      if (origin.includes('localhost')) return callback(null, true);
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

const allowedOrigins = (process.env.CLERK_ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

// Add Vercel domain to allowed origins
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin)) return callback(null, true);
        
        // Allow Vercel preview deployments
        if (origin.includes('.vercel.app')) {
            return callback(null, true);
        }
        
        if (process.env.NODE_ENV !== 'production') {
            if (origin.includes('localhost') || origin.includes('github.dev') || origin.includes('app.github.dev')) {
                return callback(null, true);
            }
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());

// Readiness check (checks database connectivity)
app.get('/api/ready', async (req, res) => {
    try {
        const mongoose = (await import('mongoose')).default;
        const dbStatus = mongoose.connection.readyState;
        
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        const isReady = dbStatus === 1;
        
        if (isReady) {
            res.status(200).json({
                ok: true,
                status: 'ready',
                timestamp: new Date().toISOString(),
                database: 'connected',
                uptime: process.uptime()
            });
        } else {
            res.status(503).json({
                ok: false,
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                database: dbStatus === 0 ? 'disconnected' : dbStatus === 2 ? 'connecting' : 'disconnecting',
                uptime: process.uptime()
            });
        }
    } catch (error) {
        res.status(503).json({
            ok: false,
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
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
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/clerk', clerkWebhookRoutes); // Clerk webhooks

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // Join project room
  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
    console.log(`👤 Socket ${socket.id} joined project-${projectId}`);
  });

  // Leave project room
  socket.on('leave-project', (projectId) => {
    socket.leave(`project-${projectId}`);
    console.log(`👋 Socket ${socket.id} left project-${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try{
        await connectDB();
        
        // Check Razorpay environment variables
        console.log('\n=== Razorpay Configuration Check ===');
        console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.substring(0, 15)}...` : '❌ MISSING');
        console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'Set ✓' : '❌ MISSING');
        console.log('RAZORPAY_PRO_PLAN_ID:', process.env.RAZORPAY_PRO_PLAN_ID || '❌ MISSING (using fallback: plan_RcTPS7s2l9ku5N)');
        console.log('RAZORPAY_STUDIO_PLAN_ID:', process.env.RAZORPAY_STUDIO_PLAN_ID || '❌ MISSING (using fallback: plan_RcTPuLbBYG9E8N)');
        console.log('===================================\n');
        
        // Start subscription checker for automatic downgrades
        startSubscriptionChecker();
        
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`⚡ Socket.IO is ready for real-time updates`);
        });
    } catch (error) {
        console.error('Error starting server:', error); 
    }
}

startServer();
