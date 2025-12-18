import mongoose from 'mongoose';
import Content from '../src/models/Content.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const inspectContent = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const posts = await Content.find({}).select('title userId status author type createdAt');
        
        console.log('\n=== CONTENT AUDIT ===');
        posts.forEach(p => {
            console.log(`[${p.type}] "${p.title}"`);
            console.log(`    Status: ${p.status}`);
            console.log(`    UserId: ${p.userId}`);
            console.log(`    Author: ${p.author}`);
            console.log(`    Created: ${p.createdAt}`);
            console.log('---');
        });

        console.log(`Total: ${posts.length} posts`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

inspectContent();
