import { notificationQueue } from '../queues/notificationQueue.js';
import { NotificationRulesService } from '../services/notificationRules.js';
import { createNotification } from '../services/notificationService.js';

// This function will be called to start processing jobs
export const startNotificationWorker = () => {
    console.log('👷 Notification Worker started...');

    notificationQueue.process(async (job) => {
        const { type, data, actorId } = job.data;

        console.log(`📨 Processing ${type} notification`, data);

        try {
            // 1. Determine Recipients
            const recipients = await NotificationRulesService.getRecipients(type, data, actorId);

            if (!recipients || recipients.length === 0) {
                console.log('ℹ️ No recipients found for this event.');
                return;
            }

            console.log(`👥 Found ${recipients.length} potential recipients`);

            // 2. Process for each recipient
            for (const recipient of recipients) {
                const userId = recipient.userId;

                // Context for preference checking
                const context = {
                    projectId: data.projectId || data._id, // Assuming data has project info
                    isMention: data.mentions?.includes(userId),
                    isUrgent: data.priority === 'high'
                };

                // 3. Check Preferences
                const shouldNotify = await NotificationRulesService.shouldNotify(userId, type, context);

                if (!shouldNotify) {
                    console.log(`🔕 Notification suppressed for user ${userId} by preferences`);
                    continue;
                }

                // Customization for Mentions
                let notificationTitle = data.title;
                let notificationPriority = data.priority || 'medium';

                if (context.isMention) {
                    notificationTitle = '🔔 You were mentioned';
                    notificationPriority = 'high';
                }

                // 4. Get Enabled Channels
                const channels = await NotificationRulesService.getEnabledChannels(userId, context.isUrgent);

                // 5. Create Notification using Service
                // This handles DB persistence, Socket.IO emit, Email, and Push based on flags
                await createNotification({
                    userId,
                    type,
                    title: notificationTitle,
                    message: data.message,
                    link: data.link,
                    metadata: data,
                    priority: notificationPriority,
                    category: data.category || 'info',
                    sendEmail: channels.email,
                    sendPush: channels.push
                    // idempotencyKey is optional, service will generate if needed
                });
            }

        } catch (error) {
            console.error(`Error processing job ${job.id}:`, error);
            throw error;
        }
    });
};

