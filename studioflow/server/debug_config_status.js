import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import AutomationRule from './src/models/AutomationRule.js';

// Load Env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function debugSystem() {
    console.log('\n--- Environment Debug ---');
    console.log('FF_PHASE3_AUTOTAGGING:', process.env.FF_PHASE3_AUTOTAGGING);
    console.log('FF_PHASE3_SMART_NOTIFICATIONS:', process.env.FF_PHASE3_SMART_NOTIFICATIONS);
    console.log('FF_PHASE3_TASK_AUTOMATIONS:', process.env.FF_PHASE3_TASK_AUTOMATIONS);
    console.log('ENABLE_REDIS_QUEUE:', process.env.ENABLE_REDIS_QUEUE);

    console.log('\n--- Database Connection ---');
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const ruleCount = await AutomationRule.countDocuments({});
        console.log(`\nFound ${ruleCount} Automation Rules in DB.`);

        if (ruleCount > 0) {
            const rules = await AutomationRule.find({});
            console.log('Rules:', JSON.stringify(rules.map(r => ({ name: r.name, trigger: r.triggerType, actions: r.actions })), null, 2));
        } else {
            console.log('❌ NO RULES FOUND. Run "npm run seed:rules" (or similar) to populate default rules.');
        }

    } catch (err) {
        console.error('❌ DB Connection Failed:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

debugSystem();
