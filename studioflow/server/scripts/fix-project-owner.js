import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Project from '../src/models/Project.js';
import User from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error('MONGO_URI not defined');
        await mongoose.connect(uri);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Connection Error:', err);
        process.exit(1);
    }
};

const fixOwner = async () => {
    await connectDB();

    try {
        // Find the real user (the one that looks like a Clerk ID)
        const realUser = await User.findOne({ clerkUserId: { $regex: /^user_/ } });
        if (!realUser) {
            console.log('No real user found (starting with user_)');
            return;
        }

        console.log(`Found Real User: ${realUser.clerkUserId} (${realUser.firstName} ${realUser.lastName})`);

        // Find projects with dummy owner
        const dummyOwner = 'owner_id';
        const projects = await Project.find({ ownerId: dummyOwner });

        console.log(`Found ${projects.length} projects with owner '${dummyOwner}'`);

        if (projects.length > 0) {
            const result = await Project.updateMany(
                { ownerId: dummyOwner },
                { $set: { ownerId: realUser.clerkUserId } }
            );
            console.log(`Updated ${result.modifiedCount} projects to owner ${realUser.clerkUserId}`);
        } else {
            console.log('No projects to update.');
        }

    } catch (error) {
        console.error('Fix Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

fixOwner();
