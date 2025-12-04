import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import models
import User from '../src/models/User.js';
import Project from '../src/models/Project.js';
import ProjectMember from '../src/models/ProjectMember.js';
import Comment from '../src/models/Comment.js';
import ProjectFile from '../src/models/ProjectFile.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGO_URI is not defined in .env');
    process.exit(1);
}

const migrate = async () => {
    try {
        console.log('🚀 Starting migration to Hybrid Architecture...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Start a session for transaction safety (if replica set)
        // Note: Transactions require a replica set. If standalone, we'll proceed without.
        const session = await mongoose.startSession();

        try {
            await session.withTransaction(async () => {
                console.log('🔄 Starting transaction...');

                // 1. Migrate Embedded Comments to Global Collection
                console.log('📦 Migrating embedded comments...');
                const projectsWithComments = await Project.find({ 'comments.0': { $exists: true } });

                let totalCommentsMoved = 0;

                for (const project of projectsWithComments) {
                    if (!project.comments || project.comments.length === 0) continue;

                    const commentDocs = project.comments.map(c => ({
                        projectId: project._id,
                        userId: c.userId,
                        userName: c.userName,
                        userEmail: c.userEmail,
                        content: c.text,
                        parentId: c.parentId ? new mongoose.Types.ObjectId(c.parentId) : null,
                        reactions: c.reactions,
                        attachments: c.attachments,
                        mentions: c.mentions,
                        isResolved: c.isResolved,
                        resolvedBy: c.resolvedBy,
                        resolvedAt: c.resolvedAt,
                        isSystemMessage: c.isSystemMessage,
                        edited: c.edited,
                        editedAt: c.editedAt,
                        createdAt: c.createdAt
                    }));

                    if (commentDocs.length > 0) {
                        await Comment.insertMany(commentDocs, { session });
                        totalCommentsMoved += commentDocs.length;
                    }
                }
                console.log(`✅ Moved ${totalCommentsMoved} comments to global collection.`);

                // 2. Migrate Embedded Members to ProjectMember Collection
                console.log('👥 Migrating embedded members...');
                const projectsWithMembers = await Project.find({ 'members.0': { $exists: true } });

                let totalMembersMoved = 0;

                for (const project of projectsWithMembers) {
                    if (!project.members || project.members.length === 0) continue;

                    for (const member of project.members) {
                        // Check if already exists
                        const existing = await ProjectMember.findOne({
                            projectId: project._id,
                            userId: member.userId
                        }).session(session);

                        if (!existing) {
                            await ProjectMember.create([{
                                projectId: project._id,
                                userId: member.userId,
                                email: member.email,
                                role: member.role === 'client' ? 'client' : (member.role === 'owner' ? 'owner' : 'team_member'),
                                status: 'active',
                                joinedAt: member.joinedAt,
                                invitedBy: project.ownerId // Assumption: Owner invited them
                            }], { session });
                            totalMembersMoved++;
                        }
                    }
                }
                console.log(`✅ Ensure ${totalMembersMoved} members exist in ProjectMember collection.`);

                // 3. Update Project Stats & Cleanup
                console.log('📊 Updating project stats and cleaning up...');
                const allProjects = await Project.find({}).session(session);

                for (const project of allProjects) {
                    const fileCount = await ProjectFile.countDocuments({ projectId: project._id }).session(session);
                    const commentCount = await Comment.countDocuments({ projectId: project._id }).session(session);
                    const taskCount = project.tasks ? project.tasks.length : 0;
                    const completedTaskCount = project.tasks ? project.tasks.filter(t => t.status === 'completed').length : 0;

                    // Update stats
                    project.stats = {
                        fileCount,
                        commentCount,
                        taskCount,
                        completedTaskCount
                    };

                    // Remove embedded arrays (using $unset equivalent logic by setting to undefined/empty)
                    // Mongoose might need explicit $unset in updateOne if strict mode interferes, 
                    // but saving with empty arrays/undefined works for schema changes usually.
                    // Better to use updateOne for explicit $unset to be safe.

                    await Project.updateOne(
                        { _id: project._id },
                        {
                            $set: { stats: project.stats },
                            $unset: { comments: "", members: "" } // Remove the fields
                        },
                        { session }
                    );
                }
                console.log(`✅ Updated stats and cleaned up ${allProjects.length} projects.`);

                // 4. Initialize User Stats
                console.log('👤 Initializing user stats...');
                const allUsers = await User.find({}).session(session);

                for (const user of allUsers) {
                    const totalProjects = await Project.countDocuments({ ownerId: user.clerkUserId }).session(session);

                    // Calculate storage used (approximate from files)
                    const files = await ProjectFile.find({ uploaderId: user.clerkUserId }).select('size').session(session);
                    const storageUsed = files.reduce((acc, file) => acc + (file.size || 0), 0);

                    await User.updateOne(
                        { _id: user._id },
                        {
                            $set: {
                                stats: {
                                    totalProjects,
                                    storageUsed
                                }
                            }
                        },
                        { session }
                    );
                }
                console.log(`✅ Updated stats for ${allUsers.length} users.`);

            });
            console.log('🎉 Migration completed successfully!');
        } catch (error) {
            console.error('❌ Transaction failed, aborting:', error);
            throw error; // Re-throw to trigger outer catch
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
};

migrate();
