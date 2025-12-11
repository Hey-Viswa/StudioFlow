import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
// import readline from 'readline'; // Removed for debug

// Load env vars from root (assuming script is in server/)
const envPath = path.resolve(process.cwd(), '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const resetDatabase = async () => {
    try {
        console.log('DEBUG: Script started');
        console.log(`DEBUG: Target URI: ${process.env.MONGODB_URI}`);

        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is undefined!');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected');

        // Dynamic imports to get models
        const { default: User } = await import('./src/models/User.js');
        const { default: AuditLog } = await import('./src/models/AuditLog.js');
        const { default: Notification } = await import('./src/models/Notification.js');

        // Delete Documents
        console.log('🗑️  Deleting Users...');
        const userRes = await User.deleteMany({});
        console.log(`   Deleted ${userRes.deletedCount} users.`);

        console.log('🗑️  Deleting Audit Logs...');
        const auditRes = await AuditLog.deleteMany({});
        console.log(`   Deleted ${auditRes.deletedCount} logs.`);

        console.log('🗑️  Deleting Notifications...');
        const notifRes = await Notification.deleteMany({});
        console.log(`   Deleted ${notifRes.deletedCount} notifications.`);

        // Optional: Reset other collections if requested?
        // User only said "users drop Logs". Keeping Projects/Tasks intact to avoid total destruction unless asked.

        console.log('✅ Database reset complete (Users, Logs, Notifications cleared). Schemas retained.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error resetting database:', error);
        process.exit(1);
    }
};

resetDatabase();
