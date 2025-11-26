import { S3Client, PutBucketLifecycleConfigurationCommand } from '@aws-sdk/client-s3';
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

/**
 * Lifecycle Configuration Rules:
 * 1. Delete files older than 90 days
 * 2. Transition files to cheaper storage after 30 days (optional)
 * 3. Clean up incomplete multipart uploads after 7 days
 */
const lifecycleConfiguration = {
  Rules: [
    {
      Id: 'DeleteOldFiles',
      Status: 'Enabled',
      Filter: {
        Prefix: '', // Apply to all files
      },
      Expiration: {
        Days: 90, // Delete files after 90 days
      },
    },
    {
      Id: 'CleanupIncompleteUploads',
      Status: 'Enabled',
      Filter: {
        Prefix: '',
      },
      AbortIncompleteMultipartUpload: {
        DaysAfterInitiation: 7, // Clean up failed uploads after 7 days
      },
    },
    // Uncomment to move old files to cheaper storage before deletion
    // {
    //   Id: 'TransitionToIA',
    //   Status: 'Enabled',
    //   Filter: {
    //     Prefix: '',
    //   },
    //   Transitions: [
    //     {
    //       Days: 30,
    //       StorageClass: 'STANDARD_IA', // Infrequent Access (cheaper)
    //     },
    //   ],
    // },
  ],
};

async function setupLifecycle() {
  try {
    const bucketName = 'studioflow-files-production';
    console.log('🔧 Setting up lifecycle rules for bucket:', bucketName);
    console.log('━'.repeat(50));

    const command = new PutBucketLifecycleConfigurationCommand({
      Bucket: bucketName,
      LifecycleConfiguration: lifecycleConfiguration,
    });

    await s3Client.send(command);

    console.log('\n✅ Lifecycle rules applied successfully!\n');
    console.log('📋 Active Rules:');
    lifecycleConfiguration.Rules.forEach((rule) => {
      console.log(`\n   ${rule.Id}:`);
      console.log(`   Status: ${rule.Status}`);
      if (rule.Expiration) {
        console.log(`   → Deletes files after ${rule.Expiration.Days} days`);
      }
      if (rule.AbortIncompleteMultipartUpload) {
        console.log(`   → Cleans incomplete uploads after ${rule.AbortIncompleteMultipartUpload.DaysAfterInitiation} days`);
      }
      if (rule.Transitions) {
        rule.Transitions.forEach((t) => {
          console.log(`   → Transitions to ${t.StorageClass} after ${t.Days} days`);
        });
      }
    });

    console.log('\n💡 Tips:');
    console.log('   - Files older than 90 days will be automatically deleted');
    console.log('   - Failed uploads are cleaned up after 7 days');
    console.log('   - Edit this script to change retention periods');
    console.log('   - Uncomment STANDARD_IA transition to save costs on old files');

  } catch (error) {
    console.error('\n❌ Error setting up lifecycle rules:', error.message);
    if (error.name === 'AccessDenied') {
      console.error('\n⚠️  Your AWS credentials need this permission:');
      console.error('   - s3:PutLifecycleConfiguration');
    }
    process.exit(1);
  }
}

setupLifecycle();
