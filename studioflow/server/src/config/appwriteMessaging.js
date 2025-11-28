import { Client, Messaging } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client();

// Initialize Appwrite Client
if (process.env.APPWRITE_ENDPOINT && process.env.APPWRITE_PROJECT_ID && process.env.APPWRITE_API_KEY) {
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
} else {
  console.warn('⚠️ Appwrite credentials missing. Push notifications will not work.');
}

const messaging = new Messaging(client);

// Check if Appwrite is configured
const isMessagingAvailable = () => {
  return !!(process.env.APPWRITE_ENDPOINT && process.env.APPWRITE_PROJECT_ID && process.env.APPWRITE_API_KEY);
};

// Helper to send email via Appwrite
const sendEmail = async ({ to, subject, body, isHtml = true }) => {
  if (!isMessagingAvailable()) {
    throw new Error('Appwrite Messaging is not configured');
  }

  try {
    // Note: Appwrite Messaging API for email might differ based on version
    // This is a placeholder for the actual implementation
    // You might need to create a message in a topic or use a function
    // For now, we'll assume there's a provider configured

    // In many Appwrite setups, you trigger emails via Cloud Functions or specific providers
    // If using the node-appwrite SDK directly for messaging:
    /*
    await messaging.createEmail(
      ID.unique(),
      subject,
      body,
      [], // topics
      to, // users/targets
      isHtml
    );
    */
    console.log('📧 [Mock] Appwrite Email Sent:', { to, subject });
    return true;
  } catch (error) {
    console.error('Appwrite sendEmail error:', error);
    throw error;
  }
};

// Initialize Messaging (placeholder for future setup if needed)
const initializeMessaging = () => {
  if (isMessagingAvailable()) {
    console.log('✅ Appwrite Messaging initialized');
  } else {
    console.log('⚠️ Appwrite Messaging not configured (skipping)');
  }
};

export { messaging, isMessagingAvailable, sendEmail, initializeMessaging };
