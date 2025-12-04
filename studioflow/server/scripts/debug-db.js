import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        console.log('URI Length:', uri ? uri.length : 0);
        if (!uri) {
            throw new Error('MONGO_URI is not defined');
        }
        console.log('Connecting...');
        await mongoose.connect(uri);
        console.log('MongoDB Connected Successfully');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Connection Error:', err);
    }
};

connectDB();
