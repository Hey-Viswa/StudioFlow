
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ProjectBillingConfig from '../src/models/ProjectBillingConfig.js';
import TimeEntry from '../src/models/TimeEntry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
// Try root .env (d:\School\StudioFlow\.env) relative to server/scripts
const envPath = path.resolve(__dirname, '../../../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Defined' : 'Undefined');

const projectId = '693bd8a4eadf2659756fdf57'; // From user logs

const debugState = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🔌 Connected to MongoDB');

        console.log(`\n--- Debugging Project: ${projectId} ---`);

        // 1. Check Billing Config
        const config = await ProjectBillingConfig.findOne({ projectId });
        console.log('\n[ProjectBillingConfig]');
        if (config) {
            console.log(JSON.stringify(config.toJSON(), null, 2));
        } else {
            console.log('❌ No BillingConfig found!');
        }

        // 2. Check Time Entries
        const entries = await TimeEntry.find({ projectId });
        console.log(`\n[TimeEntry] Found ${entries.length} entries`);
        entries.forEach(e => console.log(`- ${e.startTime} to ${e.endTime} (${e.durationMinutes}m)`));

        // 3. Test Update (Simulate what the controller does)
        /*
        console.log('\n[Test] Attempting update...');
        const updated = await ProjectBillingConfig.findOneAndUpdate(
             { projectId },
             { $set: { 'features.hourlyBilling': true } },
             { new: true, upsert: true }
        );
        console.log('[Test] Update result features:', updated.features);
        */

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected');
    }
};

debugState();
