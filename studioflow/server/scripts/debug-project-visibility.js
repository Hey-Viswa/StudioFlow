import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Project from '../src/models/Project.js';
import ProjectMember from '../src/models/ProjectMember.js';
import User from '../src/models/User.js';

// Configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple paths
const envPaths = [
    path.resolve(__dirname, '../.env'), // server/.env
    path.resolve(__dirname, '../../.env'), // studioflow/.env
    path.resolve(__dirname, '../../../.env') // root/.env
];

let loaded = false;
for (const p of envPaths) {
    const result = dotenv.config({ path: p });
    if (!result.error) {
        loaded = true;
        break;
    }
}

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

const debugProjects = async () => {
    try {
        if (!mongoUri) {
            throw new Error('MONGO_URI not set');
        }
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // List all projects
        const projects = await Project.find({});
        console.log(`\n=== SUMMARY ===`);
        console.log(`Total Projects in DB: ${projects.length}`);

        for (const p of projects) {
            console.log(`\n[Project] ${p.title} (ID: ${p._id})`);
            console.log(`  Owner: ${p.ownerId}`);
            console.log(`  Status: ${p.status}`);
            console.log(`  DeletedAt: ${p.deletedAt}`);

            // Find members in ProjectMember collection
            const members = await ProjectMember.find({ projectId: p._id });
            console.log(`  ProjectMember Count: ${members.length}`);
            members.forEach(m => {
                console.log(`    - Member: ${m.userId} (${m.role})`);
            });
        }
        console.log(`\n=== END SUMMARY ===`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
};

debugProjects();
