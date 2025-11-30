
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ProjectInvoice from '../src/models/ProjectInvoice.js';
import Project from '../src/models/Project.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Assume we are in server/scripts, so .env is in ../.env
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env:', result.error);
}

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifyTransition() {
    log('\n🧪 Verifying Invoice Status Transition (Overdue -> Pending)\n', 'cyan');

    try {
        // 1. Connect to MongoDB
        log('1️⃣  Connecting to MongoDB...', 'yellow');
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI is not defined in .env');
        }
        // Mask the URI for logging
        log(`   URI: ${mongoUri.substring(0, 20)}...`, 'blue');

        await mongoose.connect(mongoUri);
        log('   ✅ Connected successfully!', 'green');

        // 2. Create Test Data
        log('\n2️⃣  Creating test data...', 'yellow');

        const project = await Project.create({
            title: 'Test Project for Invoice Verification',
            description: 'Temporary project',
            status: 'active',
            ownerId: 'test_user_123',
            members: []
        });
        log(`   ✅ Created Project: ${project._id}`, 'green');

        const invoice = await ProjectInvoice.create({
            projectId: project._id,
            userId: 'test_user_123',
            invoiceNumber: `TEST-${Date.now()}`,
            client: { name: 'Test Client', email: 'test@example.com' },
            items: [{ title: 'Test Item', quantity: 1, rate: 100, amount: 100 }],
            subtotal: 100,
            total: 100,
            currency: 'INR',
            status: 'overdue',
            issueDate: new Date(Date.now() - 86400000 * 10),
            dueDate: new Date(Date.now() - 86400000),
        });
        log(`   ✅ Created Invoice: ${invoice.invoiceNumber} with status: ${invoice.status}`, 'green');

        // 3. Perform Transition
        log('\n3️⃣  Attempting transition Overdue -> Pending...', 'yellow');

        invoice.status = 'pending';
        await invoice.save();

        log(`   ✅ Invoice saved.`, 'green');

        // 4. Verify Persistence
        log('\n4️⃣  Verifying persistence...', 'yellow');
        const updatedInvoice = await ProjectInvoice.findById(invoice._id);
        log(`   Current Status: ${updatedInvoice.status}`, 'blue');

        if (updatedInvoice.status === 'pending') {
            log('   ✅ SUCCESS: Status transitioned to Pending!', 'green');
        } else {
            log(`   ❌ FAILURE: Status is ${updatedInvoice.status}`, 'red');
            throw new Error('Transition failed');
        }

        // 5. Cleanup
        log('\n5️⃣  Cleaning up...', 'yellow');
        await ProjectInvoice.findByIdAndDelete(invoice._id);
        await Project.findByIdAndDelete(project._id);
        log('   ✅ Cleanup complete', 'green');

    } catch (error) {
        log(`\n❌ Error: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        log('\n🏁 Done.', 'cyan');
    }
}

verifyTransition();
