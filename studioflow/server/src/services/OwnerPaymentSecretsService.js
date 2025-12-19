import crypto from 'crypto';
import OwnerPaymentSecret from '../models/OwnerPaymentSecret.js';
import { logAudit } from './auditService.js';

const SECRET_TYPES = ['razorpay_api_secret'];

const getMasterKey = () => {
  const key = process.env.PAYMENT_SECRET_MASTER_KEY;
  if (!key) {
    throw new Error('PAYMENT_SECRET_MASTER_KEY missing');
  }
  const keyBuffer = Buffer.from(key, 'base64');
  if (keyBuffer.length !== 32) {
    throw new Error('PAYMENT_SECRET_MASTER_KEY must be 32 bytes base64');
  }
  return keyBuffer;
};

const maskKeyId = (keyId = '') => {
  if (!keyId) return null;
  if (keyId.length <= 6) return `${keyId.slice(0, 2)}***`;
  return `${keyId.slice(0, 3)}****${keyId.slice(-3)}`;
};

const fingerprintSecret = (secret) => crypto.createHash('sha256').update(secret).digest('hex').slice(-12);

const encryptSecret = (masterKey, secretPlaintext) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(secretPlaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedSecret: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
};

const decryptSecret = (masterKey, record) => {
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, Buffer.from(record.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(record.authTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.encryptedSecret, 'base64')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
};

export const OwnerPaymentSecretsService = {
  async saveSecret({ ownerId, secretType = 'razorpay_api_secret', secretPlaintext, keyId, actorId = 'system', req = null }) {
    if (!ownerId) throw new Error('ownerId required');
    if (!SECRET_TYPES.includes(secretType)) throw new Error('unsupported secret type');
    if (!secretPlaintext) throw new Error('secretPlaintext required');

    const masterKey = getMasterKey();
    const { encryptedSecret, iv, authTag } = encryptSecret(masterKey, secretPlaintext);
    const fingerprint = fingerprintSecret(secretPlaintext);
    const keyIdMasked = maskKeyId(keyId || '');
    const createdFromIp = req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || null;

    const record = await OwnerPaymentSecret.findOneAndUpdate(
      { ownerId, secretType },
      {
        keyIdMasked,
        encryptedSecret,
        iv,
        authTag,
        fingerprint,
        rotatedAt: new Date(),
        updatedBy: actorId,
        createdBy: actorId,
        createdFromIp
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await logAudit({
      userId: actorId,
      action: 'owner_payment_secret_rotated',
      resourceType: 'owner_payment_secret',
      resourceId: String(ownerId),
      details: { secretType, keyIdMasked, fingerprint },
      status: 'success',
      req
    });

    return { keyIdMasked, fingerprint, rotatedAt: record.rotatedAt };
  },

  async getDecryptedSecret({ ownerId, secretType = 'razorpay_api_secret' }) {
    if (!ownerId) return null;
    const record = await OwnerPaymentSecret.findOne({ ownerId, secretType });
    if (!record) return null;
    const masterKey = getMasterKey();
    return decryptSecret(masterKey, record);
  },

  async getMetadata({ ownerId, secretType = 'razorpay_api_secret' }) {
    if (!ownerId) return null;
    const record = await OwnerPaymentSecret.findOne({ ownerId, secretType }, { keyIdMasked: 1, fingerprint: 1, rotatedAt: 1 });
    if (!record) return null;
    return { keyIdMasked: record.keyIdMasked, fingerprint: record.fingerprint, rotatedAt: record.rotatedAt };
  },

  async hasSecret({ ownerId, secretType = 'razorpay_api_secret' }) {
    if (!ownerId) return false;
    const exists = await OwnerPaymentSecret.exists({ ownerId, secretType });
    return Boolean(exists);
  }
};

export default OwnerPaymentSecretsService;
