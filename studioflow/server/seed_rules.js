import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

const seedRules = async () => {
    try {
        console.log('🌱 Seeding Automation Rules...');
        console.log(`Target URI: ${process.env.MONGODB_URI || process.env.MONGO_URI}`);

        const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!dbUri) {
            throw new Error('MONGODB_URI (or MONGO_URI) is undefined!');
        }

        await mongoose.connect(dbUri);
        const { default: AutomationRule } = await import('./src/models/AutomationRule.js');

        // Define Default Rules
        const defaults = [
            {
                name: 'Auto-tag Images',
                description: 'Automatically tag image files',
                isActive: true,
                scope: 'global',
                triggerType: 'file.created',
                conditions: [
                    {
                        field: 'extension',
                        operator: 'regex',
                        value: 'jpg|jpeg|png|gif|webp|svg'
                    }
                ],
                actions: [
                    {
                        type: 'add_tag',
                        params: { tag: 'image' }
                    }
                ],
                priority: 10
            },
            {
                name: 'Auto-tag PDFs',
                description: 'Automatically tag PDF documents',
                isActive: true,
                scope: 'global',
                triggerType: 'file.created',
                conditions: [
                    {
                        field: 'extension',
                        operator: 'equals',
                        value: 'pdf'
                    }
                ],
                actions: [
                    {
                        type: 'add_tag',
                        params: { tag: 'document' }
                    }
                ],
                priority: 10
            },
            {
                name: 'Auto-tag Videos',
                description: 'Automatically tag video files',
                isActive: true,
                scope: 'global',
                triggerType: 'file.created',
                conditions: [
                    {
                        field: 'extension',
                        operator: 'regex',
                        value: 'mp4|mov|avi|mkv'
                    }
                ],
                actions: [
                    {
                        type: 'add_tag',
                        params: { tag: 'video' }
                    }
                ],
                priority: 10
            },
            {
                name: 'Bug Report to Task',
                description: 'Create high priority task from #bug comments',
                isActive: true,
                scope: 'global',
                triggerType: 'comment.created',
                conditions: [
                    {
                        field: 'content',
                        operator: 'contains',
                        value: '#bug'
                    }
                ],
                actions: [
                    {
                        type: 'create_task',
                        params: {
                            label: 'bug',
                            priority: 'high'
                        }
                    }
                ],
                priority: 10
            }
        ];

        // Upsert Rules
        for (const rule of defaults) {
            await AutomationRule.findOneAndUpdate(
                { name: rule.name },
                rule,
                { upsert: true, new: true }
            );
            console.log(`✅ Rule upserted: ${rule.name}`);
        }

        console.log('✅ Seeding complete.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding rules:', error);
        process.exit(1);
    }
};

seedRules();
