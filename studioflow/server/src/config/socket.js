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
  } else {
    console.warn('⚠️ Redis unreachable. Falling back to Memory Adapter for Socket.IO.');
  }

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || [
        'http://localhost:3002',
        'http://localhost:5173',
        'https://studio-flow-grzwmv1ez-hey-viswas-projects.vercel.app'
      ],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    ...adapterConfig,
    pingInterval: 20000, // 20s heartbeat interval
    pingTimeout: 60000   // 60s timeout before closing
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

    socket.on('join-project', ({ projectId: pid, listLastEvents }) => {
      joinProjectRooms(socket, pid);

      // Send initial presence list
      realtimeService.getProjectPresence(pid).then(users => {
        socket.emit('presence.init', { projectId: pid, users });
      });
    });

    socket.on('leave-project', (pid) => {
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
  const channels = ['events', 'comment', 'revision', 'approval', 'presence'];
  channels.forEach(ch => socket.join(`project:${projectId}:${ch}`));

  socket.data.activeProjectId = projectId; // Track for disconnect cleanup
  console.log(`👤 Socket ${socket.id} joined project context: ${projectId}`);
};

const leaveProjectRooms = (socket, projectId) => {
  const channels = ['events', 'comment', 'revision', 'approval', 'presence'];
  channels.forEach(ch => socket.leave(`project:${projectId}:${ch}`));

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
