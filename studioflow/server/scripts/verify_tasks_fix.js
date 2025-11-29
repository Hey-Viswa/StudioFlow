
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTasks } from '../src/controllers/taskCommentController.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const verifyFix = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);

        const projectId = '692b1dc77d5b90affa63d122'; // Target Project
        const ownerId = 'user_34ahC8n6ajkmZSIkEgnhz8PUh8k'; // Owner ID

        console.log(`\n🎯 Testing getTasks for Project: ${projectId}`);
        console.log(`   User (Owner): ${ownerId}`);

        // Mock Request and Response
        const req = {
            params: { projectId },
            userId: ownerId,
            app: { get: () => null } // Mock req.app.get('io')
        };

        const res = {
            status: (code) => {
                console.log(`   Response Status: ${code}`);
                return res;
            },
            json: (data) => {
                if (data.error) {
                    console.log(`❌ Error: ${data.error}`);
                } else {
                    console.log('✅ Success!');
                    console.log(`   Tasks Count: ${data.tasks?.length}`);
                    console.log(`   Stats:`, data.stats);
                }
                return res;
            }
        };

        await getTasks(req, res);

    } catch (error) {
        console.error('❌ Script Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

verifyFix();
