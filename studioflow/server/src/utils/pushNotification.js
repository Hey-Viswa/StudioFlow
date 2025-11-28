import { messaging } from '../config/appwriteMessaging.js';
import DeviceToken from '../models/DeviceToken.js';
import { ID } from 'node-appwrite';

/**
 * Send a push notification to a specific user
 * @param {string} userId - The ID of the user to notify
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload (optional)
 */
export const sendPushNotification = async (userId, title, body, data = {}) => {
    try {
        // 1. Fetch active device tokens for the user
        const deviceTokens = await DeviceToken.find({ userId, isActive: true });

        if (!deviceTokens || deviceTokens.length === 0) {
            console.log(`ℹ️ No active device tokens found for user ${userId}`);
            return;
        }

        const tokens = deviceTokens.map(dt => dt.token);
        console.log(`🚀 Sending push to ${tokens.length} devices for user ${userId}`);

        // 2. Send via Appwrite Messaging (FCM)
        // Note: Appwrite expects an array of targets (tokens)
        const messageId = ID.unique();

        // Convert data object to string values as FCM expects string map
        const stringData = Object.keys(data).reduce((acc, key) => {
            acc[key] = String(data[key]);
            return acc;
        }, {});

        const result = await messaging.createPush(
            messageId,
            title,
            body,
            [], // topics (empty)
            tokens, // targets (FCM tokens)
            stringData // data
        );

        console.log('✅ Push notification sent successfully:', result.$id);

        // Update last used timestamp for tokens
        await DeviceToken.updateMany(
            { userId, token: { $in: tokens } },
            { lastUsedAt: new Date() }
        );

    } catch (error) {
        console.error('❌ Error sending push notification:', error);
        // TODO: Handle invalid tokens (remove them from DB)
    }
};
