
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Debug Env Loading
console.log(`🔍 Debug Script: Loading .env...`);
dotenv.config({ path: join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGO_URI is undefined. Check .env files.');
    process.exit(1);
}

// Imports - Dynamic to avoid top-level await issues if possible, but static here
import AutomationRule from './src/models/AutomationRule.js';
import automationService from './src/services/automationService.js';
import User from './src/models/User.js';
import Project from './src/models/Project.js';
// Initialize Socket Mock
import { initializeSocket } from './src/config/socket.js';

// Global Error Handlers
process.on('unhandledRejection', (reason, p) => {
    console.error('❌ Unhandled Rejection at promise:', p, 'reason:', reason);
    process.exit(1);
});
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

const runDebug = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        console.log('🔌 Initializing Dummy Socket...');
        const fakeSearch = createServer();
        process.env.ENABLE_REDIS_QUEUE = 'false';

        try {
            await initializeSocket(fakeSearch);
            console.log('✅ Dummy Socket Ready.');
        } catch (socketErr) {
            console.warn('⚠️ Socket Init Warn:', socketErr.message);
        }

        // 1. Check Automation Rules
        console.log('\n--- 1. Checking Automation Rules ---');
        console.log('DEBUG: AutomationRule model is:', AutomationRule ? 'Defined' : 'Undefined');

        if (!AutomationRule) {
            console.error('❌ AutomationRule module import failed. Check src/models/AutomationRule.js');
        } else {
            const rules = await AutomationRule.find({});
            console.log(`Found ${rules.length} rules in DB.`);
            if (rules.length === 0) {
                console.error('❌ NO RULES FOUND. Automation cannot work. Run "node seed_rules.js"!');
            } else {
                rules.forEach(r => console.log(`   - Rule: ${r.name} (Trigger: ${r.triggerType})`));
            }
        }

        // 2. Simulate Task Automation (#bug)
        console.log('\n--- 2. Simulating Task Automation (#bug) ---');

        const project = await Project.findOne();
        const user = await User.findOne();

        if (!project || !user) {
            console.warn('⚠️ No projects or users found to test with.');
        } else {
            const payload = {
                commentId: new mongoose.Types.ObjectId(),
                projectId: project._id,
                content: "This is a test comment #bug for automation debug",
                userId: user.clerkUserId, // Use clerkUserId or _id depending on what service expects
                link: "http://localhost/debug"
            };

            console.log('   Simulating payload:', payload);
            try {
                // Determine if we need to mock internal dependencies of the service?
                await automationService.processTaskAutomation(payload);
                console.log('   ✅ processTaskAutomation execution finished without error.');
            } catch (err) {
                console.error('   ❌ processTaskAutomation FAILED:', err);
            }
        }

        // 3. Simulate File Tagging (.png)
        console.log('\n--- 3. Simulating File Tagging (.png) ---');
        if (project) {
            const filePayload = {
                fileId: new mongoose.Types.ObjectId(), // Fake, query will fail to update but logic will run
                projectId: project._id,
                filename: "test_image.png",
                extension: "png",
                userId: "debug_user"
            };

            try {
                await automationService.processTagAutomation(filePayload);
                console.log('   ✅ processTagAutomation execution finished.');
            } catch (err) {
                console.error('   ❌ processTagAutomation FAILED:', err);
            }
        }

    } catch (error) {
        console.error('❌ Critical Debug Error:', error);
    } finally {
        console.log('Done. Disconnecting...');
        await mongoose.disconnect();
        process.exit(0);
    }
};

runDebug();
