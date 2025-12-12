
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import automationService from '../src/services/automationService.js';
import Project from '../src/models/Project.js';
import User from '../src/models/User.js';
import Task from '../src/models/Task.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
console.log(`📂 Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

async function verifyTaskAutomation() {
    console.log('🧪 Starting Task Automation Verification...');
    // Force Enable Flag for Verification
    process.env.FF_PHASE3_TASK_AUTOMATIONS = 'true';

    console.log(`📍 Env Check: FF_PHASE3_TASK_AUTOMATIONS=${process.env.FF_PHASE3_TASK_AUTOMATIONS}`);

    if (process.env.FF_PHASE3_TASK_AUTOMATIONS !== 'true') {
        console.error('❌ Feature flag is disabled! Verification will fail.');
        // We will force it for the test if needed, but better to warn
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studioflow');
        console.log('✅ Connected to MongoDB');

        // 1. Get a Project and User
        const project = await Project.findOne({ deletedAt: null });
        if (!project) throw new Error('No active project found to test with');
        const user = await User.findOne({ clerkUserId: project.ownerId });
        if (!user) throw new Error('Owner not found');

        console.log(`📝 Using Project: ${project.title} (${project._id})`);
        console.log(`👤 Using User: ${user.email} (${user.clerkUserId})`);

        // 2. Define Test Cases
        const testCases = [
            { content: 'We need to #todo update the documentation', keyword: '#todo', priority: 'medium' },
            { content: 'Found a circular dependency #bug in the auth module', keyword: '#bug', priority: 'high' }
        ];

        for (const test of testCases) {
            console.log(`\n🔹 Testing Payload: "${test.content}"`);

            // 3. Trigger Automation (Simulate what commentController does)
            // Note: We bypass the Redis queue for verification and call the service directly
            // mimicking the fallback logic or the worker logic.
            const payload = {
                commentId: new mongoose.Types.ObjectId(), // Fake comment ID
                projectId: project._id,
                content: test.content,
                userId: user.clerkUserId,
                link: '/test/link'
            };

            await automationService.processTaskAutomation(payload);

            // 4. Verify Task Creation
            // Allow slight delay for async events
            await new Promise(r => setTimeout(r, 1000));

            const task = await Task.findOne({
                projectId: project._id,
                description: { $regex: 'Auto-generated task' }, // Matches default description logic if content is short
                'metrics.sourceCommentId': payload.commentId // We need to check if we can link it back
                // Actually automationService logs "sourceCommentId" in audit, but maybe not in Task model directly?
                // Let's check the title or recent creation.
            }).sort({ createdAt: -1 });

            // Since we just created it, it should be the latest task
            const latestTask = await Task.findOne({ projectId: project._id }).sort({ createdAt: -1 });

            if (latestTask && latestTask.tags.includes('automated')) {
                // Verify content
                console.log(`   ✅ Task Created: "${latestTask.title}"`);
                console.log(`      ID: ${latestTask._id}`);
                console.log(`      Priority: ${latestTask.priority} (Expected: ${test.priority})`);
                console.log(`      Tags: ${latestTask.tags.join(', ')}`);

                if (latestTask.priority === test.priority) {
                    console.log('      ✨ Priority Correct');
                } else {
                    console.warn(`      ⚠️ Priority Mismatch!`);
                }
            } else {
                console.error('   ❌ Task NOT created or not found!');
            }
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

verifyTaskAutomation();
