import { triggerNotification } from '../src/services/notificationService.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const testNotification = async () => {
    try {
        console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const Project = (await import('../src/models/Project.js')).default;
        const Notification = (await import('../src/models/Notification.js')).default;

        const project = await Project.findOne();
        if (!project) {
            console.error('No projects found');
            process.exit(1);
        }

        const userId = project.ownerId;
        console.log(`Targeting user: ${userId}`);

        // Mock data for task assignment
        const type = 'task.assigned';
        const data = {
            taskId: 'test-task-id',
            projectId: project._id,
            title: 'Test Task Assignment',
            message: 'You have been assigned to a test task',
            link: `/dashboard/projects/${project._id}`,
            priority: 'high',
            category: 'action'
        };
        const actorId = 'system-test';

        // Add assigneeId for rule matching
        data.assigneeId = userId;

        await triggerNotification(type, data, actorId);

        // Allow some time for async processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check DB
        const notification = await Notification.findOne({
            recipientId: userId,
            type: 'assigned', // Mapped type
            title: 'Test Task Assignment'
        }).sort({ createdAt: -1 });

        if (notification) {
            console.log('✅ Notification found in DB:', notification._id);
            console.log('Title:', notification.title);
        } else {
            console.error('❌ Notification NOT found in DB');
        }

        process.exit(0);
    } catch (error) {
        console.error('Notification trigger failed:', error);
        process.exit(1);
    }
};

testNotification();
