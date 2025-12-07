import { fileQueue } from '../src/queues/fileQueue.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const testFileQueue = async () => {
    console.log('🧪 Testing File Queue...');

    // Allow Redis to connect
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
        const job = await fileQueue.add({
            fileId: 'test-file-123',
            filename: 'document_scan_v1.pdf',
            size: 1024 * 1024 * 5, // 5MB
            userId: 'user_123'
        });

        console.log(`✅ Job added! ID: ${job.id}`);
        console.log('⏳ Waiting for worker to pick it up (check server console)...');

        // Check status after 3 seconds
        setTimeout(async () => {
            const state = await job.getState();
            console.log(`📊 Job State after 3s: ${state}`);
            process.exit(0);
        }, 3000);

    } catch (error) {
        console.error('❌ Error adding job:', error);
        process.exit(1);
    }
};

testFileQueue();
