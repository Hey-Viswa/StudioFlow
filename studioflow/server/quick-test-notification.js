/**
 * Quick Test: Create Notification
 * Run: node quick-test-notification.js
 */

import('dotenv').then(dotenv => {
  // Load server .env first
  dotenv.config({ path: '.env' });
  
  import('mongoose').then(async mongoose => {
    try {
      console.log('\n📧 Creating test notification...\n');
      
      const mongoUri = process.env.MONGO_URI;
      console.log('MongoDB URI found:', mongoUri ? '✅' : '❌');
      
      await mongoose.default.connect(mongoUri);
      console.log('✅ MongoDB connected');
      
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
      
      const notification = await Notification.create({
        userId: 'user_34ahC8n6ajkmZSIkEgnhz8PUh8k',
        type: 'info',
        title: '🎉 Welcome to Notifications!',
        message: 'Your notification system is now working. You can receive real-time updates about projects, tasks, and more!',
        icon: '🔔',
        link: '/dashboard',
        read: false,
        priority: 'high',
        category: 'system',
        metadata: { source: 'test-script' }
      });
      
      console.log('✅ Notification created successfully!');
      console.log('   ID:', notification._id);
      console.log('   Title:', notification.title);
      console.log('\n🔔 Now refresh your browser and check the bell icon!\n');
      
      await mongoose.default.disconnect();
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });
});
