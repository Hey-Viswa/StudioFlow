
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

const fixConsistency = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const projects = await Project.find({});
        console.log(`🔍 Found ${projects.length} projects. Fixing consistency...`);

        for (const project of projects) {
            console.log(`\n--------------------------------------------------`);
            console.log(`Processing Project: ${project.title} (${project._id})`);

            if (!project.ownerId) {
                console.error(`❌ CRITICAL: Project has no ownerId! Skipping.`);
                continue;
            }

            const ownerUser = await User.findOne({ clerkUserId: project.ownerId });
            if (!ownerUser) {
                console.error(`❌ CRITICAL: Owner user ${project.ownerId} does not exist in Users collection! Cannot fix.`);
                continue;
            }

            // Check ProjectMember collection
            let ownerMember = await ProjectMember.findOne({
                projectId: project._id,
                userId: project.ownerId
            });

            if (!ownerMember) {
                console.log(`⚠️ Owner ${project.ownerId} is NOT in ProjectMember collection. Creating record...`);

                const newMember = new ProjectMember({
                    projectId: project._id,
                    userId: project.ownerId,
                    role: 'owner',
                    status: 'active',
                    invitedBy: project.ownerId, // Self-invite
                    email: ownerUser.email,
                    joinedAt: new Date()
                });

                await newMember.save();
                console.log(`✅ Created owner member record.`);
            } else {
                if (ownerMember.role !== 'owner') {
                    console.log(`⚠️ Owner ${project.ownerId} has role '${ownerMember.role}'. Updating to 'owner'...`);
                    ownerMember.role = 'owner';
                    await ownerMember.save();
                    console.log(`✅ Updated owner member role.`);
                } else {
                    console.log(`✅ Owner record is already correct.`);
                }
            }
        }

        console.log(`\n--------------------------------------------------`);
        console.log('🏁 Consistency fix complete.');

    } catch (error) {
        console.error('❌ Error during consistency fix:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

fixConsistency();
