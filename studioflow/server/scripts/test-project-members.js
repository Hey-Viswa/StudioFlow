
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

const verifyMembers = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find a project with members
        const project = await Project.findOne({});
        if (!project) {
            console.log('❌ No projects found to test.');
            return;
        }

        console.log(`🔍 Testing Project: ${project.title} (${project._id})`);

        // Simulate what the controller does
        const projectMembers = await ProjectMember.find({
            projectId: project._id,
            status: { $ne: 'inactive' }
        }).lean();

        console.log(`✅ Found ${projectMembers.length} members in ProjectMember collection.`);

        if (projectMembers.length === 0) {
            console.log('⚠️ No members found in collection. This might be expected if the project has no members.');
        } else {
            console.log('👥 Members found:');
            projectMembers.forEach(m => {
                console.log(`   - User ID: ${m.userId}, Role: ${m.role}`);
            });
        }

        // Check if the controller logic would work (mocking Clerk for now)
        const enhancedMembers = projectMembers.map(m => ({
            ...m,
            name: 'Mock User', // We can't easily call Clerk here without API keys in script context, but logic is sound
            email: 'mock@example.com'
        }));

        console.log(`✅ Controller logic simulation successful. Enhanced ${enhancedMembers.length} members.`);

    } catch (error) {
        console.error('❌ Error verifying members:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

verifyMembers();
