import express from 'express';
import verifyClerk from '../middlewares/verifyClerkJWKS.js';
import { requireOwner, requireTeam } from '../middlewares/checkRole.js';
import { createRouteOrder } from '../controllers/paymentV2Controller.js';
import { handleRouteProjectWebhook } from '../controllers/paymentV2WebhookController.js';
import { resolvePaymentContext } from '../services/PaymentContextResolver.js';
import ShadowPaymentRecord from '../models/ShadowPaymentRecord.js';
import { getOwnerRazorpayCredentialMeta, upsertOwnerRazorpayCredentials } from '../controllers/ownerPaymentCredentialController.js';

const router = express.Router();

// Role guard: allow owners/team/clients who are authenticated; admin covered via owner in many cases
router.post('/payments/v2/create-order', verifyClerk, requireTeam, async (req, res, next) => {
	const { invoiceId } = req.body || {};
	try {
		const { default: ProjectInvoice } = await import('../models/ProjectInvoice.js');
		const { default: User } = await import('../models/User.js');

		const invoice = invoiceId ? await ProjectInvoice.findById(invoiceId) : null;
		const ownerId = invoice?.userId || invoice?.payeeUserId;
		const owner = ownerId ? await User.findById(ownerId) : null;

		const decision = resolvePaymentContext({ invoice, owner });

		// Shadow mode: observe only, never alter response or call Razorpay
		if (String(process.env.ENABLE_PAYMENT_V2_SHADOW || '').toLowerCase() === 'true') {
			try {
				const amountInPaise = Math.round((invoice?.total || invoice?.totalAmount || 0) * 100);
				const platformFee = 0;
				const ownerShare = amountInPaise - platformFee;
				const missing = [];
				if (!invoice) missing.push('invoice_missing');
				if (!owner) missing.push('owner_missing');
				if (!owner?.paymentProfile?.razorpayLinkedAccountId) missing.push('linked_id_missing');
				if (ownerShare <= 0) missing.push('invalid_amount');

				await ShadowPaymentRecord.create({
					invoiceId: invoice?._id,
					ownerId: owner?._id,
					wouldUseRail: 'v2',
					reason: decision.reason,
					amount: invoice?.total || invoice?.totalAmount,
					currency: invoice?.currency,
					ownerShare: ownerShare > 0 ? ownerShare : undefined,
					platformFee,
					missing
				});

				console.log('[PaymentShadow] rail=v2 invoice=%s owner=%s reason=%s ownerShare=%s platformFee=%s missing=%j',
					invoice?._id || 'n/a', owner?._id || 'n/a', decision.reason, ownerShare, platformFee, missing);
			} catch (shadowErr) {
				console.error('[PaymentShadow] error', shadowErr.message);
			}
		}

		if (decision.rail !== 'v2') {
			return res.status(403).json({ error: 'v2 not eligible', reason: decision.reason });
		}

		return createRouteOrder(req, res, next);
	} catch (err) {
		console.error('[PaymentResolver] error', err.message);
		return res.status(403).json({ error: 'v2 not eligible', reason: 'resolver_error' });
	}
});
router.post('/payments/v2/project-webhook', express.raw({ type: 'application/json' }), handleRouteProjectWebhook);
router.post('/payments/v2/owner/credentials', verifyClerk, requireOwner, upsertOwnerRazorpayCredentials);
router.get('/payments/v2/owner/credentials', verifyClerk, requireOwner, getOwnerRazorpayCredentialMeta);

export default router;
