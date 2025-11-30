
import mongoose from 'mongoose';
console.log('Mongoose imported');
try {
    await import('../src/models/ProjectInvoice.js');
    console.log('ProjectInvoice imported');
    await import('../src/models/Project.js');
    console.log('Project imported');
} catch (e) {
    console.error('Import error:', e);
}
