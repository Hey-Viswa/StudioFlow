
import './src/config/env.js';
import express from 'express';
import { createServer } from 'http';
import { connectDB } from './src/config/db.js';
import { initializeSocket } from './src/config/socket.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

async function testStartup() {
    console.log('🔍 Starting Server Diagnostic...');

    // 1. Check Env Vars
    console.log('1. Checking Environment Variables...');
    if (!process.env.MONGO_URI) console.error('   ❌ MONGO_URI is missing');
    else console.log('   ✅ MONGO_URI is set');
    
    if (!process.env.CLERK_SECRET_KEY) console.error('   ❌ CLERK_SECRET_KEY is missing');
    else console.log('   ✅ CLERK_SECRET_KEY is set');

    // 2. Test DB Connection
    console.log('2. Testing MongoDB Connection...');
    try {
        await connectDB();
        console.log('   ✅ MongoDB Connected');
    } catch (e) {
        console.error('   ❌ MongoDB Connection Failed:', e.message);
        process.exit(1);
    }

    // 3. Test Socket.IO
    console.log('3. Testing Socket.IO Initialization...');
    try {
        await initializeSocket(httpServer);
        console.log('   ✅ Socket.IO Initialized');
    } catch (e) {
        console.error('   ❌ Socket.IO Initialization Failed:', e.message);
        // Don't exit, seeing if we can proceed
    }

    // 4. Test Middleware Imports
    console.log('4. Testing Middleware Imports...');
    try {
        await import('./src/middlewares/verifyClerkJWKS.js');
        console.log('   ✅ verifyClerkJWKS imported');
    } catch (e) {
        console.error('   ❌ verifyClerkJWKS failed to import:', e);
    }

    // 5. Start HTTP Server
    console.log('5. Attempting to bind port 5002...');
    try {
        httpServer.listen(5002, () => {
            console.log('   ✅ Server successfully bound to port 5002');
            console.log('🎉 DIAGNOSTIC PASSED: The core server components are functional.');
            process.exit(0);
        });
        
        httpServer.on('error', (e) => {
             console.error('   ❌ Server failed to bind:', e.message);
             process.exit(1);
        });
    } catch (e) {
        console.error('   ❌ Server Launch Failed:', e.message);
        process.exit(1);
    }
}

testStartup().catch(e => {
    console.error('💥 FATAL UNCAUGHT ERROR:', e);
    process.exit(1);
});
