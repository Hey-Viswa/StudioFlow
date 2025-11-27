import { Client, Messaging } from 'appwrite';

// Initialize Appwrite Messaging
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT;
const APPWRITE_KEY = process.env.APPWRITE_KEY;

let messagingClient = null;
let isMessagingConfigured = false;

/**
 * Initialize Appwrite Messaging
 */
export const initializeMessaging = () => {
  if (APPWRITE_ENDPOINT && APPWRITE_PROJECT && APPWRITE_KEY) {
    try {
      const client = new Client();
      client
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT)
        .setKey(APPWRITE_KEY);

      messagingClient = new Messaging(client);
      isMessagingConfigured = true;

      console.log('✅ Appwrite Messaging initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Appwrite Messaging:', error.message);
      isMessagingConfigured = false;
    }
  } else {
    console.log('⚠️  Appwrite Messaging not configured');
  }
};

/**
 * Check if Appwrite Messaging is available
 */
export const isMessagingAvailable = () => {
  return isMessagingConfigured && !!messagingClient;
};

/**
 * Send email via Appwrite Messaging
 * @param {Object} params - Email parameters
 * @returns {Promise<Object>} Message result
 */
export const sendEmail = async ({ to, subject, body, isHtml = true }) => {
  if (!isMessagingAvailable()) {
    throw new Error('Appwrite Messaging is not configured');
  }

  try {
    const message = await messagingClient.createEmail(
      to, // recipients
      subject,
      isHtml ? undefined : body, // plain text body
      isHtml ? body : undefined, // HTML body
      [], // CC (optional)
      [], // BCC (optional)
      [], // attachments (optional)
      false, // draft
      false, // scheduled
      undefined // scheduledAt
    );

    console.log(`✅ Email sent via Appwrite to ${to}`);
    return message;
  } catch (error) {
    console.error('❌ Failed to send email via Appwrite:', error.message);
    throw error;
  }
};

/**
 * Send push notification via Appwrite Messaging
 * @param {Object} params - Push notification parameters
 * @returns {Promise<Object>} Message result
 */
export const sendPushNotification = async ({
  userId,
  title,
  body,
  data = {},
  imageUrl = null,
  action = null
}) => {
  if (!isMessagingAvailable()) {
    throw new Error('Appwrite Messaging is not configured');
  }

  try {
    // Create push notification
    const message = await messagingClient.createPush(
      title,
      body,
      data ? JSON.stringify(data) : undefined,
      action || undefined,
      imageUrl || undefined,
      null, // icon
      null, // sound
      null, // color
      null, // tag
      null, // badge
      false, // draft
      false, // scheduled
      undefined // scheduledAt
    );

    console.log(`✅ Push notification sent via Appwrite to user ${userId}`);
    return message;
  } catch (error) {
    console.error('❌ Failed to send push notification via Appwrite:', error.message);
    throw error;
  }
};

/**
 * Send SMS via Appwrite Messaging (optional)
 * @param {Object} params - SMS parameters
 * @returns {Promise<Object>} Message result
 */
export const sendSMS = async ({ to, message }) => {
  if (!isMessagingAvailable()) {
    throw new Error('Appwrite Messaging is not configured');
  }

  try {
    const sms = await messagingClient.createSms(
      to,
      message,
      false, // draft
      false, // scheduled
      undefined // scheduledAt
    );

    console.log(`✅ SMS sent via Appwrite to ${to}`);
    return sms;
  } catch (error) {
    console.error('❌ Failed to send SMS via Appwrite:', error.message);
    throw error;
  }
};

/**
 * Get Appwrite Messaging client
 */
export const getMessagingClient = () => {
  if (!isMessagingAvailable()) {
    throw new Error('Appwrite Messaging is not configured');
  }
  return messagingClient;
};
