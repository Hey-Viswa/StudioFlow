import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate Invoice PDF
 * @param {Object} invoice - Invoice data from database
 * @param {Object} user - User data
 * @returns {Promise<string>} - Path to generated PDF file
 */
export async function generateInvoicePDF(invoice, user) {
  return new Promise((resolve, reject) => {
    try {
      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(__dirname, '../../invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      // Generate filename
      const filename = `${invoice.invoiceNumber}.pdf`;
      const filepath = path.join(invoicesDir, filename);

      // Create PDF document
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Pipe to file
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Add content to PDF
      addInvoiceHeader(doc, invoice);
      addCompanyInfo(doc);
      addCustomerInfo(doc, user, invoice);
      addInvoiceDetails(doc, invoice);
      addInvoiceTable(doc, invoice);
      addPaymentInfo(doc, invoice);
      addFooter(doc, invoice);

      // Finalize PDF
      doc.end();

      // Wait for stream to finish
      stream.on('finish', () => {
        console.log(`✅ PDF generated: ${filename}`);
        resolve(filepath);
      });

      stream.on('error', (error) => {
        console.error('❌ PDF generation error:', error);
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}

function addInvoiceHeader(doc, invoice) {
  // Company branding
  doc.fontSize(28)
     .fillColor('#2563eb')
     .text('StudioFlow', 50, 50);
  
  doc.fontSize(10)
     .fillColor('#64748b')
     .text('Project Management for Creative Teams', 50, 85);

  // Invoice title and number
  const isRefund = invoice.type === 'refund';
  const title = isRefund ? 'REFUND INVOICE' : 'INVOICE';
  
  doc.fontSize(24)
     .fillColor(isRefund ? '#ef4444' : '#1e293b')
     .text(title, 50, 120);
  
  doc.fontSize(12)
     .fillColor('#64748b')
     .text(`#${invoice.invoiceNumber}`, 50, 152);

  // Status badge
  const statusColor = {
    paid: '#10b981',
    pending: '#f59e0b',
    refunded: '#ef4444',
    failed: '#dc2626'
  }[invoice.status] || '#64748b';

  doc.fontSize(10)
     .fillColor(statusColor)
     .text(invoice.status.toUpperCase(), 450, 127);

  // Invoice date
  doc.fontSize(10)
     .fillColor('#64748b')
     .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN', {
       day: 'numeric',
       month: 'long',
       year: 'numeric'
     })}`, 450, 147);

  // Separator line
  doc.moveTo(50, 180)
     .lineTo(545, 180)
     .strokeColor('#e2e8f0')
     .stroke();
}

function addCompanyInfo(doc) {
  doc.fontSize(10)
     .fillColor('#1e293b')
     .text('From:', 50, 200);

  doc.fontSize(11)
     .fillColor('#334155')
     .text('StudioFlow Technologies', 50, 220)
     .text('Bangalore, Karnataka', 50, 235)
     .text('India - 560001', 50, 250)
     .text('Email: billing@studioflow.com', 50, 265)
     .text('GSTIN: 29XXXXX1234X1ZX', 50, 280);
}

function addCustomerInfo(doc, user, invoice) {
  doc.fontSize(10)
     .fillColor('#1e293b')
     .text('Bill To:', 320, 200);

  const userName = invoice.metadata?.userName || user.name || 'Customer';
  const userEmail = invoice.metadata?.userEmail || user.email || 'customer@example.com';

  doc.fontSize(11)
     .fillColor('#334155')
     .text(userName, 320, 220)
     .text(userEmail, 320, 235)
     .text(`User ID: ${user.clerkUserId || user._id}`, 320, 250);
}

function addInvoiceDetails(doc, invoice) {
  // Separator
  doc.moveTo(50, 305)
     .lineTo(545, 305)
     .strokeColor('#e2e8f0')
     .stroke();

  // Billing period
  const startDate = invoice.billingPeriodStart 
    ? new Date(invoice.billingPeriodStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'N/A';
  const endDate = invoice.billingPeriodEnd 
    ? new Date(invoice.billingPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'N/A';

  doc.fontSize(10)
     .fillColor('#64748b')
     .text('Billing Period:', 50, 325)
     .fillColor('#334155')
     .text(`${startDate} - ${endDate}`, 150, 325);

  // Subscription details
  doc.fillColor('#64748b')
     .text('Plan:', 50, 345)
     .fillColor('#334155')
     .text(invoice.planName || invoice.planId, 150, 345);

  if (invoice.razorpaySubscriptionId || invoice.subscriptionId) {
    doc.fillColor('#64748b')
       .text('Subscription ID:', 50, 365)
       .fillColor('#334155')
       .fontSize(9)
       .text(invoice.razorpaySubscriptionId || invoice.subscriptionId, 150, 365);
  }
}

function addInvoiceTable(doc, invoice) {
  const tableTop = 410;
  const isRefund = invoice.type === 'refund';
  
  // Table header
  doc.rect(50, tableTop, 495, 30)
     .fillAndStroke('#f1f5f9', '#e2e8f0');

  doc.fontSize(10)
     .fillColor('#1e293b')
     .text('Description', 60, tableTop + 10)
     .text('Quantity', 320, tableTop + 10)
     .text('Amount', 450, tableTop + 10);

  // Table content background
  doc.rect(50, tableTop + 30, 495, 50)
     .fillAndStroke('#ffffff', '#e2e8f0');

  // Description
  const description = invoice.description || `${invoice.planName} subscription ${isRefund ? 'refund' : 'payment'}`;
  doc.fontSize(11)
     .fillColor('#334155')
     .text(description, 60, tableTop + 45, { width: 240 });

  // Quantity
  doc.text('1', 340, tableTop + 45);

  // Amount
  const amount = Math.abs(invoice.amount);
  const amountText = isRefund ? `-₹${amount.toFixed(2)}` : `₹${amount.toFixed(2)}`;
  doc.text(amountText, 450, tableTop + 45);

  // Calculate subtotal, taxes, and total
  const subtotal = amount;
  const gst = 0; // Adjust if you have GST
  const total = subtotal + gst;

  let yPos = tableTop + 100;

  // Subtotal
  doc.fontSize(10)
     .fillColor('#64748b')
     .text('Subtotal:', 380, yPos)
     .fillColor('#334155')
     .text(`₹${subtotal.toFixed(2)}`, 480, yPos, { align: 'right' });

  yPos += 20;

  // GST (if applicable)
  if (gst > 0) {
    doc.fillColor('#64748b')
       .text('GST (18%):', 380, yPos)
       .fillColor('#334155')
       .text(`₹${gst.toFixed(2)}`, 480, yPos, { align: 'right' });
    yPos += 20;
  }

  // Total
  doc.rect(370, yPos - 5, 175, 35)
     .fillAndStroke('#f1f5f9', '#e2e8f0');

  doc.fontSize(12)
     .fillColor('#1e293b')
     .text('Total:', 380, yPos + 5);

  const totalText = isRefund ? `-₹${total.toFixed(2)}` : `₹${total.toFixed(2)}`;
  doc.fontSize(14)
     .fillColor(isRefund ? '#ef4444' : '#10b981')
     .text(totalText, 480, yPos + 5, { align: 'right' });
}

function addPaymentInfo(doc, invoice) {
  const yPos = 600;

  doc.fontSize(11)
     .fillColor('#1e293b')
     .text('Payment Information', 50, yPos);

  doc.fontSize(9)
     .fillColor('#64748b');

  let infoY = yPos + 20;

  if (invoice.razorpayPaymentId) {
    doc.text(`Payment ID: ${invoice.razorpayPaymentId}`, 50, infoY);
    infoY += 15;
  }

  if (invoice.razorpayRefundId) {
    doc.text(`Refund ID: ${invoice.razorpayRefundId}`, 50, infoY);
    infoY += 15;
  }

  doc.text(`Payment Method: Razorpay`, 50, infoY);
  infoY += 15;

  doc.text(`Currency: ${invoice.currency || 'INR'}`, 50, infoY);

  // Additional info for refunds
  if (invoice.type === 'refund' && invoice.metadata?.prorated) {
    infoY += 20;
    doc.fontSize(9)
       .fillColor('#64748b')
       .text(`Prorated Refund: ${invoice.metadata.unusedDays}/${invoice.metadata.totalDays} days unused`, 50, infoY);
  }
}

function addFooter(doc, invoice) {
  const footerY = 720;

  // Separator
  doc.moveTo(50, footerY)
     .lineTo(545, footerY)
     .strokeColor('#e2e8f0')
     .stroke();

  // Footer text
  doc.fontSize(9)
     .fillColor('#94a3b8')
     .text('Thank you for your business!', 50, footerY + 15)
     .text('This is a computer-generated invoice and does not require a signature.', 50, footerY + 30)
     .text('For any queries, please contact support@studioflow.com', 50, footerY + 45);

  // Invoice ID at bottom
  doc.fontSize(8)
     .fillColor('#cbd5e1')
     .text(`Invoice ID: ${invoice._id}`, 50, footerY + 70)
     .text(`Generated: ${new Date().toLocaleString('en-IN')}`, 350, footerY + 70);
}

/**
 * Get PDF file path for an invoice
 */
export function getInvoicePDFPath(invoiceNumber) {
  const invoicesDir = path.join(__dirname, '../../invoices');
  return path.join(invoicesDir, `${invoiceNumber}.pdf`);
}

/**
 * Check if PDF exists for an invoice
 */
export function invoicePDFExists(invoiceNumber) {
  const filepath = getInvoicePDFPath(invoiceNumber);
  return fs.existsSync(filepath);
}

/**
 * Delete PDF file
 */
export function deleteInvoicePDF(invoiceNumber) {
  try {
    const filepath = getInvoicePDFPath(invoiceNumber);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting PDF:', error);
    return false;
  }
}
