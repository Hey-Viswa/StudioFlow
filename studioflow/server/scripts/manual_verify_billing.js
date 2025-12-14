import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Project from '../src/models/Project.js';
import ProjectBillingConfig from '../src/models/ProjectBillingConfig.js';
import TimeEntry from '../src/models/TimeEntry.js';
import ProjectInvoice from '../src/models/ProjectInvoice.js';
import ProjectMember from '../src/models/ProjectMember.js';
import { generateProjectInvoice } from '../src/controllers/projectInvoiceController.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🔍 Checking Environment...');
console.log('ENABLE_ADVANCED_BILLING:', process.env.ENABLE_ADVANCED_BILLING);

if (process.env.ENABLE_ADVANCED_BILLING !== 'true') {
    console.error('❌ ENABLE_ADVANCED_BILLING is not set to "true". Verification cannot proceed.');
    process.exit(1);
}

const TEST_ID = 'verify_' + Date.now();
const MOCK_USER_ID = 'user_' + TEST_ID;

async function runVerification() {
    try {
        console.log('🔌 Connecting to Database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        // 1. Setup Test Data
        console.log('\n🛠️  Creating Test Data...');

        // Create Project
        const project = await Project.create({
            title: `Verification Project ${TEST_ID}`,
            ownerId: MOCK_USER_ID,
            status: 'active'
        });
        console.log('  - Project created:', project._id);

        // Create Member (Client)
        await ProjectMember.create({
            projectId: project._id,
            userId: 'client_' + TEST_ID,
            role: 'client',
            status: 'active',
            email: 'client@test.com',
            name: 'Test Client'
        });

        // Create Billing Config
        await ProjectBillingConfig.create({
            projectId: project._id,
            hourlyRate: 100, // $100/hr
            features: { hourlyBilling: true, autoDiscounts: true },
            discounts: [{ code: 'TEST', type: 'percentage', value: 20, active: true }]
        });
        console.log('  - Billing Config created ($100/hr, 20% discount)');

        // Create Time Entries (pending)
        const t1 = await TimeEntry.create({
            projectId: project._id,
            userId: MOCK_USER_ID,
            description: 'Backend Work',
            startTime: new Date(Date.now() - 3600000), // 1 hour ago
            endTime: new Date(),
            durationMinutes: 60,
            billable: true
        });
        console.log('  - Time Entry created (60 mins)');

        // 2. Run Invoice Generation
        console.log('\n🚀 Triggering Invoice Generation...');

        // Mock Express Request/Response
        const req = {
            params: { projectId: project._id.toString() },
            userId: MOCK_USER_ID,
            body: {
                items: [{ title: 'Fixed Service', rate: 500, quantity: 1 }],
                dueDate: new Date(Date.now() + 86400000), // Tomorrow
                includeUnbilledHours: true // <--- THE KEY FLAG
            }
        };

        const res = {
            status: (code) => ({
                json: (data) => {
                    handleResponse(code, data);
                }
            }),
            json: (data) => handleResponse(200, data)
        };

        let generatedInvoiceId = null;

        const handleResponse = (code, data) => {
            if (code >= 400) {
                console.error('❌ API Error:', data);
                throw new Error('API request failed');
            }

            console.log('✅ API Success!');
            if (data.invoice) {
                const inv = data.invoice;
                generatedInvoiceId = inv.id;
                console.log('  Invoice Number:', inv.invoiceNumber);
                console.log('  Total:', inv.total);
            }
        };

        // Call Controller
        await generateProjectInvoice(req, res);

        // 3. Verify Results
        console.log('\n🔎 Verifying Results...');
        const invoice = await ProjectInvoice.findById(generatedInvoiceId);

        let passed = true;

        // Check Items
        const hoursItem = invoice.items.find(i => i.title.includes('Backend Work'));
        if (hoursItem) {
            console.log('  ✅ Found Time Entry item:', hoursItem.title, `(${hoursItem.amount})`);
        } else {
            console.error('  ❌ Missing Time Entry item!');
            passed = false;
        }

        // Check Discount (20% of (500 + 100) = 120)
        // Subtotal = 500 (fixed) + 100 (1hr * 100) = 600.
        // Discount = 20% of 600 = 120.
        // Total = 480.
        if (invoice.discount.percentage === 20) {
            console.log('  ✅ Discount verified: 20% applied');
        } else {
            console.error('  ❌ Discount mismatch:', invoice.discount);
            passed = false;
        }

        // Check Time Entry Status
        const updatedTimeEntry = await TimeEntry.findById(t1._id);
        if (updatedTimeEntry.status === 'invoiced' && String(updatedTimeEntry.invoiceId) === String(invoice._id)) {
            console.log('  ✅ Time Entry marked as invoiced');
        } else {
            console.error('  ❌ Time Entry status incorrect:', updatedTimeEntry.status);
            passed = false;
        }

        // 4. Cleanup
        console.log('\n🧹 Cleaning up...');
        await Project.findByIdAndDelete(project._id);
        await ProjectMember.deleteMany({ projectId: project._id });
        await ProjectBillingConfig.deleteMany({ projectId: project._id });
        await TimeEntry.deleteMany({ projectId: project._id });
        if (invoice) await ProjectInvoice.findByIdAndDelete(invoice._id);
        console.log('✅ Cleanup complete.');

        if (passed) {
            console.log('\n✨ VERIFICATION SUCCESSFUL ✨');
            process.exit(0);
        } else {
            console.error('\n⚠️ VERIFICATION FAILED');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Script Error:', error);
        process.exit(1);
    }
}

runVerification();
