import { S3Client, ListBucketsCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function checkBucket() {
  try {
    console.log('🔍 Checking S3 buckets...\n');
    console.log('Looking for bucket:', process.env.AWS_S3_BUCKET);
    console.log('In region:', process.env.AWS_REGION);
    console.log('\n---\n');
    
    // List all buckets
    const listCommand = new ListBucketsCommand({});
    const { Buckets } = await s3Client.send(listCommand);
    
    if (!Buckets || Buckets.length === 0) {
      console.log('❌ No buckets found in your AWS account.');
      return;
    }
    
    console.log('📦 Available buckets:\n');
    for (const bucket of Buckets) {
      console.log(`  - ${bucket.Name} (created: ${bucket.CreationDate})`);
      
      // Try to get bucket location
      try {
        const locationCommand = new GetBucketLocationCommand({ Bucket: bucket.Name });
        const { LocationConstraint } = await s3Client.send(locationCommand);
        const region = LocationConstraint || 'us-east-1';
        console.log(`    Region: ${region}`);
        
        if (bucket.Name === process.env.AWS_S3_BUCKET) {
          console.log(`    ✅ THIS IS YOUR CONFIGURED BUCKET`);
          if (region !== process.env.AWS_REGION) {
            console.log(`    ⚠️  WARNING: Bucket is in ${region} but .env has ${process.env.AWS_REGION}`);
          }
        }
      } catch (err) {
        console.log(`    (couldn't get region: ${err.message})`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBucket();
