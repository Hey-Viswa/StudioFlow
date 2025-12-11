import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const checkTask = async () => {
    try {
        console.log('URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Define a minimal schema
        const TaskSchema = new mongoose.Schema({}, { strict: false });
        const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);

        // Check for the specific task ID
        const taskId = '693aeed29a5d9d3a9426811d';
        const task = await Task.findById(taskId).lean();

        console.log('\n=== Task Query Result ===');
        if (task) {
            console.log('✅ Task FOUND:');
            console.log(JSON.stringify(task, null, 2));
        } else {
            console.log('❌ Task NOT FOUND in database');
        }

        // Also check total recent tasks
        const recentTasks = await Task.find({}).sort({ createdAt: -1 }).limit(5).lean();
        console.log(`\n=== Last 5 Tasks in DB ===`);
        console.log(`Total: ${recentTasks.length}`);
        recentTasks.forEach(t => {
            console.log(`- ${t._id}: ${t.title} (project: ${t.projectId}, status: ${t.status})`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

checkTask();
