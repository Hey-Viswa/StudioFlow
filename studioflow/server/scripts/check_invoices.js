import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ProjectInvoice from '../src/models/ProjectInvoice.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Root is at ../../../ relative to scripts/ (scripts -> server -> studioflow -> StudioFlow)
const envPath = path.resolve(__dirname, '../../../.env');
console.log('Loading env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.log('Dotenv error:', result.error);
}

console.log('MONGODB_URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 'undefined');
console.log('ENABLE_SHOWCASE_MODE:', process.env.ENABLE_SHOWCASE_MODE);

const checkPayment = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            // Fallback for debugging if file read fails, try hardcoded or ask user? 
            // Better to fail and ask.
            throw new Error('MONGODB_URI is still missing.');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const projectId = '693eb584224457595eeb873e'; // From screenshot
        
        console.log(`Checking invoices for Project: ${projectId}`);
        
        const invoices = await ProjectInvoice.find({ projectId });
        
        if (invoices.length === 0) {
            console.log('No invoices found for this project.');
        } else {
            console.log(`Found ${invoices.length} invoices:`);
            invoices.forEach(inv => {
                console.log(`- Invoice ${inv.invoiceNumber}: Status=${inv.status}, Amount=${inv.amount}`);
            });
            
            const hasUnpaid = invoices.some(inv => 
                ['pending', 'overdue', 'partially_paid', 'draft', 'sent'].includes(inv.status)
            );
            
            console.log('--------------------------------');
            console.log(`Has Unpaid Invoices? ${hasUnpaid}`);
            console.log(`Can Publish? ${!hasUnpaid}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkPayment();
