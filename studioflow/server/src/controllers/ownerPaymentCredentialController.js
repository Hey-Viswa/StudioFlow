import Razorpay from 'razorpay';
import User from '../models/User.js';
import { OwnerPaymentSecretsService } from '../services/OwnerPaymentSecretsService.js';
import { logAudit } from '../services/auditService.js';
import { razorpay as platformRazorpay } from '../config/razorpay.js';

const maskKeyId = (keyId = '') => {
  if (!keyId) return null;
  if (keyId.length <= 6) return `${keyId.slice(0, 2)}***`;
  return `${keyId.slice(0, 3)}****${keyId.slice(-3)}`;
};

const validateLinkedAccount = async ({ client, linkedAccountId }) => {
  const account = await client.accounts.fetch(linkedAccountId);
  if (!account) throw new Error('Linked account not found');
  const status = (account.status || account.account_status || '').toString().toLowerCase();
  if (status && ['suspended', 'disabled', 'rejected'].includes(status)) {
    throw new Error(`Linked account status=${status}`);
  }
  return account;
};

export const upsertOwnerRazorpayCredentials = async (req, res) => {
  try {
    const owner = req.user;
    if (!owner) return res.status(403).json({ error: 'User not resolved' });

    const { linkedAccountId, keyId, keySecret } = req.body || {};
    if (!linkedAccountId) {
      return res.status(400).json({ error: 'linkedAccountId is required' });
    }

    if ((keyId && !keySecret) || (!keyId && keySecret)) {
      return res.status(400).json({ error: 'Provide both keyId and keySecret or neither' });
    }

    const client = keyId && keySecret
      ? new Razorpay({ key_id: keyId, key_secret: keySecret })
      : platformRazorpay;

    if (!client) {
      return res.status(500).json({ error: 'Payment gateway not configured for validation' });
    }

    await validateLinkedAccount({ client, linkedAccountId });

    let secretMeta = null;
    if (keySecret) {
      secretMeta = await OwnerPaymentSecretsService.saveSecret({
        ownerId: owner._id,
        secretPlaintext: keySecret,
        keyId,
        actorId: req.userId,
        req
      });
    }

    owner.paymentProfile = owner.paymentProfile || {};
    owner.paymentProfile.razorpayLinkedAccountId = linkedAccountId;
    owner.paymentProfile.isRouteReady = true;
    await owner.save();

    await logAudit({
      userId: req.userId,
      action: 'owner_route_credentials_updated',
      resourceType: 'owner',
      resourceId: owner._id.toString(),
      details: {
        linkedAccountId,
        keyIdMasked: secretMeta?.keyIdMasked || maskKeyId(keyId || ''),
        fingerprint: secretMeta?.fingerprint
      },
      status: 'success',
      req
    });

    return res.json({
      success: true,
      linkedAccountId,
      keyIdMasked: secretMeta?.keyIdMasked || maskKeyId(keyId || ''),
      fingerprint: secretMeta?.fingerprint,
      rotatedAt: secretMeta?.rotatedAt || null
    });
  } catch (error) {
    const safeMessage = error?.message || 'Failed to save credentials';
    console.error('❌ owner credential update failed:', safeMessage);
    return res.status(400).json({ error: 'Razorpay Route not enabled or linked account invalid', details: safeMessage });
  }
};

export const getOwnerRazorpayCredentialMeta = async (req, res) => {
  try {
    const owner = req.user;
    if (!owner) return res.status(403).json({ error: 'User not resolved' });

    const meta = await OwnerPaymentSecretsService.getMetadata({ ownerId: owner._id });
    return res.json({
      linkedAccountId: owner.paymentProfile?.razorpayLinkedAccountId || null,
      keyIdMasked: meta?.keyIdMasked || null,
      fingerprint: meta?.fingerprint || null,
      rotatedAt: meta?.rotatedAt || null
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch credential metadata' });
  }
};
