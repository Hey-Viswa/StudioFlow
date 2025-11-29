
import { updateProject } from '../src/controllers/projectController.js';
import { restoreProject } from '../src/controllers/trashController.js';
import { ROLES, PERMISSIONS } from '../src/utils/permissions.js';
import Project from '../src/models/Project.js';
import ProjectMember from '../src/models/ProjectMember.js';
import Trash from '../src/models/Trash.js';

// Mock Express Request/Response
const mockReq = (body, userId, params = {}) => ({
    body,
    userId,
    userName: 'Test User',
    params,
    app: { get: () => null } // Mock io
});

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

// Mock Mongoose
const mockProject = {
    _id: 'project123',
    ownerId: 'owner123',
    title: 'Test Project',
    tasks: [],
    save: async () => true,
    toObject: () => ({ ...mockProject })
};

const mockMember = {
    projectId: 'project123',
    userId: 'member123',
    role: 'team_member',
    status: 'active'
};

const mockTrash = {
    _id: 'trash123',
    originalProjectId: 'project123',
    ownerId: 'owner123', // Owner
    deletedBy: 'owner123',
    members: [{ userId: 'member123', role: 'team_member' }],
    canRestore: (userId) => userId === 'owner123', // Original logic
    save: async () => true
};

// Override Mongoose methods
Project.findById = async () => mockProject;
ProjectMember.findOne = async () => mockMember;
Trash.findById = async () => mockTrash;
Trash.findByIdAndDelete = async () => true;

const runTests = async () => {
    console.log('🧪 Testing Controller Fixes...');

    // Test 1: Team Member updating Tasks (Should Pass)
    console.log('\n1. Team Member updating Tasks:');
    const req1 = mockReq({ tasks: [{ title: 'New Task' }] }, 'member123', { id: 'project123' });
    const res1 = mockRes();

    // We need to mock checkPermission to work in this isolated context? 
    // No, it imports from utils.

    await updateProject(req1, res1);

    if (res1.statusCode !== 403) {
        console.log('✅ Team Member updated tasks successfully (Status:', res1.statusCode || 200, ')');
    } else {
        console.error('❌ Team Member failed to update tasks (Status:', res1.statusCode, res1.data, ')');
    }

    // Test 2: Team Member updating Title (Should Fail)
    console.log('\n2. Team Member updating Title:');
    const req2 = mockReq({ title: 'New Title' }, 'member123', { id: 'project123' });
    const res2 = mockRes();

    await updateProject(req2, res2);

    if (res2.statusCode === 403) {
        console.log('✅ Team Member blocked from updating title (Correct)');
    } else {
        console.error('❌ Team Member allowed to update title (Incorrect, Status:', res2.statusCode, ')');
    }

    // Test 3: Owner Restoring Project (Should Pass)
    console.log('\n3. Owner Restoring Project:');
    const req3 = mockReq({}, 'owner123', { id: 'trash123' });
    const res3 = mockRes();

    await restoreProject(req3, res3);

    if (res3.statusCode !== 403) {
        console.log('✅ Owner restored project successfully (Status:', res3.statusCode || 200, ')');
    } else {
        console.error('❌ Owner failed to restore project (Status:', res3.statusCode, res3.data, ')');
    }

    // Test 4: Team Member Restoring Project (Should Fail)
    console.log('\n4. Team Member Restoring Project:');
    const req4 = mockReq({}, 'member123', { id: 'trash123' });
    const res4 = mockRes();

    await restoreProject(req4, res4);

    if (res4.statusCode === 403) {
        console.log('✅ Team Member blocked from restoring project (Correct)');
    } else {
        console.error('❌ Team Member allowed to restore project (Incorrect, Status:', res4.statusCode, ')');
    }
};

runTests().catch(console.error).finally(() => process.exit());
