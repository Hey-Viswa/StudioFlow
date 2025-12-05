
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (server/.env)
// Note: The path in storage.js is path.resolve(__dirname, '../../.env')
// Since this script is in server/scripts, we need to go up one level to server, then to .env
// Wait, storage.js is in server/src/config/storage.js.
// So __dirname is server/src/config.
// ../../.env resolves to server/.env.

// This script is in server/scripts.
// __dirname is server/scripts.
// ../.env resolves to server/.env.

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Checking Storage Configuration...');
console.log('STORAGE_PROVIDER:', process.env.STORAGE_PROVIDER);
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Missing');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Missing');

import storageAdapter from '../src/utils/storageAdapter.js';

async function testStorage() {
    try {
        console.log('Initializing Storage Adapter...');
        // The adapter initializes in constructor
        
        if (storageAdapter.client) {
            console.log('✅ Storage Client Initialized');
        } else {
            console.error('❌ Storage Client NOT Initialized');
        }

        console.log('Testing Signed URL generation...');
        const url = await storageAdapter.getSignedUploadUrl('test-key', 'image/png');
        console.log('✅ Signed URL generated successfully');
        // console.log(url);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testStorage();
