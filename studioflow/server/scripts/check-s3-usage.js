import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function checkUsage() {
  try {
    const bucketName = process.env.AWS_S3_BUCKET;
    console.log('📊 Checking S3 usage for:', bucketName);
    console.log('━'.repeat(50));

    let totalSize = 0;
    let fileCount = 0;
    const filesByType = {};

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      response.Contents.forEach((object) => {
        const sizeInMB = object.Size / (1024 * 1024);
        totalSize += sizeInMB;
        fileCount++;

        // Categorize by extension
        const ext = object.Key.split('.').pop().toLowerCase();
        filesByType[ext] = (filesByType[ext] || 0) + 1;
      });
    }

    console.log('\n📦 Storage Usage:');
    console.log(`   Total Files: ${fileCount}`);
    console.log(`   Total Size: ${totalSize.toFixed(2)} MB / 5,120 MB (${((totalSize / 5120) * 100).toFixed(2)}% of free tier)`);
    console.log(`   Remaining: ${(5120 - totalSize).toFixed(2)} MB`);

    console.log('\n📁 Files by Type:');
    Object.entries(filesByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count} file(s)`);
      });

    console.log('\n💡 Free Tier Limits:');
    console.log('   Storage: 5 GB (5,120 MB)');
    console.log('   GET Requests: 20,000/month');
    console.log('   PUT Requests: 2,000/month');
    console.log('   Data Transfer Out: 100 GB/month');

    if (totalSize > 5120) {
      console.log('\n⚠️  WARNING: You have exceeded the free tier storage limit!');
    } else if (totalSize > 4096) {
      console.log('\n⚠️  WARNING: You are approaching the free tier limit (80%)');
    } else {
      console.log('\n✅ You are well within the free tier limits');
    }

  } catch (error) {
    console.error('❌ Error checking usage:', error.message);
  }
}

checkUsage();
