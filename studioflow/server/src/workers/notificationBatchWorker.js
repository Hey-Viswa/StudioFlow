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
            // Fetch User for Email
            const { default: User } = await import('../models/User.js');
            const user = await User.findById(batch.userId);

            if (user && user.email) {
                console.log(`📧 Sending Digest Email to ${user.email} with ${batch.notifications.length} items.`);

                await sendEmail(
                    user.email,
                    `StudioFlow Digest: ${batch.notifications.length} new notifications`,
                    emailContent
                );
                console.log('✅ Digest Email sent successfully.');
            } else {
                console.warn(`⚠️ User or email not found for batch ${batch._id}. Skipping email.`);
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

export const generateDigestHtml = (notifications) => {
    // Group notifications by resource info (heuristic: same link or same resource ID if available)
    const groups = {};

    notifications.forEach(n => {
        const key = n.link ? n.link.split('?')[0] : 'General';
        if (!groups[key]) {
            groups[key] = {
                title: n.data?.resourceName || n.title || 'Update',
                resourceType: n.data?.resourceType || 'General',
                items: [],
                link: n.link
            };
        }
        groups[key].items.push(n);
    });

    const groupHtml = Object.values(groups).map(group => {
        const itemsHtml = group.items.map(n => `
            <div style="
                padding: 12px 0;
                border-bottom: 1px solid #f0f0f0;
                display: flex;
                align-items: flex-start;
                gap: 12px;
            ">
               <div style="flex: 1;">
                 <div style="color: #374151; font-size: 14px; line-height: 1.5;">${n.message}</div>
                 <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">
                   ${new Date(n.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} • ${n.title}
                 </div>
               </div>
            </div>
        `).join('');

        // Card styling
        return `
            <div style="
                margin-bottom: 24px;
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            ">
                <div style="
                    background: #f9fafb;
                    padding: 16px;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">
                       <a href="${process.env.FRONTEND_URL || 'http://localhost:3002'}${group.link}" style="text-decoration: none; color: inherit;">
                          ${group.title}
                       </a>
                    </h3>
                    <span style="
                        background: #eff6ff;
                        color: #4f46e5;
                        font-size: 11px;
                        font-weight: 600;
                        padding: 4px 8px;
                        border-radius: 9999px;
                        text-transform: uppercase;
                    ">
                        ${group.items.length} Updates
                    </span>
                </div>
                
                <div style="padding: 0 16px;">
                    ${itemsHtml}
                </div>

                 <div style="padding: 16px; background: #fdfdfd; text-align: center; border-top: 1px solid #f3f4f6;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3002'}${group.link}" style="
                        display: inline-block;
                        color: #4f46e5;
                        font-size: 13px;
                        font-weight: 600;
                        text-decoration: none;
                    ">
                        View Details &rarr;
                    </a>
                </div>
            </div>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">Your Daily Briefing</h1>
                    <p style="color: #6b7280; font-size: 16px; margin: 0;">You have ${notifications.length} new updates to review.</p>
                </div>
                
                ${groupHtml}

                <div style="text-align: center; margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 12px;">
                        You're receiving this digest because you've enabled notifications for StudioFlow.
                    </p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard/settings" style="color: #6b7280; font-size: 12px; text-decoration: underline;">
                        Manage Notification Preferences
                    </a>
                </div>
            </div>
        </body>
        </html>
    `;
};

// Start function (to be called from index.js if we want a dedicated worker process for this)
export const startNotificationBatchWorker = async () => {
    console.log('📦 Notification Batch Worker initialized.');

    if (process.env.ENABLE_REDIS_QUEUE !== 'true') {
        console.log('ℹ️ Redis Queue disabled. Skipping batch scheduler.');
        return;
    }

    try {
        // Remove existing repeatable jobs to avoid duplicates/stale configs
        const jobs = await notificationBatchQueue.getRepeatableJobs();
        for (const job of jobs) {
            if (job.name === 'process-analyzed-batches') {
                await notificationBatchQueue.removeRepeatableByKey(job.key);
            }
        }

        // Add repeatable job: Check for batches every 15 minutes
        await notificationBatchQueue.add('process-analyzed-batches', {}, {
            repeat: { cron: '*/15 * * * *' },
            removeOnComplete: true,
            removeOnFail: true
        });
        console.log('⏰ Scheduled batch processing job (Every 15 mins).');
    } catch (err) {
        console.error('❌ Failed to schedule batch processing:', err);
    }
};

export default startNotificationBatchWorker;
