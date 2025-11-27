import { Client, Databases } from 'appwrite';

// Appwrite configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT;
const APPWRITE_KEY = process.env.APPWRITE_KEY;
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const APPWRITE_NOTIFICATIONS_COLLECTION_ID = process.env.APPWRITE_NOTIFICATIONS_COLLECTION_ID;

let appwriteClient = null;
let appwriteDatabase = null;
let isAppwriteConfigured = false;

/**
 * Initialize Appwrite client
 */
export const initializeAppwrite = () => {
  if (APPWRITE_ENDPOINT && APPWRITE_PROJECT && APPWRITE_KEY) {
    try {
      appwriteClient = new Client();
      appwriteClient
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT)
        .setKey(APPWRITE_KEY);

      appwriteDatabase = new Databases(appwriteClient);
      isAppwriteConfigured = true;

      console.log('✅ Appwrite client initialized');
      console.log(`   Endpoint: ${APPWRITE_ENDPOINT}`);
      console.log(`   Project: ${APPWRITE_PROJECT}`);
      console.log(`   Database: ${APPWRITE_DATABASE_ID || 'Not configured'}`);
    } catch (error) {
      console.error('❌ Failed to initialize Appwrite:', error.message);
      isAppwriteConfigured = false;
    }
  } else {
    console.log('⚠️  Appwrite not configured - using Socket.IO fallback');
    console.log('   Set APPWRITE_ENDPOINT, APPWRITE_PROJECT, APPWRITE_KEY to enable');
  }
};

/**
 * Check if Appwrite is configured and ready
 */
export const isAppwriteAvailable = () => {
  return isAppwriteConfigured && !!appwriteDatabase;
};

/**
 * Get Appwrite database instance
 */
export const getAppwriteDatabase = () => {
  if (!isAppwriteAvailable()) {
    throw new Error('Appwrite is not configured');
  }
  return appwriteDatabase;
};

/**
 * Create notification document in Appwrite
 */
export const createAppwriteNotification = async (notificationData) => {
  if (!isAppwriteAvailable()) {
    console.warn('⚠️  Appwrite not available, skipping document creation');
    return null;
  }

  try {
    const database = getAppwriteDatabase();
    
    const document = await database.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_NOTIFICATIONS_COLLECTION_ID,
      'unique()', // Let Appwrite generate ID
      {
        userId: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        link: notificationData.link || null,
        metadata: JSON.stringify(notificationData.metadata || {}),
        priority: notificationData.priority || 'medium',
        category: notificationData.category || 'general',
        read: false,
        icon: notificationData.icon || 'bell',
        createdAt: new Date().toISOString()
      }
    );

    console.log(`✅ Appwrite notification created: ${document.$id}`);
    return document;
  } catch (error) {
    console.error('❌ Failed to create Appwrite notification:', error.message);
    throw error;
  }
};

/**
 * Subscribe to realtime updates (client-side helper info)
 * This is for documentation - actual subscription happens on client
 */
export const getAppwriteRealtimeSubscription = () => {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_DATABASE_ID || !APPWRITE_NOTIFICATIONS_COLLECTION_ID) {
    return null;
  }

  return {
    endpoint: APPWRITE_ENDPOINT,
    project: APPWRITE_PROJECT,
    channels: [
      `databases.${APPWRITE_DATABASE_ID}.collections.${APPWRITE_NOTIFICATIONS_COLLECTION_ID}.documents`
    ]
  };
};

export default {
  initializeAppwrite,
  isAppwriteAvailable,
  getAppwriteDatabase,
  createAppwriteNotification,
  getAppwriteRealtimeSubscription
};
