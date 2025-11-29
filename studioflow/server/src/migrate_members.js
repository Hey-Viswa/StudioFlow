import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './models/Project.js';
import ProjectMember from './models/ProjectMember.js';
import User from './models/User.js';

dotenv.config();

const migrateMembers = async () => {
    try {
        console.log('🚀 Starting migration: Backfill ProjectMember...');

        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const projects = await Project.find({});
        console.log(`📊 Found ${projects.length} projects to process`);

        let totalMembersCreated = 0;
        let errors = 0;

        for (const project of projects) {
            console.log(`\nProcessing Project: ${project.title} (${project._id})`);

            // 1. Add Owner as ProjectMember
            try {
                const ownerExists = await ProjectMember.findOne({
                    projectId: project._id,
                    userId: project.ownerId
                });

                if (!ownerExists) {
                    await ProjectMember.create({
                        projectId: project._id,
                        userId: project.ownerId,
                        role: 'owner',
                        status: 'active',
                        joinedAt: project.createdAt,
                        invitedBy: project.ownerId // Self-invited
                    });
                    console.log(`  ✅ Added Owner: ${project.ownerId}`);
                    totalMembersCreated++;
                } else {
                    console.log(`  Example: Owner already exists`);
                }
            } catch (err) {
                console.error(`  ❌ Failed to add owner for project ${project._id}:`, err.message);
                errors++;
            }

            // 2. Add existing members
            if (project.members && project.members.length > 0) {
                for (const member of project.members) {
                    // Skip if member is owner (already handled)
                    if (String(member.userId) === String(project.ownerId)) continue;

                    try {
                        const memberExists = await ProjectMember.findOne({
                            projectId: project._id,
                            userId: member.userId
                        });

                        if (!memberExists) {
                            await ProjectMember.create({
                                projectId: project._id,
                                userId: member.userId,
                                email: member.email,
                                role: member.role || 'client', // Default to client if undefined
                                status: 'active', // Assume active if in members array
                                joinedAt: member.joinedAt || new Date(),
                                invitedBy: project.ownerId
                            });
                            console.log(`  ✅ Added Member: ${member.userId} (${member.role})`);
                            totalMembersCreated++;
                        } else {
                            console.log(`  Example: Member ${member.userId} already exists`);
                        }
                    } catch (err) {
                        console.error(`  ❌ Failed to add member ${member.userId}:`, err.message);
                        errors++;
                    }
                }
            }
        }

        console.log('\n==========================================');
        console.log(`🎉 Migration Complete`);
        console.log(`✅ Total Members Created: ${totalMembersCreated}`);
        console.log(`❌ Errors: ${errors}`);
        console.log('==========================================');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Fatal Error:', error);
        process.exit(1);
    }
};

migrateMembers();
