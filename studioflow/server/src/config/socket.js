import { Server } from 'socket.io';

let io;

/**
 * Initialize Socket.IO with the HTTP server
 * @param {import('http').Server} httpServer - The HTTP server instance
 * @returns {Server} The Socket.IO server instance
 */
export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3002',
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join user-specific room on authentication
    socket.on('authenticate', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`👤 User ${userId} joined room: user:${userId}`);
        
        // Send confirmation
        socket.emit('authenticated', { userId, room: `user:${userId}` });
      }
    });

    // Handle client requesting to join a specific room
    socket.on('join-room', (room) => {
      socket.join(room);
      console.log(`🚪 Socket ${socket.id} joined room: ${room}`);
    });

    // Handle leaving rooms
    socket.on('leave-room', (room) => {
      socket.leave(room);
      console.log(`🚪 Socket ${socket.id} left room: ${room}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  console.log('✓ Socket.IO initialized');
  return io;
};

/**
 * Get the Socket.IO instance
 * @returns {Server} The Socket.IO server instance
 * @throws {Error} If Socket.IO has not been initialized
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initializeSocket() first.');
  }
  return io;
};

/**
 * Emit a notification to a specific user
 * @param {string} userId - The user ID to send the notification to
 * @param {string} event - The event name
 * @param {Object} data - The notification data
 */
export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Emit an event to a specific room
 * @param {string} room - The room name
 * @param {string} event - The event name
 * @param {Object} data - The data to send
 */
export const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

/**
 * Broadcast an event to all connected clients
 * @param {string} event - The event name
 * @param {Object} data - The data to send
 */
export const broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

export default { initializeSocket, getIO, emitToUser, emitToRoom, broadcast };
