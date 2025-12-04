import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Project from '../src/models/Project.js';
import ProjectMember from '../src/models/ProjectMember.js';
import User from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};

const debugProjects = async () => {
    await connectDB();

    try {
        // 1. List all users to pick one
        const users = await User.find({}).limit(5);
        console.log('--- Users ---');
        users.forEach(u => console.log(`ID: ${u._id}, ClerkID: ${u.clerkUserId}, Name: ${u.firstName} ${u.lastName}, Role: ${u.role}`));

        if (users.length === 0) {
            console.log('No users found.');
            return;
        }

        // Pick the first user or a specific one if known
        // Let's try to find a user who is likely the owner (role: owner)
        const targetUser = users.find(u => u.role === 'owner') || users[0];
        const userId = targetUser.clerkUserId; // The controller uses req.userId which is usually Clerk ID

        console.log(`\n--- Debugging for User: ${targetUser.firstName} (${userId}) ---`);

        // 2. Check ProjectMember
        const memberships = await ProjectMember.find({
            userId: userId,
            status: { $ne: 'inactive' }
        });
        console.log(`Found ${memberships.length} memberships.`);
        memberships.forEach(m => console.log(`- Project: ${m.projectId}, Role: ${m.role}`));

        const projectIds = memberships.map(m => m.projectId);

        // 3. Check Projects
        const query = {
            $and: [
                { deletedAt: null },
                {
                    $or: [
                        { _id: { $in: projectIds } },
                        { ownerId: userId }
                    ]
                }
            ]
        };

        console.log('\n--- DEBUG RESULTS ---');
        console.log(`Target User ClerkID: ${userId}`);

        // 4. Check ALL projects to see if any exist
        const allProjects = await Project.find({});

        console.log(`\nTotal Projects in DB: ${allProjects.length}`);
        allProjects.forEach(p => {
            console.log(`Project: "${p.title}"`);
            console.log(`  ID: ${p._id}`);
            console.log(`  OwnerID: ${p.ownerId}`);
            console.log(`  Match? ${String(p.ownerId) === String(userId) ? 'YES' : 'NO'}`);

            // Check members
            const isMember = memberships.some(m => String(m.projectId) === String(p._id));
            console.log(`  Is Member? ${isMember ? 'YES' : 'NO'}`);
        });

    } catch (error) {
        console.error('Debug Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugProjects();
