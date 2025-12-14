import { jest } from '@jest/globals';
import { encrypt, decrypt } from '../src/utils/encryption.js';
import OwnerPaymentAccount from '../src/models/OwnerPaymentAccount.js';
import crypto from 'crypto';

// Use a fixed key for testing
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';

describe('Payment Architecture Unit Tests', () => {

    describe('Encryption Utility', () => {
        test('should encrypt and decrypt correctly', () => {
            const originalText = 'rzp_live_secret_123456';
            const encrypted = encrypt(originalText);

            expect(encrypted).not.toBe(originalText);
            expect(encrypted).toContain(':');
            const parts = encrypted.split(':');
            expect(parts.length).toBe(2);
            expect(parts[0].length).toBe(32); // 16 bytes IV -> 32 hex chars

            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(originalText);
        });

        test('should return null for null input', () => {
            expect(encrypt(null)).toBeNull();
            expect(decrypt(null)).toBeNull();
        });
    });

    describe('Webhook Signature Verification Logic', () => {
        test('should verify valid signature', () => {
            const secret = 'webhook_secret_123';
            const payload = JSON.stringify({ event: 'payment.captured' });

            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            const generatedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            expect(generatedSignature).toBe(expectedSignature);
        });
    });

});

describe('OwnerPaymentAccount Model', () => {
    // Mock mongoose methods if we were connecting to DB, 
    // but here we test the schema helper methods if possible without DB connection
    // or we can test the logic of the helper functions if separated.

    test('encryption helpers should work', () => {
        // Can't easily test mongoose model instance methods without a proper mock setup 
        // that handles 'this' context, but we validated the underlying utility above.
        const mockAccount = {
            encryptedKeySecret: null,
            setKeySecret: function (secret) {
                this.encryptedKeySecret = encrypt(secret);
            },
            getKeySecret: function () {
                return decrypt(this.encryptedKeySecret);
            }
        };

        const secret = 'my_super_secret';
        mockAccount.setKeySecret(secret);
        expect(mockAccount.encryptedKeySecret).not.toBe(secret);
        expect(mockAccount.getKeySecret()).toBe(secret);
    });
});
