import Bull from 'bull';
import nodemailer from 'nodemailer';
import Notification from '../models/Notification.js';
import { getRedisConfig, isRedisAvailable } from './redis.js';

// Create queues
let emailQueue;
let previewQueue;

// Check if Redis is enabled AND available
const isRedisConfigured = process.env.ENABLE_REDIS_QUEUE === 'true';
const redisConfig = getRedisConfig();
// Use top-level await to check connectivity (fast ping)
const isRedisUp = isRedisConfigured ? await isRedisAvailable() : false;

// Surface a clear boot-time log so operators know why queues are disabled
if (!isRedisConfigured) {
  console.log('ℹ️ Redis queues disabled: set ENABLE_REDIS_QUEUE=true and REDIS_URL to enable.');
} else if (!isRedisUp) {
  console.warn('⚠️ Redis configured but unreachable (ping failed). Falling back to mock queues.');
}

const isQueueEnabled = isRedisUp;

if (isQueueEnabled) {
  if (typeof redisConfig === 'string') {
    // Bull(name, url, opts) pattern for connection strings
    const bullOpts = {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false
      }
    };
    emailQueue = new Bull('email', redisConfig, bullOpts);

    const previewOpts = {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      }
    };
    previewQueue = new Bull('preview', redisConfig, previewOpts);
  } else {
    // Bull(name, opts) pattern for object config
    emailQueue = new Bull('email', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    });
    previewQueue = new Bull('preview', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      }
    });
  }
} else {
  // Already logged why queues are disabled above

  const mockQueue = {
    process: () => { },
    add: async () => { console.log('ℹ️ Mock Queue: Job added (skipped)'); },
    on: () => { },
    isReady: () => false
  };
  emailQueue = mockQueue;
  previewQueue = mockQueue;
}

// Email transporter configuration
const createTransporter = () => {
  if (process.env.EMAIL_PROVIDER === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  } else {
    // Default to SMTP (Gmail, etc.)
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
};

// Email templates
const templates = {
  notification: (data) => ({
    subject: data.title,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${data.title}</h2>
        <p style="color: #666; line-height: 1.6;">${data.message}</p>
        ${data.link ? `
          <p style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3002'}${data.link}" 
               style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Details
            </a>
          </p>
        ` : ''}
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          You received this email because you have notifications enabled for your StudioFlow account.
        </p>
      </div>
    `
  }),
  contact: (data) => ({
    subject: `New Contact: ${data.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Contact Message</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.email}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Subject:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.subject}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #8b5cf6;">
          <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
        </div>
        <p style="margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3002'}/admin/contacts" 
             style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View in Dashboard
          </a>
        </p>
      </div>
    `
  })
};

// Job processor for sending notification emails
emailQueue.process('send-notification-email', async (job) => {
  const { notificationId, userId, type, title, message, link, template } = job.data;

  console.log(`📧 Processing notification email for ${userId}`);

  try {
    // TODO: Get user email from database
    // For now, we'll skip actual sending in development
    if (process.env.NODE_ENV === 'production') {
      const transporter = createTransporter();
      const emailContent = templates[template] ? templates[template](job.data) : templates.notification(job.data);

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"StudioFlow" <noreply@studioflow.com>',
        to: userId, // TODO: Replace with actual user email
        subject: emailContent.subject,
        html: emailContent.html
      });

      console.log(`✅ Notification email sent for ${notificationId}`);
    } else {
      console.log(`🔧 Dev mode: Skipping actual email send for ${notificationId}`);
    }

    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send notification email for ${notificationId}:`, error);
    throw error;
  }
});

// Job processor for sending contact notification to admins
emailQueue.process('send-contact-notification', async (job) => {
  const { contactId, name, email, subject, message } = job.data;

  console.log(`📧 Processing contact notification for ${contactId}`);

  try {
    if (process.env.NODE_ENV === 'production' && process.env.ADMIN_EMAIL) {
      const transporter = createTransporter();
      const emailContent = templates.contact(job.data);

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"StudioFlow" <noreply@studioflow.com>',
        to: process.env.ADMIN_EMAIL,
        subject: emailContent.subject,
        html: emailContent.html,
        replyTo: email
      });

      console.log(`✅ Contact notification sent to admin for ${contactId}`);
    } else {
      console.log(`🔧 Dev mode: Skipping admin email for contact ${contactId}`);
    }

    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send contact notification for ${contactId}:`, error);
    throw error;
  }
});

// Queue event listeners
emailQueue.on('completed', (job) => {
  console.log(`✅ Email job ${job.id} completed`);
});

emailQueue.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} failed:`, err.message);
});

console.log('📧 Email queue initialized');

export { emailQueue, previewQueue };
export default { emailQueue, previewQueue };
