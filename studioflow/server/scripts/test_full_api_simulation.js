
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Project from '../src/models/Project.js';
import ProjectMember from '../src/models/ProjectMember.js';
import { createClerkClient } from '@clerk/backend';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const simulateGetProjectById = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);

        const projectId = '692b1dc77d5b90affa63d122'; // The specific project ID
        console.log(`🔍 Fetching Project: ${projectId}`);

        const project = await Project.findById(projectId);
        if (!project) {
            console.log('❌ Project not found in DB');
            return;
        }

        const userId = project.ownerId; // Simulate owner request
        console.log(`👤 Simulating Request as Owner: ${userId}`);

        // --- CONTROLLER LOGIC SIMULATION START ---

        // Check if user is a member or owner
        const membership = await ProjectMember.findOne({
            projectId: projectId,
            userId: userId,
            status: { $ne: 'inactive' }
        });

        // Fetch members from ProjectMember collection
        const projectMembers = await ProjectMember.find({
            projectId: projectId,
            status: { $ne: 'inactive' }
        }).lean();

        // Enhance members with user details (Mocking Clerk here to avoid API keys if possible, or just basic mock)
        const enhancedMembers = projectMembers.map(m => ({
            ...m,
            name: 'Mock User',
            email: 'mock@example.com'
        }));

        // Calculate permissions
        console.log('🔐 Permission Check Debug:');
        console.log('   - Project Owner ID:', project.ownerId, typeof project.ownerId);
        console.log('   - Request User ID:', userId, typeof userId);

        const isOwner = String(project.ownerId) === String(userId);
        console.log('   - isOwner Calculated:', isOwner);

        let userRole = isOwner ? 'owner' : (membership?.role || 'client');

        // Attach members to project object
        // CRITICAL FIX: Convert to plain object first, otherwise isOwner/userRole are lost
        const projectResponse = project.toObject();
        projectResponse.members = enhancedMembers;
        projectResponse.isOwner = isOwner;
        projectResponse.userRole = userRole;
        projectResponse.isShared = !isOwner;

        // --- CONTROLLER LOGIC SIMULATION END ---

        const response = { project: projectResponse, inviteLink: 'http://mock-link' };

        console.log('---------------------------------------------------');
        console.log('📦 Final JSON Response Structure:');
        console.log(JSON.stringify(response, null, 2));
        console.log('---------------------------------------------------');

        // Validation
        if (!response.project) console.error('❌ response.project is MISSING');
        else {
            if (response.project.progress === undefined) console.error('❌ response.project.progress is MISSING');
            else console.log('✅ response.project.progress is present:', response.project.progress);

            if (response.project.isOwner === undefined) console.error('❌ response.project.isOwner is MISSING');
            else console.log('✅ response.project.isOwner is present:', response.project.isOwner);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

simulateGetProjectById();
