import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedOrigins: [
        'http://localhost:3002',
        'http://localhost:3000',
        'http://localhost:5173',
        'https://studioflow-files.s3.eu-north-1.amazonaws.com'
      ],
      ExposeHeaders: ['ETag', 'x-amz-server-side-encryption', 'x-amz-request-id'],
      MaxAgeSeconds: 3000,
    },
  ],
};

async function setupCORS() {
  try {
    const bucketName = 'studioflow-files-production';
    console.log('🔧 Setting up CORS for bucket:', bucketName);
    console.log('📍 Region:', process.env.AWS_REGION);
    
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfiguration,
    });

    await s3Client.send(command);
    
    console.log('✅ CORS configuration applied successfully!');
    console.log('\nAllowed origins:');
    corsConfiguration.CORSRules[0].AllowedOrigins.forEach(origin => {
      console.log(`  - ${origin}`);
    });
    console.log('\nAllowed methods:', corsConfiguration.CORSRules[0].AllowedMethods.join(', '));
    
  } catch (error) {
    console.error('❌ Error setting up CORS:', error.message);
    if (error.name === 'AccessDenied') {
      console.error('\n⚠️  Your AWS credentials do not have permission to modify bucket CORS settings.');
      console.error('You need to add this permission to your IAM user:');
      console.error('  - s3:PutBucketCORS');
    }
    process.exit(1);
  }
}

setupCORS();
