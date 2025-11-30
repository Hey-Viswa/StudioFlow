import mongoose from 'mongoose';
import ProjectInvoice from '../src/models/ProjectInvoice.js';

// Connect to MongoDB
const MONGODB_URI = 'mongodb://localhost:27017/studioflow';

async function testStatusUpdate() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find a cancelled invoice (or create one)
        let invoice = await ProjectInvoice.findOne({ status: 'cancelled' });

        if (!invoice) {
            console.log('No cancelled invoice found. Creating one...');
            // Create a dummy cancelled invoice if needed, but for now let's just exit if none
            // Actually, let's try to find ANY invoice and set it to cancelled first
            const anyInvoice = await ProjectInvoice.findOne();
            if (anyInvoice) {
                anyInvoice.status = 'cancelled';
                await anyInvoice.save();
                invoice = anyInvoice;
                console.log(`Set invoice ${invoice.invoiceNumber} to cancelled for testing.`);
            } else {
                console.log('No invoices found at all.');
                process.exit(1);
            }
        }

        console.log(`Testing with invoice: ${invoice.invoiceNumber}, Current Status: ${invoice.status}`);

        // 2. Simulate the update logic from the controller
        // We are testing the LOGIC, not the endpoint (unless we use fetch, but direct DB logic is faster to debug)

        const updates = { status: 'overdue' };
        const allowedStatusUpdates = ['draft', 'pending', 'overdue', 'cancelled'];

        if (updates.status && updates.status !== invoice.status) {
            if (!allowedStatusUpdates.includes(updates.status)) {
                console.error('ERROR: Invalid status update blocked by logic.');
            } else {
                console.log('Logic allows status update.');
                invoice.status = updates.status;
            }
        }

        await invoice.save();
        console.log(`New Status: ${invoice.status}`);

        if (invoice.status === 'overdue') {
            console.log('SUCCESS: Status updated to overdue.');
        } else {
            console.log('FAILURE: Status did not update.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testStatusUpdate();
