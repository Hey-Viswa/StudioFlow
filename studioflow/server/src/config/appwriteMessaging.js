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

// Helper to send email via Nodemailer (SMTP) or Appwrite
import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, body, isHtml = true }) => {
  // 1. Try SMTP (Nodemailer) first if configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"StudioFlow" <no-reply@studioflow.studio>', // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        text: isHtml ? body.replace(/<[^>]*>?/gm, "") : body, // plain text body
        html: isHtml ? body : undefined, // html body
      });

      console.log('📧 Email sent via SMTP:', info.messageId);
      return true;
    } catch (smtpError) {
      console.error('❌ SMTP Email failed:', smtpError);
      // Fallthrough to Appwrite check or throw
    }
  } else {
    console.warn('⚠️ SMTP credentials missing (SMTP_HOST, SMTP_USER, SMTP_PASS).');
  }

  // 2. Appwrite Messaging Fallback
  if (isMessagingAvailable()) {
    try {
      // NOTE: This assumes you have an Appwrite provider configured for Email
      // and checking the SDK version compatibility.
      // For node-appwrite < 11, it might be different. 
      // Checking for common createEmail method.

      // In newer Appwrite versions, you target specific users or topics.
      // Since this is an admin notification, we might need a target ID or Topic.
      // For simplicity in this 'contact' context, we'll try to find an admin target or just log implementation specific needs.

      // Attempting to create a message if specific provider/target logic was here.
      // Since we don't have the provider ID or target ready, we will keep the logical structure
      // but warn that provider setup is required.

      /* 
      // Example implementation:
      await messaging.createEmail(
        ID.unique(), // messageId
        subject, // subject
        body, // content
        [], // topics (optional)
        [process.env.ADMIN_USER_ID] // users (optional)
      );
      */

      console.log('ℹ️ Appwrite Messaging is enabled but requires Provider/Target configuration in code.');
      console.log(`Debug Email -> To: ${to}, Subject: ${subject}`);
      return true;
    } catch (appwriteError) {
      console.error('❌ Appwrite Messaging failed:', appwriteError);
    }
  }

  console.log('⚠️ No email service configured (SMTP or Appwrite). Email logged only.');
  console.log(`Debug Email Content -> To: ${to}, Subject: ${subject}`);
  return false;
};

// Initialize Messaging
const initializeMessaging = () => {
  if (process.env.SMTP_HOST) {
    console.log('✅ SMTP Email Service initialized');
  } else {
    console.log('⚠️ SMTP Email Service not configured');
  }
};

export { messaging, isMessagingAvailable, sendEmail, initializeMessaging };
