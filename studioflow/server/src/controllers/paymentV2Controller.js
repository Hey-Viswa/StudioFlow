import { razorpay } from '../config/razorpay.js';
import ProjectInvoice from '../models/ProjectInvoice.js';
import PaymentThread from '../models/PaymentThread.js';
import User from '../models/User.js';
import { logAudit } from '../services/auditService.js';
import { OwnerPaymentSecretsService } from '../services/OwnerPaymentSecretsService.js';

const isPaymentV2Enabled = () => String(process.env.ENABLE_PAYMENT_V2 || '').toLowerCase() === 'true';

const logRouteEvent = (level, message, meta = {}) => {
  const payload = { level, message, ...meta };
  const serialized = JSON.stringify(payload);
  if (level === 'error' || level === 'critical') {
    console.error(serialized);
  } else {
    console.log(serialized);
  }
};

const assertRouteCapability = async ({ linkedAccountId, ownerId, actorId, req }) => {
  if (!razorpay) {
    throw new Error('Payment gateway not configured');
  }

  try {
    const account = await razorpay.accounts.fetch(linkedAccountId);
    const status = (account?.status || account?.account_status || '').toString().toLowerCase();
    if (!account) throw new Error('Linked account not found');
    if (['suspended', 'disabled', 'rejected'].includes(status)) {
      throw new Error(`Linked account status=${status}`);
    }
  } catch (err) {
    logRouteEvent('critical', 'Route preflight failed: linked account invalid', { ownerId, linkedAccountId, err: err?.message });
    await logAudit({
      userId: actorId,
      action: 'route_preflight_failed',
      resourceType: 'owner',
      resourceId: ownerId?.toString() || 'unknown',
      details: { linkedAccountId, reason: err?.message },
      status: 'failure',
      req
    });
    throw new Error('Razorpay Route not enabled or linked account invalid');
  }

  try {
    await razorpay.transfers.all({ account: linkedAccountId, count: 1 });
  } catch (err) {
    logRouteEvent('critical', 'Route preflight failed: transfers API rejected', { ownerId, linkedAccountId, err: err?.message });
    await logAudit({
      userId: actorId,
      action: 'route_preflight_failed_transfers',
      resourceType: 'owner',
      resourceId: ownerId?.toString() || 'unknown',
      details: { linkedAccountId, reason: err?.message },
      status: 'failure',
      req
    });
    throw new Error('Razorpay Route not enabled or linked account invalid');
  }
};

