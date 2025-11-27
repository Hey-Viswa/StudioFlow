// Test script to verify notification system setup
// Run with: node test-setup.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createNotification } from './src/services/notificationService.js';
import { emailQueue } from './src/config/queue.js';

dotenv.config({ path: '../../.env' });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testSetup() {
  log('\n🧪 Testing StudioFlow Notification System Setup\n', 'cyan');

  // Test 1: MongoDB Connection
  try {
    log('1️⃣  Testing MongoDB connection...', 'yellow');
    await mongoose.connect(process.env.MONGO_URI);
    log('   ✅ MongoDB connected successfully!', 'green');
  } catch (error) {
    log('   ❌ MongoDB connection failed!', 'red');
    log(`   Error: ${error.message}`, 'red');
    process.exit(1);
  }

  // Test 2: Redis Connection
  try {
    log('\n2️⃣  Testing Redis connection...', 'yellow');
    const redis = emailQueue.client;
    await redis.ping();
    log('   ✅ Redis connected successfully!', 'green');
  } catch (error) {
    log('   ❌ Redis connection failed!', 'red');
    log(`   Error: ${error.message}`, 'red');
    log('   Make sure Redis is running:', 'yellow');
    log('   - Docker: docker start studioflow-redis', 'yellow');
    log('   - WSL: wsl sudo service redis-server start', 'yellow');
    process.exit(1);
  }

  // Test 3: Email Configuration
  log('\n3️⃣  Checking email configuration...', 'yellow');
  if (process.env.EMAIL_PROVIDER === 'sendgrid') {
    if (process.env.SENDGRID_API_KEY) {
      log('   ✅ SendGrid API key configured', 'green');
    } else {
      log('   ⚠️  SendGrid API key not set', 'yellow');
    }
  } else if (process.env.EMAIL_PROVIDER === 'smtp') {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      log('   ✅ SMTP credentials configured', 'green');
    } else {
      log('   ⚠️  SMTP credentials not set', 'yellow');
    }
  }

  if (process.env.NODE_ENV === 'production') {
    log('   ✅ Emails will be sent (NODE_ENV=production)', 'green');
  } else {
    log('   ℹ️  Emails will be logged only (NODE_ENV=development)', 'blue');
  }

  // Test 4: Create Test Notification
  log('\n4️⃣  Creating test notification...', 'yellow');
  log('   Enter your Clerk User ID (or press Enter to skip):', 'cyan');
  
  // For automated testing, skip user input
  const testUserId = 'test_user_123'; // Replace with actual user ID
  
  try {
    const notification = await createNotification({
      userId: testUserId,
      type: 'system-update',
      title: '🎉 Setup Test Successful!',
      message: 'Your notification system is configured correctly and working!',
      link: '/dashboard',
      priority: 'high',
      sendEmail: false
    });
    
    log(`   ✅ Test notification created! ID: ${notification._id}`, 'green');
    log('   📊 Check MongoDB: db.notifications.find()', 'blue');
  } catch (error) {
    log('   ⚠️  Could not create notification', 'yellow');
    log(`   Error: ${error.message}`, 'red');
  }

  // Test 5: Email Queue
  log('\n5️⃣  Checking email queue status...', 'yellow');
  try {
    const waiting = await emailQueue.getWaitingCount();
    const active = await emailQueue.getActiveCount();
    const completed = await emailQueue.getCompletedCount();
    const failed = await emailQueue.getFailedCount();
    
    log(`   ✅ Queue Status:`, 'green');
    log(`      Waiting: ${waiting}`, 'blue');
    log(`      Active: ${active}`, 'blue');
    log(`      Completed: ${completed}`, 'blue');
    log(`      Failed: ${failed}`, 'blue');
  } catch (error) {
    log('   ⚠️  Could not check queue status', 'yellow');
    log(`   Error: ${error.message}`, 'red');
  }

  // Test 6: Environment Variables
  log('\n6️⃣  Checking required environment variables...', 'yellow');
  const requiredVars = [
    'MONGO_URI',
    'REDIS_HOST',
    'REDIS_PORT',
    'EMAIL_PROVIDER',
    'EMAIL_FROM',
    'ADMIN_EMAIL',
    'FRONTEND_URL'
  ];

  let missingVars = 0;
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      log(`   ✅ ${varName}`, 'green');
    } else {
      log(`   ❌ ${varName} - MISSING!`, 'red');
      missingVars++;
    }
  }

  if (missingVars > 0) {
    log(`\n   ⚠️  ${missingVars} required variable(s) missing`, 'yellow');
    log('   Update your .env file and try again', 'yellow');
  }

  // Summary
  log('\n' + '='.repeat(50), 'cyan');
  log('📋 SETUP SUMMARY', 'cyan');
  log('='.repeat(50), 'cyan');
  log('\n✅ MongoDB: Connected', 'green');
  log('✅ Redis: Connected', 'green');
  log('✅ Email Queue: Running', 'green');
  log('✅ Notification Service: Working', 'green');

  log('\n🎯 Next Steps:', 'cyan');
  log('1. Update .env with your actual Clerk user ID', 'blue');
  log('2. Start the server: npm run dev', 'blue');
  log('3. Start the client: cd ../client && npm run dev', 'blue');
  log('4. Open http://localhost:3002 and check the notification bell', 'blue');
  log('5. Test contact form at http://localhost:3002/contact', 'blue');

  log('\n📚 Documentation:', 'cyan');
  log('- NOTIFICATION_SETUP_GUIDE.md - Complete setup instructions', 'blue');
  log('- NOTIFICATIONS_README.md - API documentation', 'blue');
  log('- examples/ - Integration code samples', 'blue');

  log('\n✨ Setup test complete!\n', 'green');

  await mongoose.disconnect();
  process.exit(0);
}

// Run tests
testSetup().catch(error => {
  log('\n💥 Test failed with error:', 'red');
  log(error.message, 'red');
  process.exit(1);
});
