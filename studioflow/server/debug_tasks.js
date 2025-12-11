import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Task from './src/models/Task.js';
import Project from './src/models/Project.js';

import path from 'path';

console.log('CWD:', process.cwd());
dotenv.config({ path: 'd:/School/StudioFlow/studioflow/server/.env' });
console.log('URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');

const checkTasks = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const tenMinutesAgo = new Date(Date.now() - 20 * 60 * 1000); // Check last 20 mins

        console.log('--- Recent Tasks ---');
        const tasks = await Task.find({ createdAt: { $gte: tenMinutesAgo } }).sort({ createdAt: -1 });

        if (tasks.length === 0) {
            console.log('No tasks found.');
        } else {
            for (const task of tasks) {
                console.log(`Task: ${task.title} (ID: ${task._id})`);
                console.log(`  Project ID: ${task.projectId}`);
                console.log(`  Status: ${task.status}`);
                console.log(`  Tags: ${task.tags}`);
                console.log(`  Created At: ${task.createdAt}`);

                // Check Project details
                const project = await Project.findById(task.projectId);
                console.log(`  -> Project Name: ${project ? project.title : 'UNKNOWN'}`);
            }
        }

        console.log('--------------------');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkTasks();
