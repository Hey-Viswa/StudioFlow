import { notificationBatchQueue } from '../queues/notificationBatchQueue.js';
import NotificationBatch from '../models/NotificationBatch.js';
import { sendEmail, isMessagingAvailable } from '../config/appwriteMessaging.js';
import NotificationPreference from '../models/NotificationPreference.js';

// Process Batch Digest Jobs
// This can be triggered by a Cron job adding a 'process-batches' job to the queue,
// or we can just run a loop here. 
// For better scalability, we use the queue to process SPECIFIC batches if needed, 
// or a "tick" job that finds all ready batches.

// Let's implement a "Process Ready Batches" job
notificationBatchQueue.process('process-analyzed-batches', async (job) => {
    console.log('📦 Starting Batch Digest Processing...');

    // Find all batches that are pending and ready to send
    const now = new Date();
    const batches = await NotificationBatch.find({
        status: 'pending',
        processAfter: { $lte: now }
    }).limit(20); // Process in chunks

    console.log(`Found ${batches.length} batches ready for processing.`);

    for (const batch of batches) {
        try {
            // Update status to processing
            batch.status = 'processing';
            await batch.save();

            // Generate Email Content
            const emailContent = generateDigestHtml(batch.notifications);

            // Send Email
            // We need to fetch user email (reusing logic from notificationService ideally, but duplicate for now to avoid circular deps if complex)
            // Assuming we helper or use Appwrite
            // For now, let's mock the send or use provided utils if imported

            console.log(`📧 Sending Digest Email to User ${batch.userId} with ${batch.notifications.length} items.`);

            if (isMessagingAvailable()) {
                // Fetch user email - TODO: Refactor into shared User service
                // const userEmail = ...
                // await sendEmail(...)
                console.log('   (Appwrite Email Sending Placeholder)');
            } else {
                console.log('   (Mock Email Sent)');
            }

            // Mark complete
            batch.status = 'completed';
            await batch.save();

        } catch (error) {
            console.error(`❌ Failed to process batch ${batch._id}:`, error);
            batch.status = 'failed';
            batch.error = error.message;
            await batch.save();
        }
    }
});

const generateDigestHtml = (notifications) => {
    const listItems = notifications.map(n => `
        <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
            <div style="font-weight: bold; color: #333;">${n.title}</div>
            <div style="color: #666; font-size: 14px;">${n.message}</div>
            ${n.link ? `<a href="${process.env.FRONTEND_URL || 'http://localhost:3002'}${n.link}" style="color: #4F46E5; font-size: 12px; text-decoration: none;">View</a>` : ''}
        </div>
    `).join('');

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your StudioFlow Digest</h2>
            <p>Here's a summary of what happened while you were away.</p>
            <div style="margin-top: 20px;">
                ${listItems}
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
                You are receiving this because you enabled Daily/Weekly digests.
            </p>
        </div>
    `;
};

// Start function (to be called from index.js if we want a dedicated worker process for this)
export const startNotificationBatchWorker = () => {
    console.log('📦 Notification Batch Worker initialized.');
};

export default startNotificationBatchWorker;
