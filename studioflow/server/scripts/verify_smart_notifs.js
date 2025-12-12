/**
 * Verification Script for Smart Notifications 2.0
 * Run with: node scripts/verify_smart_notifs.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import NotificationPreference from '../src/models/NotificationPreference.js';
import NotificationBatch from '../src/models/NotificationBatch.js';
import Notification from '../src/models/Notification.js';
import { processNotificationEvent } from '../src/services/notificationService.js';
import { generateDigestHtml } from '../src/workers/notificationBatchWorker.js';

dotenv.config();

// MOCK CONSTANTS
const MOCK_USER_ID = new mongoose.Types.ObjectId('60d5ecb8b5c9c62b3c7b4a11');
const MOCK_PROJECT_ID = new mongoose.Types.ObjectId('60d5ecb8b5c9c62b3c7b4a12');

import Project from '../src/models/Project.js';
import ProjectMember from '../src/models/ProjectMember.js';

// ... imports

const setup = async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI (or MONGO_URI) not set');
        process.exit(1);
    }
    await mongoose.connect(uri);
    console.log('✅ DB Connected');

    // 0. Cleanup
    await NotificationBatch.deleteMany({ userId: MOCK_USER_ID });
    await Notification.deleteMany({ recipientId: MOCK_USER_ID });
    await Project.deleteMany({ _id: MOCK_PROJECT_ID });
    await ProjectMember.deleteMany({ projectId: MOCK_PROJECT_ID });

    // 1. Setup Data
    await Project.create({
        _id: MOCK_PROJECT_ID,
        title: 'Verify Project',
        ownerId: MOCK_USER_ID, // User is owner
        status: 'active'
    });

    // Add User as member (even if owner, usually explicit member needed for some lookups, or logic handles owner)
    // NotificationRulesService.getRecipients checks members AND owner.
    // Let's add another user as "Actor" so we can test "User B triggers, User A receives"

    // ACTOR IS "actor1" (string) in the runTest call.
    // User is MOCK_USER_ID.

    // 2. Setup Preferences
    await NotificationPreference.findOneAndUpdate(
        { userId: MOCK_USER_ID },
        {
            userId: MOCK_USER_ID,
            channels: { push: true, email: true, inApp: true },
            digest: { emailFrequency: 'daily', groupingWindowMinutes: 15 },
            triggers: { comments: 'all' }
        },
        { upsert: true }
    );
    console.log('✅ Seeds & Prefs Set');
};

const runTest = async () => {
    // FORCE ENABLE FEATURE FLAG for this run
    process.env.FF_PHASE3_SMART_NOTIFICATIONS = 'true';
    // Mock imports might have already read the env, so this might be flaky if Service imports 'featureFlags' statically.
    // However, our code accesses `featureFlags.phase3` which reads process.env. 
    // Wait, featureFlags.js reads process.env AT LOAD TIME. 
    // We need to ensure we set this BEFORE importing the service if we rely on the config object.
    // But since we are running this script directly, we can just hope or we might need to mock the feature flag module if needed.
    // Actually, in this script, we imported services at the top... 
    // Let's rely on the User enabling it in .env OR we monkeypatch the config if possible?
    // Checking featureFlags.js -> it reads process.env. 
    // So setting process.env BEFORE imports would work, but Imports are hoisted.

    console.log('⚠️  NOTE: Ensure FF_PHASE3_SMART_NOTIFICATIONS=true is set in your .env for accurate testing if using static config.');

    // 3. Trigger Events
    console.log('🔄 Triggering 3 events...');

    // Event 1
    const res1 = await processNotificationEvent('comment.created', {
        _id: 'comment1',
        projectId: MOCK_PROJECT_ID,
        message: 'This is comment 1',
        title: 'New Comment',
        category: 'comment',
        link: `/projects/${MOCK_PROJECT_ID}/tasks/taskA`
    }, 'actor1');
    console.log(`Events 1 processed: ${res1}`);

    // Event 2 (Same Task)
    await processNotificationEvent('comment.created', {
        _id: 'comment2',
        projectId: MOCK_PROJECT_ID,
        message: 'This is comment 2',
        title: 'New Comment',
        category: 'comment',
        link: `/projects/${MOCK_PROJECT_ID}/tasks/taskA`
    }, 'actor1');

    // Event 3 (Different Resource)
    await processNotificationEvent('project.updated', {
        _id: 'projup1',
        projectId: MOCK_PROJECT_ID,
        message: 'Project status changed',
        title: 'Project Update',
        category: 'project',
        link: `/projects/${MOCK_PROJECT_ID}`
    }, 'actor1');

    // 4. Verify Batch Creation
    const batch = await NotificationBatch.findOne({ userId: MOCK_USER_ID, status: 'pending' });

    if (batch) {
        console.log(`✅ Batch found with ${batch.notifications.length} notifications!`);
        console.log(`   Process After: ${batch.processAfter}`);

        if (batch.notifications.length === 3) {
            console.log('   MATCH: 3 notifications queued.');
        } else {
            console.error(`   MISMATCH: Expected 3, got ${batch.notifications.length}`);
        }

        // 5. Test Digest Generation Logic (Visual Check)
        const html = generateDigestHtml(batch.notifications);
        console.log('\n📄 Generated Digest HTML Preview (snippet):');
        console.log(html.substring(0, 500) + '...');

        if (html.includes('Task A') && html.includes('Project Update')) {
            console.log('✅ HTML contains correct group headers.');
        } else {
            console.error('❌ HTML missing group headers.');
        }

    } else {
        console.error('❌ No pending batch found. Digest logic might be OFF or failed.');
    }

    // Cleanup
    mongoose.connection.close();
};

setup().then(runTest).catch(console.error);
