
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Project from '../src/models/Project.js';
import ProjectMember from '../src/models/ProjectMember.js';
import jwt from 'jsonwebtoken';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const reproduceInvite = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Create a dummy project
        const project = await Project.create({
            title: 'Invite Test Project',
            ownerId: 'owner_123',
            members: []
        });
        console.log(`✅ Created test project: ${project._id}`);

        // 2. Simulate Invite Token
        const token = jwt.sign(
            { projectId: project._id.toString(), role: 'client' },
            process.env.JWT_SECRET || 'test_secret' // Fallback if not in env
        );

        // 3. Simulate Accept Invite Logic (from inviteController.js)
        const userId = 'new_user_456';
        const userEmail = 'newuser@example.com';
        const userName = 'New User';

        console.log('🔄 Simulating acceptInvite...');

        // NEW FIXED LOGIC
        await ProjectMember.findOneAndUpdate(
            { projectId: project._id, userId },
            {
                projectId: project._id,
                userId,
                email: userEmail,
                name: userName,
                role: 'client',
                status: 'active',
                joinedAt: new Date(),
                invitedBy: project.ownerId
            },
            { upsert: true, new: true }
        );
        console.log('✅ Executed ProjectMember.findOneAndUpdate');

        // 4. Verify if ProjectMember exists
        const memberRecord = await ProjectMember.findOne({
            projectId: project._id,
            userId: userId
        });

        if (!memberRecord) {
            console.error('❌ FAILURE: ProjectMember record was NOT created!');
        } else {
            console.log('✅ SUCCESS: ProjectMember record found.');
        }

        // Cleanup
        await Project.deleteOne({ _id: project._id });
        if (memberRecord) await ProjectMember.deleteOne({ _id: memberRecord._id });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

reproduceInvite();
