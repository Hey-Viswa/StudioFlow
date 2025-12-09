import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisClient, isRedisAvailable } from './redis.js';
import { RealtimeService } from '../services/RealtimeService.js';

let io;
let realtimeService;

/**
 * Initialize Socket.IO with the HTTP server and Redis Adapter
 * @param {import('http').Server} httpServer - The HTTP server instance
 * @returns {Promise<Server>} The Socket.IO server instance
 */
export const initializeSocket = async (httpServer) => {
  let adapterConfig = {};

  // Check if Redis is actually available before trying to use the adapter
  const redisConnected = await isRedisAvailable();

  if (redisConnected) {
    console.log('✅ Redis is available. Using Redis Adapter for Socket.IO.');
    // Create Redis clients for Pub/Sub adapter
    const pubClient = createRedisClient();
    const subClient = pubClient.duplicate();

    // Handle Redis connection errors gracefully
    const handleRedisError = (err) => {
      console.warn('⚠️ Redis Adapter Error (Realtime features may be limited):', err.message);
    };

    pubClient.on('error', handleRedisError);
    subClient.on('error', handleRedisError);

    adapterConfig = {
      adapter: createAdapter(pubClient, subClient)
    };

    // Dedicated Subscriber for Application Events (KPIs, etc)
    const appSubscriber = pubClient.duplicate();
    // Note: ioredis connects automatically by default. 
    // Calling connect() manually on an auto-connecting client causes "Redis is already connecting" error.
    
    // Wait for connection before subscribing to avoid race conditions
    appSubscriber.on('ready', async () => {
      try {
        await appSubscriber.subscribe('kpi:updates', (err, count) => {
          if (err) console.error('❌ Failed to subscribe to kpi:updates:', err);
          else console.log(`🎧 Listening to kpi:updates on Redis (count: ${count})`);
        });
      } catch (subErr) {
        console.error('❌ Subscription error:', subErr);
      }
    });

    appSubscriber.on('message', (channel, message) => {
      if (channel !== 'kpi:updates') return;
      
      try {
        const data = JSON.parse(message);
        console.log('📡 Received KPI Update via Redis:', data.invoiceId);

        if (io) {
          // 1. Notify Owner (Personal KPI)
          if (data.ownerId) {
            io.to(`user:${data.ownerId}`).emit('kpi-refresh', {
              projectId: data.projectId,
              type: 'revenue',
              amount: data.amount
            });
          }

          // 2. Notify Client (Personal Spending)
          if (data.clientId) {
            io.to(`user:${data.clientId}`).emit('kpi-refresh', {
              projectId: data.projectId,
              type: 'expense',
              amount: data.amount
            });
          }

          // 3. Notify Project Room (Invoice Status Update)
          if (data.projectId) {
            io.to(`project-${data.projectId}`).emit('invoice-status-changed', {
              invoiceId: data.invoiceId,
              status: 'paid',
              paidAt: data.timestamp
            });
          }
        }
      } catch (err) {
        console.error('❌ Error processing KPI redis message:', err);
      }
    });

  } else {
    console.warn('⚠️ Redis unreachable. Falling back to Memory Adapter for Socket.IO.');
  }

  const allowedOrigins = new Set([
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    'https://www.studioflow.studio',
    'https://studioflow.studio',
    'https://studioflow-production-gjcfazechpafc7df.centralindia-01.azurewebsites.net',
    'https://studio-flow-grzwmv1ez-hey-viswas-projects.vercel.app',
    'http://localhost:3002',
    'http://localhost:5173'
  ].filter(Boolean));

  io = new Server(httpServer, {
    cors: {
      origin: Array.from(allowedOrigins),
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    ...adapterConfig,
    pingInterval: 25000, // 25s heartbeat interval
    pingTimeout: 60000   // 60s timeout before closing
  });

  // Ensure credentialed requests see the right CORS headers during the socket handshake
  io.engine.on('headers', (headers, req) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
  });

  realtimeService = new RealtimeService(io);

  // Authentication Middleware
  io.use((socket, next) => {
    // TODO: proper token verification here or assume verified by handshake auth
    const token = socket.handshake.auth.token;
    // For now, we rely on the logic inside 'connection' or separate middleware
    // passing next() to allow connection
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Store metadata
    const { userId, projectId, lastEventId } = socket.handshake.auth || {};

    if (userId) {
      socket.join(`user:${userId}`);
      socket.data.userId = userId;
    }

    if (projectId) {
      // If connecting directly to a project context
      joinProjectRooms(socket, projectId);
    }

    // --- Event Handlers ---

    const normalizeProjectId = (payload) => {
      if (typeof payload === 'string' || typeof payload === 'number') return `${payload}`;
      if (payload && typeof payload === 'object') {
        return payload.projectId || payload.id || payload.pid || null;
      }
      return null;
    };

    socket.on('join-project', (payload) => {
      const pid = normalizeProjectId(payload);
      if (!pid) return;

      joinProjectRooms(socket, pid);

      // Send initial presence list
      realtimeService.getProjectPresence(pid).then(users => {
        socket.emit('presence.init', { projectId: pid, users });
      });
    });

    socket.on('leave-project', (payload) => {
      const pid = normalizeProjectId(payload);
      if (!pid) return;
      leaveProjectRooms(socket, pid);
    });

    // Custom Heartbeat (for Application-level Presence)
    // Client sends: { projectId }
    socket.on('heartbeat', async ({ projectId }) => {
      if (!projectId || !socket.data.userId) return; // Anon users don't track presence

      // User info for presence
      const userInfo = {
        displayName: socket.handshake.auth.displayName || 'User',
        // Add other fields needed for presence UI
      };

      await realtimeService.updatePresence(projectId, socket.data.userId, userInfo);
    });

    // Typing Indicators
    socket.on('typing', ({ projectId, isTyping }) => {
      if (!projectId || !socket.data.userId) return;

      // Broadcast to 'typing' channel of the project
      // using volatile emit (ok to drop)
      socket.volatile.to(`project:${projectId}:presence`).emit('typing', {
        projectId,
        userId: socket.data.userId,
        isTyping
      });
    });

    // Comment Creation (Example of Rate Limiting via WS)
    socket.on('comment.create', async (payload) => {
      const { projectId, body, parentId } = payload;
      const uid = socket.data.userId;

      if (!uid) {
        return socket.emit('error', { code: 401, message: 'Unauthorized' });
      }

      // Rate Limit Check
      const limitCheck = await realtimeService.checkRateLimit(projectId, uid, 'comment.create');
      if (!limitCheck.allowed) {
        return socket.emit('error', {
          code: 429,
          reason: 'rate_limit',
          retryAfterMs: limitCheck.retryAfterMs
        });
      }

      // Proceed to save comment (Controller logic would go here or emit to internal event emitter)
      // For now, we assume the controller handles the DB write and calls emitToRoom
    });

    socket.on('disconnect', async () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      // Cleanup presence if we tracked active project
      if (socket.data.activeProjectId && socket.data.userId) {
        await realtimeService.removePresence(socket.data.activeProjectId, socket.data.userId);
      }
    });
  });

  console.log('✓ Socket.IO (Redis Adapter) initialized');
  return io;
};

