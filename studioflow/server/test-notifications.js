/**
 * Test Multiple Notification Types
 */

import('dotenv').then(dotenv => {
  dotenv.config({ path: '.env' });
  
  import('mongoose').then(async mongoose => {
    try {
      console.log('\n🧪 Testing Notification System...\n');
      
      await mongoose.default.connect(process.env.MONGO_URI);
      console.log('✅ MongoDB connected\n');
      
      const Notification = mongoose.default.model('Notification', new mongoose.default.Schema({
        userId: { type: String, required: true },
        type: { type: String, required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        icon: String,
        link: String,
        read: { type: Boolean, default: false },
        priority: { type: String, default: 'medium' },
        category: String,
        metadata: Object,
        createdAt: { type: Date, default: Date.now }
      }, { collection: 'notifications' }));
      
      const userId = 'user_34ahC8n6ajkmZSIkEgnhz8PUh8k';
      
      // Test different notification types
      const testNotifications = [
        {
          userId,
          type: 'task-assigned',
          title: '📋 New Task Assigned',
          message: 'You have been assigned to "Design Homepage Layout"',
          link: '/dashboard/projects',
          priority: 'high',
          category: 'task',
          metadata: { taskId: 'task_123' }
        },
        {
          userId,
          type: 'comment-added',
          title: '💬 New Comment',
          message: 'Someone commented on your project: "Looks great!"',
          link: '/dashboard/projects',
          priority: 'medium',
          category: 'comment',
          metadata: { projectId: 'proj_456' }
        },
        {
          userId,
          type: 'payment-received',
          title: '💰 Payment Received',
          message: 'You received $150.00 for Invoice #INV-1001',
          link: '/dashboard/invoices',
          priority: 'high',
          category: 'payment',
          metadata: { amount: 150, invoiceId: 'inv_1001' }
        },
        {
          userId,
          type: 'file-uploaded',
          title: '📎 New File Uploaded',
          message: 'design-mockup.png was uploaded to Project Alpha',
          link: '/dashboard/projects',
          priority: 'low',
          category: 'file',
          metadata: { fileName: 'design-mockup.png' }
        },
        {
          userId,
          type: 'warning',
          title: '⚠️ Subscription Expiring Soon',
          message: 'Your Pro subscription expires in 3 days. Renew now to continue.',
          link: '/dashboard/subscription',
          priority: 'high',
          category: 'subscription',
          metadata: { daysLeft: 3 }
        }
      ];
      
      console.log('Creating test notifications...\n');
      
      for (const notif of testNotifications) {
        const created = await Notification.create(notif);
        console.log(`✅ ${notif.type}: ${notif.title}`);
      }
      
      console.log('\n🎉 Created 5 test notifications!\n');
      console.log('📱 Go to your browser and check:');
      console.log('   - Bell icon should show badge with "5"');
      console.log('   - Click bell to see dropdown');
      console.log('   - Visit /dashboard/notifications to see full page\n');
      
      await mongoose.default.disconnect();
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });
});
