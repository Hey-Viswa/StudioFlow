import mongoose from 'mongoose';
import Project from '../src/models/Project.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};

const seedComment = async () => {
    await connectDB();

    try {
        const project = await Project.findOne();
        if (!project) {
            console.error('No projects found');
            process.exit(1);
        }

        const comment = {
            userId: project.ownerId,
            userName: 'Test Bot',
            text: 'This is a test comment with an attachment.',
            createdAt: new Date(),
            attachments: [
                {
                    name: 'test_upload.txt',
                    url: 'http://localhost:5000/uploads/1764427265615-803047645.txt',
                    type: 'text/plain',
                    size: 55
                },
                {
                    name: 'demo_image.png',
                    url: 'https://placehold.co/600x400/png',
                    type: 'image/png',
                    size: 1024
                }
            ]
        };

        project.comments.push(comment);
        await project.save();

        console.log(`Comment added to project ${project._id}`);
        console.log(`Project URL: http://localhost:3002/dashboard/projects/${project._id}`);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding comment:', error);
        process.exit(1);
    }
};

seedComment();
