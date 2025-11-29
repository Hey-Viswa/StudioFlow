
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import storageAdapter from '../src/utils/storageAdapter.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const testS3 = async () => {
    console.log('🧪 Testing S3 Configuration...');

    try {
        // Force re-initialization to ensure env vars are picked up
        storageAdapter._initializeClient();

        if (!storageAdapter.client) {
            console.error('❌ Storage client not initialized. Check AWS credentials in .env');
            console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Missing');
            console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Missing');
            console.log('AWS_REGION:', process.env.AWS_REGION);
            console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);
            return;
        }

        console.log('✅ Storage client initialized.');

        const projectId = 'test-project-id';
        const filename = 'test-file.txt';
        const contentType = 'text/plain';
        const key = storageAdapter.generateStorageKey(projectId, filename);

        console.log(`🔑 Generated Key: ${key}`);

        const { uploadUrl } = await storageAdapter.getSignedUploadUrl(key, contentType);
        console.log(`✅ Signed Upload URL generated successfully:`);
        console.log(uploadUrl.substring(0, 100) + '...'); // Truncate for display

        // Optional: Verify bucket access (HeadBucket)
        // Note: StorageAdapter doesn't expose HeadBucket, but verifyUpload uses HeadObject
        // We can't easily test HeadBucket without adding a method, but signed URL generation is a good sign.

    } catch (error) {
        console.error('❌ Error testing S3:', error);
    }
};

testS3();