// Helper to join all typed channels for a project
const joinProjectRooms = (socket, projectId) => {
  if (!projectId) return;

  const channels = ['events', 'comment', 'revision', 'approval', 'presence'];
  channels.forEach(ch => socket.join(`project:${projectId}:${ch}`));

  // Join the main project room (new format)
  socket.join(`project:${projectId}`);

  // Legacy room support (existing controllers use project-${id})
  socket.join(`project-${projectId}`);

  socket.data.activeProjectId = projectId; // Track for disconnect cleanup
  console.log(`👤 Socket ${socket.id} joined project context: ${projectId}`);
};

const leaveProjectRooms = (socket, projectId) => {
  if (!projectId) return;

  const channels = ['events', 'comment', 'revision', 'approval', 'presence'];
  channels.forEach(ch => socket.leave(`project:${projectId}:${ch}`));

  // Leave main project room
  socket.leave(`project:${projectId}`);

  // Legacy room support (existing controllers use project-${id})
  socket.leave(`project-${projectId}`);

  if (socket.data.activeProjectId === projectId) {
    socket.data.activeProjectId = null;
  }
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized.');
  }
  return io;
};

// Exports for use in Controllers
export const emitToProject = (projectId, channel, event, data) => {
  if (io) {
    io.to(`project:${projectId}:${channel}`).emit(event, data);
  }
};

export const broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

export default { initializeSocket, getIO, emitToProject, broadcast };
