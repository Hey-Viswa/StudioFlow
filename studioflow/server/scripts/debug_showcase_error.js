import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/Project.js';
import ProjectInvoice from '../src/models/ProjectInvoice.js';
import User from '../src/models/User.js';

import path from 'path';
import { fileURLToPath } from 'url';
// import '../src/config/env.js'; // Disable standard config to avoid confusion

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Assuming we are running from 'server' dir
console.log('CWD:', process.cwd());
dotenv.config({ path: path.join(process.cwd(), '.env') }); 

console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Caught' : 'Missing');

const debugProject = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const projectId = '693eb584224457595eeb873e';

        const project = await Project.findById(projectId);
        if (!project) {
            console.log('Project not found');
            return;
        }

        console.log('Project Found:', project.title);
        console.log('Project OwnerId:', project.ownerId);

        // Check invoices
        const invoices = await ProjectInvoice.find({ projectId });
        console.log(`Found ${invoices.length} invoices:`);
        invoices.forEach(inv => {
            console.log(`- ID: ${inv._id}, Number: ${inv.invoiceNumber}, Status: ${inv.status}, Amount: ${inv.amount}`);
        });

        // Check User (owner)
        const owner = await User.findOne({ clerkUserId: project.ownerId });
        if (owner) {
            console.log('Owner User Found:', owner.name, owner.email, owner.clerkUserId);
        } else {
            console.log('Owner User NOT found in local DB with clerkUserId:', project.ownerId);
            // Maybe ownerId is ObjectId?
            const ownerObj = await User.findById(project.ownerId);
            if (ownerObj) {
                console.log('Owner User found by ObjectId:', ownerObj.name, ownerObj.clerkUserId);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugProject();
