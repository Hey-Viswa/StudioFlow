import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Project from '../src/models/Project.js';
import Comment from '../src/models/Comment.js';
import ProjectMember from '../src/models/ProjectMember.js';
import User from '../src/models/User.js';

// Mock the migration logic (since we can't import the script directly if it's not a module with exports)
// Alternatively, we can copy the logic here or refactor the script to be importable.
// For this test, we will replicate the logic to verify the transformation rules.

describe('Migration Logic Verification', () => {
    let mongoServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await Project.deleteMany({});
        await Comment.deleteMany({});
        await ProjectMember.deleteMany({});
        await User.deleteMany({});
    });

    it('should migrate embedded comments to global collection', async () => {
        // 1. Setup legacy data
        const project = await Project.create({
            title: 'Legacy Project',
            ownerId: 'user1',
            // @ts-ignore - bypassing schema strict mode for test if possible, or using lean
        });

        // Force insert embedded comments using update (since schema might have changed)
        await Project.collection.updateOne(
            { _id: project._id },
            {
                $set: {
                    comments: [{
                        userId: 'user2',
                        text: 'Legacy comment',
                        createdAt: new Date()
                    }]
                }
            }
        );

        // 2. Run Migration Logic
        const projectsWithComments = await Project.collection.find({ 'comments.0': { $exists: true } }).toArray();

        for (const p of projectsWithComments) {
            if (!p.comments) continue;
            const commentDocs = p.comments.map(c => ({
                projectId: p._id,
                userId: c.userId,
                content: c.text,
                createdAt: c.createdAt
            }));
            await Comment.insertMany(commentDocs);
            await Project.collection.updateOne({ _id: p._id }, { $unset: { comments: "" } });
        }

        // 3. Verify
        const comments = await Comment.find({ projectId: project._id });
        expect(comments).toHaveLength(1);
        expect(comments[0].content).toBe('Legacy comment');
        expect(comments[0].userId).toBe('user2');

        const updatedProject = await Project.collection.findOne({ _id: project._id });
        expect(updatedProject.comments).toBeUndefined();
    });

    it('should migrate embedded members to ProjectMember collection', async () => {
        // 1. Setup legacy data
        const project = await Project.create({
            title: 'Legacy Project 2',
            ownerId: 'user1'
        });

        await Project.collection.updateOne(
            { _id: project._id },
            {
                $set: {
                    members: [{
                        userId: 'user3',
                        role: 'client',
                        joinedAt: new Date()
                    }]
                }
            }
        );

        // 2. Run Migration Logic
        const projectsWithMembers = await Project.collection.find({ 'members.0': { $exists: true } }).toArray();

        for (const p of projectsWithMembers) {
            if (!p.members) continue;
            for (const m of p.members) {
                await ProjectMember.create({
                    projectId: p._id,
                    userId: m.userId,
                    role: m.role,
                    status: 'active',
                    invitedBy: 'system' // Required field
                });
            }
            await Project.collection.updateOne({ _id: p._id }, { $unset: { members: "" } });
        }

        // 3. Verify
        const members = await ProjectMember.find({ projectId: project._id });
        expect(members).toHaveLength(1);
        expect(members[0].userId).toBe('user3');
        expect(members[0].role).toBe('client');

        const updatedProject = await Project.collection.findOne({ _id: project._id });
        expect(updatedProject.members).toBeUndefined();
    });
});
