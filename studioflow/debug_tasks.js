import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Task from './server/src/models/Task.js';
import Project from './server/src/models/Project.js';

dotenv.config({ path: './server/.env' });

const checkTasks = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        console.log('--- Recent Tasks (Last 10 min) ---');
        const tasks = await Task.find({ createdAt: { $gte: tenMinutesAgo } }).sort({ createdAt: -1 });

        if (tasks.length === 0) {
            console.log('No tasks found.');
        } else {
            for (const task of tasks) {
                console.log(`Task: ${task.title} (ID: ${task._id})`);
                console.log(`  Project ID: ${task.projectId}`);
                console.log(`  Status: ${task.status}`);
                console.log(`  Tags: ${task.tags}`);
                console.log(`  Created By: ${task.assignedBy}`);

                // Check Project details
                const project = await Project.findById(task.projectId);
                console.log(`  -> Project Name: ${project ? project.title : 'UNKNOWN'}`);
            }
        }

        console.log('----------------------------------');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkTasks();
