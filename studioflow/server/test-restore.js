import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './src/models/Project.js';
import Trash from './src/models/Trash.js';
import { connectDB } from './src/config/db.js';

dotenv.config({ path: '../.env' }); // Adjusted for test script in server dir

async function testRestore() {
    await connectDB();
    console.log('Connected to DB');

    try {
        const userId = "test_user_123";

        // Create dummy project
        const project = new Project({
            title: 'Test Restore Project',
            brief: 'Test',
            ownerId: userId,
            dueDate: new Date()
        });
        await project.save();
        console.log('Created project:', project._id);

        // Dummy soft delete
        const trashEntry = new Trash({
            originalProjectId: project._id.toString(),
            title: project.title,
            brief: project.brief,
            ownerId: project.ownerId,
            status: project.status,
            deletedBy: userId,
            deletedByName: 'Test User',
            fullProjectData: project.toObject()
        });

        await trashEntry.save();
        console.log('Created trash entry:', trashEntry._id);

        await Project.findByIdAndDelete(project._id);
        console.log('Deleted project from main collection');

        // MOCK RESTORE 
        const restoredProject = new Project(trashEntry.fullProjectData);
        await restoredProject.save();
        console.log('Restored project successfully:', restoredProject._id);

        // Cleanup
        await Project.findByIdAndDelete(restoredProject._id);
        await Trash.findByIdAndDelete(trashEntry._id);

        console.log('Test successful');
    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        process.exit(0);
    }
}

testRestore();
