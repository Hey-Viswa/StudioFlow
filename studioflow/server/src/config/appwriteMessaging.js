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

  // 2. Appwrite Messaging Fallback (Placeholder)
  // If you have Appwrite Cloud Functions for email, trigger them here.

  console.log('⚠️ Email service not fully configured. Email was logged but not sent.');
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
