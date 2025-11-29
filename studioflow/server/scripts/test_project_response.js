
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Project from '../src/models/Project.js';
import ProjectMember from '../src/models/ProjectMember.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const testProjectResponse = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find a project
        const project = await Project.findOne({});
        if (!project) {
            console.log('❌ No projects found.');
            return;
        }

        const userId = project.ownerId; // Simulate owner request
        console.log(`🔍 Testing Project: ${project.title} (${project._id})`);
        console.log(`👤 Simulating Request as Owner: ${userId}`);

        // Simulate Controller Logic (getProjectById)
        // ---------------------------------------------------------

        // 1. Fetch members
        const projectMembers = await ProjectMember.find({
            projectId: project._id,
            status: { $ne: 'inactive' }
        }).lean();

        // 2. Enhance members (mocked)
        const enhancedMembers = projectMembers.map(m => ({
            ...m,
            name: 'Mock User',
            email: 'mock@example.com'
        }));

        // 3. Calculate isOwner
        const isOwner = String(project.ownerId) === String(userId);

        // 4. Calculate userRole
        let userRole = null;
        if (isOwner) {
            userRole = 'owner';
        }

        // 5. Attach members & Fix Response Structure
        // CRITICAL FIX: Convert to plain object first
        const projectResponse = project.toObject();
        projectResponse.members = enhancedMembers;
        projectResponse.isOwner = isOwner;
        projectResponse.userRole = userRole;
        projectResponse.isShared = !isOwner;

        const jsonOutput = JSON.parse(JSON.stringify(projectResponse));

        console.log('---------------------------------------------------');
        console.log('📦 JSON Output (what the frontend sees):');
        console.log('isOwner:', jsonOutput.isOwner);
        console.log('userRole:', jsonOutput.userRole);
        console.log('members:', jsonOutput.members ? `Array(${jsonOutput.members.length})` : 'undefined');
        console.log('---------------------------------------------------');

        if (jsonOutput.isOwner === undefined) {
            console.error('❌ BUG PERSISTS: isOwner is missing from response!');
        } else {
            console.log('✅ SUCCESS: isOwner is present.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

testProjectResponse();
