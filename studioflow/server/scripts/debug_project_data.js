
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

const debugProject = async () => {
    try {
        console.log('� Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);

        const projectId = '692b1dc77d5b90affa63d122'; // Target Project
        console.log(`\n🎯 Analyzing Project: ${projectId}`);

        const project = await Project.findById(projectId);
        if (!project) {
            console.log('❌ Project not found!');
            return;
        }

        console.log('✅ Project Found:', project.title);
        console.log('   Owner ID:', project.ownerId);
        console.log('   Status:', project.status);
        console.log('   Tasks Count:', project.tasks?.length || 0);
        console.log('   Members (Embedded):', project.members);

        console.log('\n🔍 Checking ProjectMember Collection:');
        const members = await ProjectMember.find({ projectId });
        console.log('   Found Members:', members.length);
        members.forEach(m => {
            console.log(`   - User: ${m.userId}, Role: ${m.role}, Status: ${m.status}`);
        });

        // Check if Owner has a ProjectMember entry
        const ownerMember = members.find(m => String(m.userId) === String(project.ownerId));
        if (!ownerMember) {
            console.log('\n⚠️ WARNING: Project Owner does NOT have a ProjectMember entry!');
            console.log('   This might cause issues if logic relies solely on ProjectMember.');
        } else {
            console.log('\n✅ Owner has ProjectMember entry.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

debugProject();
