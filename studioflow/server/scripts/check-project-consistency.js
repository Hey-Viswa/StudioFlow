
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Project from '../src/models/Project.js';
import ProjectMember from '../src/models/ProjectMember.js';
import User from '../src/models/User.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const checkConsistency = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const projects = await Project.find({});
        console.log(`🔍 Found ${projects.length} projects. Checking consistency...`);

        for (const project of projects) {
            console.log(`\n--------------------------------------------------`);
            console.log(`Checking Project: ${project.title} (${project._id})`);

            if (!project.ownerId) {
                console.error(`❌ CRITICAL: Project has no ownerId!`);
                continue;
            }

            const ownerUser = await User.findOne({ clerkUserId: project.ownerId });
            if (!ownerUser) {
                console.error(`❌ CRITICAL: Owner user ${project.ownerId} does not exist in Users collection!`);
            } else {
                console.log(`   Owner User: ${ownerUser.name || 'Unknown'} (${ownerUser.email})`);
            }

            // Check ProjectMember collection
            const members = await ProjectMember.find({ projectId: project._id });
            const ownerMember = members.find(m => m.userId === project.ownerId);

            if (!ownerMember) {
                console.error(`❌ CRITICAL: Owner ${project.ownerId} is NOT in ProjectMember collection!`);
            } else {
                if (ownerMember.role !== 'owner') {
                    console.error(`❌ CRITICAL: Owner ${project.ownerId} has role '${ownerMember.role}' in ProjectMember (expected 'owner')!`);
                } else {
                    console.log(`✅ Owner record in ProjectMember is correct.`);
                }
            }

            // Check for other members without users
            for (const member of members) {
                const userExists = await User.exists({ clerkUserId: member.userId });
                if (!userExists) {
                    console.warn(`⚠️ Warning: Member ${member.userId} (Role: ${member.role}) references a non-existent user.`);
                }
            }

            console.log(`   Total Members: ${members.length}`);
        }

        console.log(`\n--------------------------------------------------`);
        console.log('🏁 Consistency check complete.');

    } catch (error) {
        console.error('❌ Error during consistency check:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

checkConsistency();
