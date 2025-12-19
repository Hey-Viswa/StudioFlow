import crypto from 'crypto';
import PaymentThread from '../models/PaymentThread.js';
import ProjectInvoice from '../models/ProjectInvoice.js';
import Entitlement from '../models/Entitlement.js';
import ProcessedWebhook from '../models/ProcessedWebhook.js';
import User from '../models/User.js';
import { razorpay } from '../config/razorpay.js';
import { logAudit } from '../services/auditService.js';

const getRawBody = (req) => req.rawBody || JSON.stringify(req.body || {});

export const handleRouteProjectWebhook = async (req, res) => {
  const timestamp = new Date().toISOString();

  try {
    const signature = req.headers['x-razorpay-signature'];
    const eventId = req.headers['x-razorpay-event-id'];
    const secret = process.env.RAZORPAY_ROUTE_WEBHOOK_SECRET;

    if (!secret) {
      console.warn(`[${timestamp}] ⚠️ Route webhook secret not configured`);
      return res.status(200).json({ status: 'ok' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(getRawBody(req))
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error(`[${timestamp}] ❌ Invalid Route webhook signature`);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body?.event;
    if (event !== 'payment.captured') {
      return res.status(200).json({ status: 'ignored', event });
    }

    // Idempotency guard
    if (eventId) {
      const already = await ProcessedWebhook.findOne({ eventId });
      if (already) {
        return res.status(200).json({ status: 'ok', message: 'Already processed' });
      }
      await ProcessedWebhook.create({ eventId, eventType: event });
    }

    const payment = req.body?.payload?.payment?.entity;
    const orderId = payment?.order_id;
    const paymentId = payment?.id;

    if (!orderId || !paymentId) {
      console.error(`[${timestamp}] ❌ Missing order/payment id in webhook payload`);
      return res.status(200).json({ status: 'ok' });
    }

    const thread = await PaymentThread.findOne({ razorpayOrderId: orderId, paymentRail: 'v2' });
    if (!thread) {
      console.error(`[${timestamp}] 🚨 V2 PaymentThread not found for order ${orderId}`);
      return res.status(200).json({ status: 'ok' });
    }

    let ownerIdValue = null;
    const markRouteFailure = async (reason) => {
      try {
        thread.status = 'route_failed';
        thread.razorpayPaymentId = paymentId;
        await thread.save();
      } catch (err) {
        console.error(`[${timestamp}] ⚠️ Failed to mark route_failed:`, err.message);
      }

      await logAudit({
        userId: ownerIdValue || 'system',
        action: 'route_payment_rejected',
        resourceType: 'invoice',
        resourceId: thread.invoiceId?.toString() || 'unknown',
        details: { razorpayOrderId: orderId, razorpayPaymentId: paymentId, reason },
        status: 'failure'
      });
    };

    const invoice = thread.invoiceId ? await ProjectInvoice.findById(thread.invoiceId) : null;
    if (!invoice) {
      console.error(`[${timestamp}] 🚨 Invoice missing for thread ${thread._id}`);
      return res.status(200).json({ status: 'ok' });
    }

    const ownerId = invoice.userId || invoice.payeeUserId || null;
    ownerIdValue = ownerId;
    const owner = ownerId ? await User.findById(ownerId) : null;
    const linkedAccountId = owner?.paymentProfile?.razorpayLinkedAccountId || null;

    if (!linkedAccountId) {
      await markRouteFailure('linked_account_missing');
      return res.status(200).json({ status: 'blocked', reason: 'linked_account_missing' });
    }

    const routeTransferId = thread.routeTransferId;
    if (!routeTransferId || !razorpay) {
      await markRouteFailure('route_transfer_missing');
      return res.status(200).json({ status: 'blocked', reason: 'route_transfer_missing' });
    }

    try {
      const transfer = await razorpay.transfers.fetch(routeTransferId);
      const transferStatus = (transfer?.status || '').toString().toLowerCase();
      const transferAccount = transfer?.account || transfer?.recipient || transfer?.to || null;

      if (transferAccount && transferAccount !== linkedAccountId) {
        await markRouteFailure('transfer_account_mismatch');
        return res.status(200).json({ status: 'blocked', reason: 'transfer_account_mismatch' });
      }

      if (transferStatus && !['processed', 'completed', 'captured'].includes(transferStatus)) {
        await markRouteFailure(`transfer_status_${transferStatus}`);
        return res.status(200).json({ status: 'blocked', reason: 'transfer_not_settled' });
      }
    } catch (err) {
      await markRouteFailure('transfer_fetch_failed');
      console.error(`[${timestamp}] 🚨 Transfer validation failed for ${routeTransferId}:`, err.message);
      return res.status(200).json({ status: 'blocked', reason: 'transfer_validation_failed' });
    }

    if (invoice.status === 'paid') {
      return res.status(200).json({ status: 'ok', message: 'Invoice already paid' });
    }

    // Update thread status/paymentId after transfer validation
    thread.status = 'paid';
    thread.razorpayPaymentId = paymentId;
    await thread.save();

    // Atomic-ish status update
    await ProjectInvoice.findByIdAndUpdate(invoice._id, {
      status: 'paid',
      paidAt: new Date(),
      razorpayPaymentId: paymentId
    });

    // Grant entitlement once
    try {
      const clientId = invoice?.client?.userId || null;
      if (clientId) {
        await Entitlement.create({
          userId: clientId,
          projectId: thread.projectId,
          paymentThreadId: thread._id,
          invoiceId: invoice._id,
          scope: 'project_download',
          grantedAt: new Date()
        });
      }
    } catch (err) {
      console.error(`[${timestamp}] ⚠️ Entitlement creation failed for invoice ${invoice._id}:`, err.message);
    }

    await logAudit({
      userId: invoice?.client?.userId || 'system',
      action: 'route_payment_captured',
      resourceType: 'invoice',
      resourceId: invoice._id.toString(),
      details: {
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        paymentRail: 'v2'
      },
      status: 'success'
    });

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('❌ v2 webhook handler error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};
