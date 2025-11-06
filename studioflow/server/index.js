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
import clerkWebhookRoutes from './src/routes/clerkWebhook.js';
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './src/config/sentry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const httpServer = createServer(app);

// Initialize Sentry FIRST (before any other middleware)
initSentry(app);

// Sentry request tracking (after Sentry init, before routes)
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

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
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/clerk', clerkWebhookRoutes); // Clerk webhooks

// Sentry error handler (MUST be after routes, before other error handlers)
app.use(sentryErrorHandler());

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
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`⚡ Socket.IO is ready for real-time updates`);
        });
    } catch (error) {
        console.error('Error starting server:', error); 
    }
}

startServer();
