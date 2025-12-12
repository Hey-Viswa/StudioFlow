import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup Env & Flags BEFORE imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Force Enable Flag
process.env.FF_PHASE3_AUTOTAGGING = 'true';

const verify = async () => {
    try {
        console.log('🧪 Starting Auto-Tagging Verification...');

        // Dynamic Imports
        const automationService = (await import('../src/services/automationService.js')).default;
        const ProjectFile = (await import('../src/models/ProjectFile.js')).default;
        const AutomationRule = (await import('../src/models/AutomationRule.js')).default;

        // 1. Connect DB
        const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!dbUri) throw new Error('No Mongo URI');
        await mongoose.connect(dbUri);
        console.log('✅ Connected to DB');

        // 2. Clear/Setup Test Data
        const testFileId = new mongoose.Types.ObjectId();
        const testProjectId = new mongoose.Types.ObjectId(); // Dummy Project ID

        // Create Dummy File
        await ProjectFile.create({
            _id: testFileId,
            projectId: testProjectId,
            filename: 'test_video_clip.mp4',
            originalFilename: 'test_video_clip.mp4',
            size: 1024,
            mimeType: 'video/mp4',
            uploaderId: new mongoose.Types.ObjectId(),
            status: 'active',
            storageProvider: 'r2', // Changed to likely valid enum 'r2' or update after viewing file
            storageKey: 'test/key/v1.mp4',
            bucket: 'uploads',
            tags: []
        });
        console.log(`📝 Created dummy file: ${testFileId} (test_video_clip.mp4)`);

        // 3. Ensure Rules Exist (Seeding should have done this)
        const videoRule = await AutomationRule.findOne({ name: 'Auto-tag Videos' });
        if (!videoRule) throw new Error('❌ "Auto-tag Videos" rule not found! Did seeding run?');
        console.log('✅ Found "Auto-tag Videos" rule');

        // 4. Run Automation
        // We simulate the worker calling the service
        const payload = {
            fileId: testFileId,
            projectId: testProjectId,
            filename: 'test_video_clip.mp4',
            extension: 'mp4',
            userId: 'test-user'
        };

        console.log('🔄 Running processTagAutomation...');
        await automationService.processTagAutomation(payload);

        // 5. Verify Result
        const updatedFile = await ProjectFile.findById(testFileId);
        const tags = updatedFile.tags || [];
        console.log(`🔎 File Tags after processing: [${tags.join(', ')}]`);

        if (tags.includes('video')) {
            console.log('✅ SUCCESS: File was auto-tagged with "video"');
        } else {
            console.error('❌ FAILURE: "video" tag missing');
            process.exit(1);
        }

        // Cleanup
        await ProjectFile.deleteOne({ _id: testFileId });
        console.log('🧹 Cleanup done');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error during verification:', error);
        process.exit(1);
    }
};

verify();
