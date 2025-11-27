/**
 * Test Script: Create a Test Notification
 * 
 * This script creates a test notification to verify the notification system is working.
 * Run this from the server directory:
 *   node test-create-notification.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Notification from './src/models/Notification.js';
import { io } from 'socket.io-client';

const MONGO_URI = process.env.MONGO_URI;
const API_URL = 'http://localhost:5000';

// Your Clerk user ID (from the server logs)
const TEST_USER_ID = 'user_34ahC8n6ajkmZSIkEgnhz8PUh8k';

async function createTestNotification() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Create a test notification
    console.log('📝 Creating test notification...');
    const notification = await Notification.create({
      userId: TEST_USER_ID,
      type: 'info',
      title: '🎉 Welcome to StudioFlow Notifications!',
      message: 'Your notification system is working perfectly. You can now receive real-time updates about projects, tasks, comments, and more!',
      icon: '🎉',
      link: '/dashboard',
      read: false,
      priority: 'medium',
      category: 'system',
      metadata: {
        source: 'test-script',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Notification created:');
    console.log('   ID:', notification._id);
    console.log('   Title:', notification.title);
    console.log('   Type:', notification.type);
    console.log('   Link:', notification.link);
    console.log('\n📊 Check your dashboard - you should see the notification bell with a badge!\n');

    // Try to emit via Socket.IO (if server is running)
    console.log('⚡ Attempting to emit real-time notification...');
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 3000
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
      
      // Emit notification to user's room
      socket.emit('notification', {
        userId: TEST_USER_ID,
        notification: notification.toObject()
      });
      
      console.log('✅ Real-time notification emitted!\n');
      
      setTimeout(() => {
        socket.disconnect();
        cleanup();
      }, 1000);
    });

    socket.on('connect_error', (error) => {
      console.log('⚠️  Could not connect to Socket.IO (server might not be running)');
      console.log('   The notification is still saved in the database.\n');
      cleanup();
    });

    socket.on('error', (error) => {
      console.log('⚠️  Socket.IO error:', error.message);
      cleanup();
    });

  } catch (error) {
    console.error('❌ Error creating notification:', error.message);
    cleanup();
  }
}

function cleanup() {
  console.log('🧹 Cleaning up...');
  mongoose.connection.close();
  process.exit(0);
}

// Run the script
console.log('\n╔════════════════════════════════════════════╗');
console.log('║  📧 Test Notification Creator             ║');
console.log('╚════════════════════════════════════════════╝\n');

createTestNotification();
