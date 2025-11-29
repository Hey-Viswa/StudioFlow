
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import storageAdapter from '../src/utils/storageAdapter.js';
import ProjectFile from '../src/models/ProjectFile.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const testUploadSigning = async () => {
    try {
        console.log('🧪 Testing Upload Signing Logic...');

        // Force re-initialization to ensure env vars are picked up
        storageAdapter._initializeClient();

        if (!storageAdapter.client) {
            console.error('❌ Storage client not initialized. Check AWS credentials in .env');
            return;
        }

        const projectId = 'test_project_123';
        const filename = 'test-image.png';
        const contentType = 'image/png';

        // 1. Generate Key
        const key = storageAdapter.generateStorageKey(projectId, filename);
        console.log(`🔑 Generated Key: ${key}`);

        // 2. Get Signed URL
        console.log('🔄 Generating Signed URL...');
        const { uploadUrl, provider } = await storageAdapter.getSignedUploadUrl(key, contentType);

        if (uploadUrl) {
            console.log(`✅ Signed URL Generated (${provider}):`);
            console.log(uploadUrl.substring(0, 100) + '...');
        } else {
            console.error('❌ Failed to generate signed URL');
        }

    } catch (error) {
        console.error('❌ Error testing upload signing:', error);
    } finally {
        process.exit();
    }
};

testUploadSigning();
