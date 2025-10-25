import mongoose from 'mongoose';

export const connectDB = async () => {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase';
    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
}