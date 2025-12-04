import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Project from '../src/models/Project.js';
import Comment from '../src/models/Comment.js';
import ProjectMember from '../src/models/ProjectMember.js';
import User from '../src/models/User.js';

describe('Hybrid Architecture Verification', () => {
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

    it('should enforce logical ownership via ownerId', async () => {
        const user = await User.create({ clerkUserId: 'owner1', email: 'test@test.com' });
        const project = await Project.create({
            title: 'My Project',
            ownerId: user.clerkUserId
        });

        expect(project.ownerId).toBe('owner1');

        // Verify index usage (conceptual check)
        const indexes = await Project.collection.indexes();
        const ownerIndex = indexes.find(idx => idx.key.ownerId === 1);
        expect(ownerIndex).toBeDefined();
    });

    it('should support independent comment growth', async () => {
        const project = await Project.create({ title: 'Big Project', ownerId: 'owner1' });

        // Create 100 comments
        const comments = Array.from({ length: 100 }).map((_, i) => ({
            projectId: project._id,
            userId: 'user2',
            content: `Comment ${i}`
        }));

        await Comment.insertMany(comments);

        const count = await Comment.countDocuments({ projectId: project._id });
        expect(count).toBe(100);

        // Verify project document size is not affected (no comments array)
        const fetchedProject = await Project.findById(project._id).lean();
        // @ts-ignore
        expect(fetchedProject.comments).toBeUndefined();
    });

    it('should allow efficient membership queries', async () => {
        const project = await Project.create({ title: 'Team Project', ownerId: 'owner1' });

        await ProjectMember.create({
            projectId: project._id,
            userId: 'member1',
            role: 'team_member',
            invitedBy: 'owner1' // Required field
        });

        // Find projects for member1
        const memberships = await ProjectMember.find({ userId: 'member1' });
        const projectIds = memberships.map(m => m.projectId);

        const projects = await Project.find({ _id: { $in: projectIds } });
        expect(projects).toHaveLength(1);
        expect(projects[0].title).toBe('Team Project');
    });
});