export const createRouteOrder = async (req, res) => {
  const actorId = req.userId;
  const { invoiceId } = req.body || {};

  try {
    if (!isPaymentV2Enabled()) {
      return res.status(403).json({ error: 'Payment v2 is disabled' });
    }

    if (!invoiceId) {
      return res.status(400).json({ error: 'invoiceId is required' });
    }

    if (!razorpay) {
      return res.status(500).json({ error: 'Payment gateway not configured' });
    }

    const invoice = await ProjectInvoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }

    // Determine owner
    const ownerId = invoice.userId || invoice.payeeUserId;
    if (!ownerId) {
      return res.status(400).json({ error: 'Invoice owner missing' });
    }

    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    const paymentProfile = owner.paymentProfile || {};
    const linkedId = paymentProfile.razorpayLinkedAccountId;
    const isRouteReady = paymentProfile.isRouteReady === true;

    if (!linkedId || !isRouteReady) {
      await logAudit({
        userId: actorId,
        action: 'route_order_blocked_owner_not_ready',
        resourceType: 'invoice',
        resourceId: invoiceId,
        details: { ownerId: String(ownerId), linkedId, isRouteReady },
        status: 'failure',
        req
      });
      return res.status(403).json({ error: 'Owner is not route-ready' });
    }

    const requireSecret = String(process.env.REQUIRE_OWNER_RAZORPAY_SECRET || '').toLowerCase() === 'true';
    if (requireSecret) {
      const hasSecret = await OwnerPaymentSecretsService.hasSecret({ ownerId: owner._id });
      if (!hasSecret) {
        await logAudit({
          userId: actorId,
          action: 'route_order_blocked_missing_secret',
          resourceType: 'invoice',
          resourceId: invoiceId,
          details: { ownerId: String(ownerId), linkedId },
          status: 'failure',
          req
        });
        return res.status(403).json({ error: 'Owner payment credentials are not configured securely' });
      }
    }

    try {
      await assertRouteCapability({ linkedAccountId: linkedId, ownerId, actorId, req });
    } catch (preflightError) {
      return res.status(503).json({ error: 'Razorpay Route not enabled or linked account invalid' });
    }

    // Idempotency: reuse existing v2 thread/order if present and not failed
    const existingThread = await PaymentThread.findOne({ invoiceId, paymentRail: 'v2', status: { $nin: ['failed', 'route_failed'] } });
    if (existingThread?.razorpayOrderId) {
      await logAudit({
        userId: actorId,
        action: 'route_order_reuse',
        resourceType: 'invoice',
        resourceId: invoiceId,
        details: { paymentThreadId: existingThread._id, razorpayOrderId: existingThread.razorpayOrderId },
        status: 'success',
        req
      });
      return res.json({
        success: true,
        orderId: existingThread.razorpayOrderId,
        amount: existingThread.amount,
        currency: existingThread.currency,
        paymentRail: 'v2'
      });
    }

    const amountInPaise = Math.round((invoice.total || invoice.totalAmount || 0) * 100);
    if (!amountInPaise || amountInPaise <= 0) {
      return res.status(400).json({ error: 'Invalid invoice amount' });
    }

    const platformFee = 0; // keep platform fee zero until fee strategy defined
    const ownerShare = amountInPaise - platformFee;
    if (ownerShare <= 0) {
      return res.status(400).json({ error: 'Calculated owner share is invalid' });
    }

    const orderPayload = {
      amount: amountInPaise,
      currency: invoice.currency || 'INR',
      receipt: invoice._id.toString(),
      transfers: [
        {
          account: linkedId,
          amount: ownerShare,
          on_hold: false
        }
      ],
      notes: {
        invoiceId: invoice._id.toString(),
        ownerId: owner._id.toString(),
        paymentRail: 'v2'
      }
    };

    const transfer = orderPayload.transfers?.[0];
    if (!transfer) {
      return res.status(400).json({ error: 'Route transfer missing' });
    }
    if (transfer.account !== linkedId) {
      return res.status(400).json({ error: 'Linked account mismatch in transfer' });
    }
    if (transfer.on_hold !== false) {
      return res.status(400).json({ error: 'Transfers must not be on hold' });
    }
    if (!transfer.amount || transfer.amount <= 0) {
      return res.status(400).json({ error: 'Invalid transfer amount' });
    }
    if (transfer.amount + platformFee !== orderPayload.amount) {
      return res.status(400).json({ error: 'Transfer and platform fee do not sum to order amount' });
    }

    let order;
    try {
      order = await razorpay.orders.create(orderPayload);
    } catch (err) {
      logRouteEvent('error', 'Razorpay Route order creation failed', { invoiceId, ownerId: owner._id?.toString(), err: err?.message });
      return res.status(502).json({ error: 'Failed to create order', details: err.message });
    }

    const responseTransfer = order?.transfers?.[0];
    if (!responseTransfer || responseTransfer.account !== linkedId) {
      logRouteEvent('critical', 'Route order missing transfer metadata', { invoiceId, ownerId: owner._id?.toString(), orderId: order?.id });
      try {
        await PaymentThread.create({
          projectId: invoice.projectId,
          title: `Payment for Invoice ${invoice.invoiceNumber || invoice._id}`,
          amount: amountInPaise / 100,
          currency: invoice.currency || 'INR',
          type: 'fixed',
          status: 'route_failed',
          invoiceId: invoice._id,
          razorpayOrderId: order?.id || null,
          paymentRail: 'v2',
          routeTransferId: responseTransfer?.id || null
        });
      } catch (persistErr) {
        console.error('❌ Failed to persist route_failed thread:', persistErr.message);
      }

      await logAudit({
        userId: actorId,
        action: 'route_order_missing_transfer',
        resourceType: 'invoice',
        resourceId: invoiceId,
        details: { razorpayOrderId: order?.id || 'unknown', linkedId },
        status: 'failure',
        req
      });

      return res.status(502).json({ error: 'Route order missing transfer metadata' });
    }

    try {
      const thread = new PaymentThread({
        projectId: invoice.projectId,
        title: `Payment for Invoice ${invoice.invoiceNumber || invoice._id}`,
        amount: amountInPaise / 100,
        currency: invoice.currency || 'INR',
        type: 'fixed',
        status: 'pending',
        invoiceId: invoice._id,
        razorpayOrderId: order.id,
        paymentRail: 'v2',
        routeTransferId: responseTransfer?.id || null
      });

      await thread.save();
    } catch (err) {
      console.error('❌ PaymentThread persistence failed after Route order creation:', err.message);
      await logAudit({
        userId: actorId,
        action: 'route_order_persist_failure',
        resourceType: 'invoice',
        resourceId: invoiceId,
        details: { razorpayOrderId: order.id, error: err.message },
        status: 'failure',
        req
      });
      return res.status(500).json({ error: 'Order created but persistence failed; contact support' });
    }

    await logAudit({
      userId: actorId,
      action: 'route_order_created',
      resourceType: 'invoice',
      resourceId: invoiceId,
      details: {
        razorpayOrderId: order.id,
        ownerId: owner._id.toString(),
        linkedId,
        amount: amountInPaise,
        platformFee,
        ownerShare
      },
      status: 'success',
      req
    });

    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentRail: 'v2'
    });
  } catch (error) {
    console.error('❌ v2 create order error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
