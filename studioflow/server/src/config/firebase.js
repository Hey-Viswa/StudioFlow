import admin from 'firebase-admin';

let firebaseApp = null;
let isFirebaseConfigured = false;

/**
 * Initialize Firebase Admin SDK
 */
export const initializeFirebase = () => {
  try {
    // Check if Firebase credentials are provided via service account JSON
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    // Clean up the service account key (remove extra whitespace/newlines from .env)
    if (serviceAccountKey) {
      serviceAccountKey = serviceAccountKey.trim();
    }
    
    if (serviceAccountKey) {
      // Option 1: Parse service account JSON from environment variable
      const credentials = JSON.parse(serviceAccountKey);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: credentials.project_id
      });
      
      isFirebaseConfigured = true;
      console.log('✅ Firebase Cloud Messaging initialized (from env)');
      console.log(`   Project: ${credentials.project_id}`);
    } else if (serviceAccountPath) {
      // Option 2: Load from file path
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath)
      });
      
      isFirebaseConfigured = true;
      console.log('✅ Firebase Cloud Messaging initialized (from file)');
    } else {
      console.log('⚠️  Firebase not configured - push notifications disabled');
      console.log('   Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_PATH to enable FCM');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    console.error('   Error details:', error);
    isFirebaseConfigured = false;
  }
};

/**
 * Check if Firebase is available
 */
export const isFirebaseAvailable = () => {
  return isFirebaseConfigured && !!firebaseApp;
};

/**
 * Send push notification via Firebase Cloud Messaging
 * @param {Object} params - Push notification parameters
 * @returns {Promise<string>} Message ID
 */
export const sendPushNotification = async ({
  token,
  title,
  body,
  data = {},
  imageUrl = null,
  link = null
}) => {
  if (!isFirebaseAvailable()) {
    throw new Error('Firebase is not configured');
  }

  try {
    const message = {
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl })
      },
      data: {
        ...data,
        ...(link && { click_action: link })
      },
      token
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Push notification sent via FCM: ${response}`);
    return response;
  } catch (error) {
    console.error('❌ Failed to send FCM push notification:', error.message);
    throw error;
  }
};

/**
 * Send push notification to multiple devices
 * @param {Object} params - Push notification parameters
 * @returns {Promise<Object>} Batch response
 */
export const sendMulticastPushNotification = async ({
  tokens,
  title,
  body,
  data = {},
  imageUrl = null,
  link = null
}) => {
  if (!isFirebaseAvailable()) {
    throw new Error('Firebase is not configured');
  }

  if (!tokens || tokens.length === 0) {
    console.warn('⚠️  No FCM tokens provided');
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const message = {
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl })
      },
      data: {
        ...data,
        ...(link && { click_action: link })
      },
      tokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Multicast push sent: ${response.successCount} success, ${response.failureCount} failed`);
    return response;
  } catch (error) {
    console.error('❌ Failed to send multicast FCM push:', error.message);
    throw error;
  }
};

/**
 * Subscribe token to topic for targeted notifications
 */
export const subscribeToTopic = async (tokens, topic) => {
  if (!isFirebaseAvailable()) {
    throw new Error('Firebase is not configured');
  }

  try {
    const response = await admin.messaging().subscribeToTopic(tokens, topic);
    console.log(`✅ Subscribed to topic ${topic}: ${response.successCount} devices`);
    return response;
  } catch (error) {
    console.error(`❌ Failed to subscribe to topic ${topic}:`, error.message);
    throw error;
  }
};

/**
 * Unsubscribe token from topic
 */
export const unsubscribeFromTopic = async (tokens, topic) => {
  if (!isFirebaseAvailable()) {
    throw new Error('Firebase is not configured');
  }

  try {
    const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
    console.log(`✅ Unsubscribed from topic ${topic}: ${response.successCount} devices`);
    return response;
  } catch (error) {
    console.error(`❌ Failed to unsubscribe from topic ${topic}:`, error.message);
    throw error;
  }
};

/**
 * Send notification to topic subscribers
 */
export const sendToTopic = async ({
  topic,
  title,
  body,
  data = {},
  imageUrl = null
}) => {
  if (!isFirebaseAvailable()) {
    throw new Error('Firebase is not configured');
  }

  try {
    const message = {
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl })
      },
      data,
      topic
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Topic notification sent to ${topic}: ${response}`);
    return response;
  } catch (error) {
    console.error(`❌ Failed to send to topic ${topic}:`, error.message);
    throw error;
  }
};

export default admin;
