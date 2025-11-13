import nodemailer from 'nodemailer';
import fs from 'fs';

/**
 * Email service for sending invoices and notifications
 */

// Create reusable transporter
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  // Configure based on environment variables
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    // Custom SMTP configuration
    transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('✓ Email configured with custom SMTP');
  } else {
    // Fallback to console logging (development)
    console.warn('⚠️  Email SMTP not configured. Emails will be logged to console.');
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('📧 [DEV MODE] Email would be sent:');
        console.log('  To:', mailOptions.to);
        console.log('  Subject:', mailOptions.subject);
        console.log('  Body:', mailOptions.text || mailOptions.html);
        if (mailOptions.attachments) {
          console.log('  Attachments:', mailOptions.attachments.map(a => a.filename).join(', '));
        }
        return { messageId: `dev-${Date.now()}@studioflow.local` };
      }
    };
  }

  return transporter;
}

/**
 * Send invoice email with PDF attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.userName - Recipient name
 * @param {Object} options.invoice - Invoice data
 * @param {string} options.pdfPath - Path to PDF file
 * @returns {Promise<Object>} - Email send result
 */
export async function sendInvoiceEmail({ to, userName, invoice, pdfPath }) {
  try {
    const transporter = getTransporter();

    const isRefund = invoice.type === 'refund';
    const subject = isRefund 
      ? `Refund Invoice ${invoice.invoiceNumber} - StudioFlow`
      : `Invoice ${invoice.invoiceNumber} - StudioFlow`;

    const amount = Math.abs(invoice.amount);
    const formattedAmount = `₹${amount.toFixed(2)}`;

    // Email HTML body
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px; background: #f8fafc; }
    .card { background: white; border-radius: 8px; padding: 25px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .invoice-number { font-size: 24px; color: #1e293b; font-weight: bold; margin: 10px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .detail-label { color: #64748b; font-weight: 500; }
    .detail-value { color: #1e293b; font-weight: 600; }
    .total { font-size: 20px; color: ${isRefund ? '#ef4444' : '#10b981'}; }
    .button { background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
    .status-badge { display: inline-block; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status-paid { background: #dcfce7; color: #15803d; }
    .status-refunded { background: #fee2e2; color: #dc2626; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎬 StudioFlow</h1>
    <p style="margin: 5px 0 0 0;">Project Management for Creative Teams</p>
  </div>
  
  <div class="content">
    <h2 style="color: #1e293b;">Hi ${userName},</h2>
    
    ${isRefund 
      ? `<p>Your refund has been processed successfully. Please find the refund invoice attached.</p>`
      : `<p>Thank you for your payment! Your invoice is ready and attached to this email.</p>`
    }
    
    <div class="card">
      <div style="text-align: center;">
        <div style="color: #64748b; font-size: 14px; margin-bottom: 5px;">
          ${isRefund ? 'REFUND INVOICE' : 'INVOICE'}
        </div>
        <div class="invoice-number">#${invoice.invoiceNumber}</div>
        <span class="status-badge ${invoice.status === 'paid' ? 'status-paid' : 'status-refunded'}">
          ${invoice.status}
        </span>
      </div>
      
      <div style="margin-top: 25px;">
        <div class="detail-row">
          <span class="detail-label">Plan</span>
          <span class="detail-value">${invoice.planName || invoice.planId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        ${invoice.billingPeriodStart && invoice.billingPeriodEnd ? `
        <div class="detail-row">
          <span class="detail-label">Billing Period</span>
          <span class="detail-value">${new Date(invoice.billingPeriodStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(invoice.billingPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        ` : ''}
        <div class="detail-row" style="border-bottom: none; margin-top: 15px;">
          <span class="detail-label" style="font-size: 18px;">Total Amount</span>
          <span class="detail-value total">${isRefund ? '-' : ''}${formattedAmount}</span>
        </div>
      </div>
    </div>
    
    ${invoice.razorpayPaymentId ? `
    <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #64748b;">
        <strong>Payment ID:</strong> ${invoice.razorpayPaymentId}
      </p>
      ${invoice.razorpayRefundId ? `
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">
        <strong>Refund ID:</strong> ${invoice.razorpayRefundId}
      </p>
      ` : ''}
    </div>
    ` : ''}
    
    <p style="text-align: center;">
      <a href="https://studioflow.com/dashboard/invoices" class="button">View All Invoices</a>
    </p>
    
    ${isRefund ? `
    <p style="background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 14px;">
      <strong>Note:</strong> The refund amount will be credited to your original payment method within 5-7 business days.
    </p>
    ` : ''}
  </div>
  
  <div class="footer">
    <p>Thank you for choosing StudioFlow!</p>
    <p style="font-size: 12px; color: #94a3b8;">
      If you have any questions, reply to this email or contact us at support@studioflow.com
    </p>
    <p style="font-size: 12px; color: #cbd5e1; margin-top: 20px;">
      © ${new Date().getFullYear()} StudioFlow Technologies. All rights reserved.
    </p>
  </div>
</body>
</html>
    `;

    // Plain text version
    const text = `
Hi ${userName},

${isRefund 
  ? 'Your refund has been processed successfully.'
  : 'Thank you for your payment!'
}

Invoice Number: ${invoice.invoiceNumber}
Plan: ${invoice.planName || invoice.planId}
Amount: ${isRefund ? '-' : ''}${formattedAmount}
Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}
Status: ${invoice.status.toUpperCase()}

${invoice.razorpayPaymentId ? `Payment ID: ${invoice.razorpayPaymentId}` : ''}
${invoice.razorpayRefundId ? `Refund ID: ${invoice.razorpayRefundId}` : ''}

You can view and download your invoice from your StudioFlow dashboard:
https://studioflow.com/dashboard/invoices

${isRefund 
  ? 'The refund amount will be credited to your original payment method within 5-7 business days.'
  : ''
}

Thank you for choosing StudioFlow!

If you have any questions, contact us at support@studioflow.com

© ${new Date().getFullYear()} StudioFlow Technologies
    `;

    // Email options
    const mailOptions = {
      from: process.env.SMTP_FROM || '"StudioFlow" <billing@studioflow.com>',
      to: to,
      subject: subject,
      text: text,
      html: html,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          path: pdfPath,
          contentType: 'application/pdf'
        }
      ]
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Invoice email sent to ${to}`);
    console.log(`  Message ID: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('❌ Error sending invoice email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send subscription cancellation confirmation email
 */
export async function sendCancellationEmail({ to, userName, subscription, refund }) {
  try {
    const transporter = getTransporter();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: #1e293b; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #f8fafc; }
    .card { background: white; border-radius: 8px; padding: 25px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎬 StudioFlow</h1>
  </div>
  <div class="content">
    <h2>Subscription Cancelled</h2>
    <p>Hi ${userName},</p>
    <p>Your ${subscription.plan} subscription has been cancelled successfully.</p>
    ${refund && refund.amount > 0 ? `
    <div class="card">
      <p><strong>Refund Amount:</strong> ₹${refund.amount.toFixed(2)}</p>
      <p><strong>Status:</strong> ${refund.status}</p>
      <p style="font-size: 14px; color: #64748b;">The refund will be credited within 5-7 business days.</p>
    </div>
    ` : ''}
    <p>You've been downgraded to the Free plan and can continue using StudioFlow with limited features.</p>
    <p>We hope to see you back soon!</p>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"StudioFlow" <support@studioflow.com>',
      to: to,
      subject: 'Subscription Cancelled - StudioFlow',
      html: html
    });

    console.log(`✅ Cancellation email sent to ${to}`);
    return { success: true };

  } catch (error) {
    console.error('❌ Error sending cancellation email:', error);
    return { success: false, error: error.message };
  }
}

export default {
  sendInvoiceEmail,
  sendCancellationEmail
};
