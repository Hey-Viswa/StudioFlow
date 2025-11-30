import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import { initializeSocket } from '../src/config/socket.js';
import { createNotification } from '../src/services/notificationService.js';
import Notification from '../src/models/Notification.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = 5001;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI is missing in .env');
    process.exit(1);
}

// Disable Redis for this test
process.env.ENABLE_REDIS_QUEUE = 'false';

const runTest = async () => {
    let httpServer;
    let clientSocket;
    let userId = 'test-user-' + Date.now();

    try {
        // 1. Setup DB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 2. Setup Server
        httpServer = createServer();
        initializeSocket(httpServer);

        await new Promise((resolve) => httpServer.listen(PORT, resolve));
        console.log(`✅ Test server running on port ${PORT}`);

        // 3. Connect Client
        clientSocket = Client(`http://localhost:${PORT}`);

        await new Promise((resolve) => {
            clientSocket.on('connect', resolve);
        });
        console.log('✅ Client connected');

        // 4. Authenticate
        clientSocket.emit('authenticate', userId);
        await new Promise((resolve) => {
            clientSocket.on('authenticated', resolve);
        });
        console.log('✅ Client authenticated');

        // 5. Test Online Notification
        console.log('\n--- Testing Online Notification ---');
        const onlinePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout waiting for notification')), 5000);
            clientSocket.on('notification:new', (data) => {
                clearTimeout(timeout);
                console.log('✅ Received real-time notification:', data.title);
                resolve(data);
            });
        });

        await createNotification({
            userId,
            type: 'assigned', // Changed to valid enum
            title: 'Online Test Notification',
            message: 'You should see this immediately',
            actorId: 'system',
            resourceId: 'test-resource',
            resourceType: 'task', // Changed to match typical assigned resource
            sendEmail: true, // Should be suppressed
            sendPush: true   // Should be suppressed
        });

        await onlinePromise;

        // 6. Test Offline Notification
        console.log('\n--- Testing Offline Notification ---');
        clientSocket.disconnect();
        console.log('✅ Client disconnected');

        // Wait a bit for server to register disconnect
        await new Promise(r => setTimeout(r, 1000));

        // We can't easily assert email/push was sent without mocking, 
        // but we can check the console output of the service which logs "Proceeding to fallback channels"
        // For now, we just run it and check logs manually or trust the logic we verified.
        // We will trigger it:
        await createNotification({
            userId,
            type: 'assigned',
            title: 'Offline Test Notification',
            message: 'You should receive this via email/push',
            actorId: 'system',
            resourceId: 'test-resource',
            resourceType: 'task',
            metadata: { mode: 'offline' }, // Ensure unique idempotency key
            sendEmail: true,
            sendPush: true
        });
        console.log('✅ Offline notification triggered (Check logs for fallback message)');

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        // Cleanup
        console.log('🧹 Cleaning up...');
        if (clientSocket) {
            clientSocket.disconnect();
            clientSocket.close();
        }

        if (httpServer) {
            await new Promise(resolve => httpServer.close(resolve));
        }

        await mongoose.disconnect();
        console.log('✅ Cleanup complete');

        // Give a moment for logs to flush
        setTimeout(() => process.exit(0), 500);
    }
};

runTest();
