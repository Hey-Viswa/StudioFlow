import { io } from 'socket.io-client';

const URL = 'https://studioflow-production-gjcfazechpafc7df.centralindia-01.azurewebsites.net';
// const URL = 'http://localhost:5000';

console.log(`🔌 Connecting to ${URL}...`);

const socket = io(URL, {
  transports: ['websocket'], // Force WebSocket
  withCredentials: true,
  reconnection: false
});

socket.on('connect', () => {
  console.log('✅ Connected! Socket ID:', socket.id);
  
  // Test authentication (if needed)
  // socket.emit('authenticate', 'test-user-id');
  
  // Test joining a room
  socket.emit('join-project', 'test-project-id');
});

socket.on('authenticated', (data) => {
  console.log('🔓 Authenticated:', data);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection Error:', err.message);
  // console.error(err);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

// Keep alive for a bit
setTimeout(() => {
  console.log('⏳ Closing connection...');
  socket.close();
}, 5000);
