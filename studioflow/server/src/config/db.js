import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
    if (isConnected) {
        console.log('✅ Using existing MongoDB connection');
        return;
    }

    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGO_URI not set in environment');
    }

    try {
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            serverApi: {
                version: '1',
                strict: true,
                deprecationErrors: true,
            }
        };

        await mongoose.connect(uri, options);
        isConnected = true;
        console.log('✅ MongoDB connected successfully');

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected');
            isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
            isConnected = true;
        });

    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        isConnected = false;
        throw err;
    }
};

export const disconnectDB = async () => {
    if (!isConnected) return;
    try {
        await mongoose.disconnect();
        isConnected = false;
        console.log('✅ MongoDB disconnected');
    } catch (err) {
        console.error('❌ Error disconnecting from MongoDB:', err);
        throw err;
    }
};
