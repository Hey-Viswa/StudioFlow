import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from '../src/models/Notification.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading from project root (3 levels up from scripts)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

console.log('Current directory:', process.cwd());
console.log('Env file path:', path.resolve(__dirname, '../../../.env'));
console.log('MONGO_URI loaded:', !!process.env.MONGO_URI);

const testNotification = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error('MONGO_URI is undefined');

        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const notificationData = {
            recipientId: 'test_recipient_id',
            actorId: 'test_actor_id',
            resourceId: 'test_project_id',
            resourceType: 'project',
            type: 'ownership_transfer_request', // This is the new type
            title: 'Ownership Transfer Request',
            message: 'You have been requested to take ownership of project "Test Project"',
            data: {
                url: '/dashboard/projects/test_project_id',
                metadata: { requestId: new mongoose.Types.ObjectId() }
            },
            category: 'action'
        };

        console.log('Attempting to create notification:', notificationData);

        const notification = await Notification.create(notificationData);
        console.log('Notification created successfully:', notification);

    } catch (error) {
        console.error('Error creating notification:', error);
    } finally {
        await mongoose.disconnect();
    }
};

testNotification();
