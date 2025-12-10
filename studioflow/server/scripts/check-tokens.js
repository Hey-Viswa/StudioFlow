import mongoose from 'mongoose';
import DeviceToken from '../src/models/DeviceToken.js';

// Hardcoded for testing to bypass .env resolution issues
const MONGO_URI = 'mongodb+srv://viswaranjandev_db_user:1Q48l2OoBycR1L0V@studioflow-cluster.hvu8xji.mongodb.net/studioflow?retryWrites=true&w=majority&appName=studioflow-cluster';

const checkTokens = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const tokens = await DeviceToken.find({}).sort({ updatedAt: -1 }).limit(5);

        console.log(`Found ${tokens.length} device tokens:`);
        tokens.forEach(t => {
            console.log(`- User: ${t.userId}, Platform: ${t.platform}, Last Used: ${t.lastUsedAt}`);
            console.log(`  Token: ${t.token.substring(0, 20)}...`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkTokens();
