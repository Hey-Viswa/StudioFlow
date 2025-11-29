import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProjectInvoice from '../src/models/ProjectInvoice.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from CWD (server directory)
dotenv.config();

const checkInvoices = async () => {
    const logFile = path.join(__dirname, 'invoice_check_output.txt');
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    try {
        fs.writeFileSync(logFile, ''); // Clear file
        log(`CWD: ${process.cwd()}`);
        log(`Env Keys: ${Object.keys(process.env).join(', ')}`);
        log(`URI Loaded: ${!!process.env.MONGO_URI}`);

        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is missing');
        }

        await mongoose.connect(process.env.MONGO_URI);
        log('Connected to MongoDB');

        const paidInvoices = await ProjectInvoice.find({ status: 'paid' }).lean();

        log(`Found ${paidInvoices.length} paid invoices.`);

        let missingPaidAt = 0;
        let timezoneIssues = 0;

        paidInvoices.forEach(inv => {
            const paidAt = inv.paidAt ? new Date(inv.paidAt) : null;
            const createdAt = new Date(inv.createdAt);
            const updatedAt = new Date(inv.updatedAt);

            log(`Invoice ${inv.invoiceNumber}:`);
            log(`  Status: ${inv.status}`);
            log(`  Created: ${createdAt.toISOString()}`);
            log(`  Updated: ${updatedAt.toISOString()}`);
            log(`  PaidAt:  ${paidAt ? paidAt.toISOString() : 'MISSING'}`);

            if (!paidAt) {
                missingPaidAt++;
                log('  ⚠️  MISSING paidAt');
            } else {
                const hour = paidAt.getUTCHours();
                if (hour >= 18 || hour <= 6) {
                    log('  🕒 Potential timezone boundary (late UTC/early IST)');
                    timezoneIssues++;
                }
            }
            log('---');
        });

        log(`Summary:`);
        log(`  Total Paid: ${paidInvoices.length}`);
        log(`  Missing PaidAt: ${missingPaidAt}`);
        log(`  Timezone Boundary: ${timezoneIssues}`);

    } catch (error) {
        log('Error: ' + error);
    } finally {
        await mongoose.disconnect();
    }
};

checkInvoices();
