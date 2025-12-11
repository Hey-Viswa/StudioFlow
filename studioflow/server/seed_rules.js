import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const seedRules = async () => {
    try {
        console.log('🌱 Seeding Automation Rules...');
        console.log(`Target URI: ${process.env.MONGODB_URI}`);

        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is undefined!');
        }

        await mongoose.connect(process.env.MONGODB_URI);
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
