# AWS S3 File Management Scripts

This directory contains utility scripts for managing AWS S3 file storage.

## Available Scripts

### 1. Setup S3 CORS (`setup-s3-cors.js`)
Configures CORS settings on your S3 bucket to allow direct browser uploads.

```bash
node scripts/setup-s3-cors.js
```

**What it does:**
- Allows uploads from localhost (development)
- Enables GET, PUT, POST, DELETE, HEAD methods
- Configures required headers for signed URL uploads

**Run this once** when setting up a new S3 bucket.

---

### 2. Check S3 Bucket (`check-s3-bucket.js`)
Lists all S3 buckets in your AWS account and verifies bucket existence.

```bash
node scripts/check-s3-bucket.js
```

**Use this to:**
- Find the correct bucket name
- Verify bucket region
- Troubleshoot bucket access issues

---

### 3. Check S3 Usage (`check-s3-usage.js`)
Shows current storage usage and compares against AWS free tier limits.

```bash
node scripts/check-s3-usage.js
```

**Displays:**
- Total files and storage used
- Files categorized by type
- Percentage of free tier used
- Warning if approaching limits

**AWS Free Tier:**
- 5 GB storage
- 20,000 GET requests/month
- 2,000 PUT requests/month
- 100 GB data transfer out/month

---

### 4. Setup S3 Lifecycle Rules (`setup-s3-lifecycle.js`)
Configures automatic cleanup rules on your S3 bucket.

```bash
node scripts/setup-s3-lifecycle.js
```

**Rules Applied:**
- **Delete old files:** Files older than 90 days are automatically deleted
- **Clean failed uploads:** Incomplete uploads removed after 7 days
- **Optional transition:** Move files to cheaper storage after 30 days (commented out)

**Edit the script** to customize retention periods.

---

### 5. Run Manual Cleanup (`run-cleanup.js`)
Manually runs the file cleanup job (normally runs daily at 2 AM UTC).

```bash
node scripts/run-cleanup.js
```

**Cleans up:**
- Old archived files (>90 days)
- Failed uploads stuck in "uploading" state (>7 days)
- Orphaned database records (>30 days)

---

## File Size Limits by Subscription

### Free Plan
- **Max file size:** 50 MB per file
- **Total storage:** 1 GB
- **Files per project:** 50
- **Allowed types:** Images, PDFs, text files, JSON

### Pro Plan
- **Max file size:** 200 MB per file
- **Total storage:** 10 GB
- **Files per project:** 500
- **Allowed types:** All file types

### Studio Plan
- **Max file size:** 500 MB per file
- **Total storage:** 50 GB
- **Files per project:** 5,000
- **Allowed types:** All file types

---

## Automatic Cleanup Schedule

The file cleanup job runs automatically **daily at 2 AM UTC** and:

1. Deletes files archived for more than 90 days
2. Removes failed uploads older than 7 days
3. Cleans orphaned database records older than 30 days

No manual intervention required!

---

## Required Environment Variables

```env
# AWS S3 Configuration
AWS_REGION=eu-north-1
AWS_S3_BUCKET=studioflow-files-production
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

---

## IAM Permissions Required

Your AWS IAM user needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject",
        "s3:ListBucket",
        "s3:PutBucketCors",
        "s3:PutLifecycleConfiguration"
      ],
      "Resource": [
        "arn:aws:s3:::studioflow-files-production",
        "arn:aws:s3:::studioflow-files-production/*"
      ]
    }
  ]
}
```

---

## Troubleshooting

### Bucket not found
Run `check-s3-bucket.js` to verify the bucket name and region match your `.env` file.

### Access denied errors
Check that your AWS credentials have the required IAM permissions listed above.

### CORS errors in browser
Run `setup-s3-cors.js` and ensure your frontend URL is in the allowed origins list.

### Storage limit exceeded
Run `check-s3-usage.js` to see current usage, then either:
1. Delete old files manually
2. Run `run-cleanup.js` to clean archived files
3. Upgrade to a higher subscription plan

---

## Cost Optimization Tips

1. **Enable lifecycle rules** (already done if you ran `setup-s3-lifecycle.js`)
2. **Monitor usage regularly** with `check-s3-usage.js`
3. **Set appropriate retention periods** for your use case
4. **Use file size limits** to prevent large uploads
5. **Consider CloudFront** for frequently accessed files (also has free tier)

---

## Support

For issues or questions about these scripts, check:
- AWS S3 Documentation: https://docs.aws.amazon.com/s3/
- AWS Free Tier: https://aws.amazon.com/free/
- Project Documentation: See main README.md
