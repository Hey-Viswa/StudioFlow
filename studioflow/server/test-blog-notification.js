/**
 * Test script to verify blog notification system works
 * Run: node test-blog-notification.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { triggerNotification, processNotificationEvent } from './src/services/notificationService.js';
import Notification from './src/models/Notification.js';
import Follow from './src/models/Follow.js';
import PublicProfile from './src/models/PublicProfile.js';

dotenv.config();

async function testBlogNotification() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Find an author with a public profile that has a valid userId
    const authorProfile = await PublicProfile.findOne({ isPublic: true, userId: { $ne: null, $exists: true } });
    if (!authorProfile) {
      console.log('❌ No public profile with valid userId found. Create a public profile first.');
      
      // List all profiles for debugging
      const allProfiles = await PublicProfile.find({}).select('username displayName userId isPublic').lean();
      console.log('\n📋 All profiles in database:');
      allProfiles.forEach(p => {
        console.log(`   - ${p.displayName || p.username}: userId=${p.userId}, isPublic=${p.isPublic}`);
      });
      return;
    }
    console.log(`📝 Found author: ${authorProfile.displayName} (userId: ${authorProfile.userId})`);

    // 2. Check if author has any followers
    const followers = await Follow.find({ followingId: authorProfile.userId });
    console.log(`👥 Author has ${followers.length} follower(s)`);

    if (followers.length === 0) {
      console.log('⚠️  No followers found. Creating a test follow relationship...');
      
      // Find another user to be a follower (must have valid userId)
      const otherProfile = await PublicProfile.findOne({ 
        userId: { $ne: authorProfile.userId, $ne: null, $exists: true }
      });
      if (otherProfile && otherProfile.userId) {
        await Follow.create({
          followerId: otherProfile.userId,
          followingId: authorProfile.userId
        });
        console.log(`✅ Created test follow: ${otherProfile.displayName} (${otherProfile.userId}) now follows ${authorProfile.displayName}`);
      } else {
        console.log('⚠️  No other user with valid userId found to create follow relationship');
        console.log('ℹ️  Notification will be triggered but will have 0 recipients (no followers)');
      }
    }

    // 3. Trigger a blog.published notification
    console.log('\n📨 Triggering blog.published notification...');
    
    const testData = {
      authorId: authorProfile.userId,
      authorName: authorProfile.displayName || 'Test Author',
      postId: 'test-post-id-' + Date.now(),
      postTitle: 'Test Blog Post - Video Editing Tips',
      postSlug: 'test-post-' + Date.now(),
      resourceId: 'test-post-id-' + Date.now(),
      resourceType: 'blog',
      title: `${authorProfile.displayName || 'Someone you follow'} published a new story`,
      message: 'Test Blog Post - Video Editing Tips',
      link: `/blog/test-post-${Date.now()}`,
      category: 'blog'
    };

    // Process directly (bypassing queue for testing)
    const result = await processNotificationEvent('blog.published', testData, authorProfile.userId);
    
    if (result) {
      console.log('✅ Notification event processed successfully!');
    } else {
      console.log('⚠️  Notification event returned false (may have 0 recipients)');
    }

    // 4. Check if notifications were created
    const recentNotifications = await Notification.find({
      type: 'blog_published',
      createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
    }).lean();

    console.log(`\n📊 Found ${recentNotifications.length} blog_published notification(s) in the last minute:`);
    recentNotifications.forEach(n => {
      console.log(`   - Recipient: ${n.recipientId}, Title: ${n.title}`);
    });

    console.log('\n✅ Blog notification test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testBlogNotification();
