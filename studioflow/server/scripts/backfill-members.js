import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Project from '../src/models/Project.js';
import ProjectMember from '../src/models/ProjectMember.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error('MONGO_URI is not defined');
        await mongoose.connect(uri);
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ Connection Error:', err);
        process.exit(1);
    }
};

const backfillMembers = async () => {
    await connectDB();
    console.log('🚀 Starting Project Member Backfill...');

    try {
        const projects = await Project.find({}).lean();
        console.log(`📊 Found ${projects.length} projects to check.`);

        let createdCount = 0;
        let skippedCount = 0;
        let legacyMigratedCount = 0;

        for (const project of projects) {
            // 1. Ensure Owner Membership
            const ownerExists = await ProjectMember.findOne({
                projectId: project._id,
                userId: project.ownerId,
                role: 'owner'
            });

            if (!ownerExists) {
                console.log(`➕ Creating owner membership for Project "${project.title}" (${project.ownerId})`);
                await ProjectMember.create({
                    projectId: project._id,
                    userId: project.ownerId,
                    role: 'owner',
                    status: 'active',
                    joinedAt: project.createdAt,
                    invitedBy: project.ownerId
                });
                createdCount++;
            } else {
                skippedCount++;
            }

            // 2. Migrate Legacy Members (if 'members' field exists in raw doc)
            if (project.members && Array.isArray(project.members) && project.members.length > 0) {
                console.log(`🔄 Found ${project.members.length} legacy members in Project "${project.title}"`);

                for (const member of project.members) {
                    if (!member.userId) continue;

                    const memberExists = await ProjectMember.findOne({
                        projectId: project._id,
                        userId: member.userId
                    });

                    if (!memberExists) {
                        console.log(`   ➡ Migrating legacy member: ${member.name} (${member.role})`);
                        await ProjectMember.create({
                            projectId: project._id,
                            userId: member.userId,
                            name: member.name,
                            email: member.email,
                            role: member.role || 'client',
                            status: 'active',
                            joinedAt: new Date(),
                            invitedBy: project.ownerId
                        });
                        legacyMigratedCount++;
                    }
                }
            }
        }

        console.log('\n--- Backfill Summary ---');
        console.log(`✅ Created ${createdCount} owner memberships.`);
        console.log(`⏩ Skipped ${skippedCount} existing memberships.`);
        console.log(`🔄 Migrated ${legacyMigratedCount} legacy embedded members.`);
        console.log('------------------------');

    } catch (error) {
        console.error('❌ Backfill failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected');
    }
};

backfillMembers();
