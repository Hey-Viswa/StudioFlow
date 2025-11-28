import { notificationQueue } from '../queues/notificationQueue.js';
import Notification from '../models/Notification.js';
import { NotificationRulesService } from '../services/notificationRules.js';
import { sendPushNotification } from '../utils/pushNotification.js';
import { getIO } from '../config/socket.js'; // Assuming we have a way to get IO instance

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

                // 4. Get Enabled Channels
                const channels = await NotificationRulesService.getEnabledChannels(userId, context.isUrgent);

                // 5. Create Notification in DB (In-App)
                if (channels.inApp) {
                    const notification = await Notification.create({
                        recipientId: userId,
                        actorId: actorId,
                        type: type,
                        title: data.title,
                        message: data.message,
                        data: data,
                        priority: data.priority || 'medium',
                        category: data.category || 'info',
                        link: data.link
                    });

                    // 6. Send Real-time Update (Socket.IO)
                    const io = getIO();
                    if (io) {
                        io.to(`user:${userId}`).emit('notification:new', notification);
                    }
                }

                // 7. Send Push Notification
                if (channels.push) {
                    await sendPushNotification(
                        userId,
                        data.title,
                        data.message,
                        { ...data, url: data.link }
                    );
                }
            }

        } catch (error) {
            console.error(`Error processing job ${job.id}:`, error);
            throw error;
        }
    });
};

