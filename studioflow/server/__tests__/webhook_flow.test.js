import { jest } from '@jest/globals';

// 1. Define Mock Functions
const mockPaymentThreadSave = jest.fn();
const mockPaymentThreadFindOne = jest.fn();
const mockProjectInvoiceFindById = jest.fn();
const mockProjectInvoiceSave = jest.fn();
const mockEntitlementCreate = jest.fn();
const mockEntitlementFindOne = jest.fn();
const mockRazorpayOrdersCreate = jest.fn();
const mockLogAudit = jest.fn();
const mockProcessedWebhookFindOne = jest.fn();
const mockProcessedWebhookCreate = jest.fn();

// 2. Register Mocks
jest.unstable_mockModule('crypto', () => ({
    default: {
        createHmac: () => ({
            update: () => ({
                digest: () => 'valid_signature'
            })
        })
    }
}));

jest.unstable_mockModule('../src/models/PaymentThread.js', () => ({
    default: class PaymentThread {
        constructor(data) {
            Object.assign(this, data);
            this._id = 'thread_123';
            this.save = mockPaymentThreadSave;
        }
        static findOne = mockPaymentThreadFindOne;
    }
}));

jest.unstable_mockModule('../src/models/ProjectInvoice.js', () => ({
    default: {
        findById: mockProjectInvoiceFindById,
        findByIdAndUpdate: jest.fn()
    }
}));

jest.unstable_mockModule('../src/models/Entitlement.js', () => ({
    default: {
        create: mockEntitlementCreate,
        findOne: mockEntitlementFindOne
    }
}));

jest.unstable_mockModule('../src/models/ProcessedWebhook.js', () => ({
    default: {
        findOne: mockProcessedWebhookFindOne,
        create: mockProcessedWebhookCreate
    }
}));

jest.unstable_mockModule('../src/services/auditService.js', () => ({
    logAudit: mockLogAudit
}));

jest.unstable_mockModule('../src/config/razorpay.js', () => ({
    razorpay: {
        orders: {
            create: mockRazorpayOrdersCreate
        }
    }
}));

// Mock other dependencies
jest.unstable_mockModule('../src/models/Project.js', () => ({ default: {} }));
jest.unstable_mockModule('../src/models/ProjectMember.js', () => ({ default: {} }));
jest.unstable_mockModule('../src/models/User.js', () => ({ default: {} }));
jest.unstable_mockModule('../src/services/notificationServiceV2.js', () => ({
    createNotificationWithIdempotency: jest.fn()
}));
jest.unstable_mockModule('../src/utils/emailService.js', () => ({
    sendInvoiceEmail: jest.fn()
}));
jest.unstable_mockModule('../src/utils/pdfGenerator.js', () => ({
    generateInvoicePDF: jest.fn()
}));
jest.unstable_mockModule('../src/queues/paymentQueue.js', () => ({
    paymentQueue: { add: jest.fn() }
}));

// 3. Import System Under Test
const { createPaymentOrder } = await import('../src/controllers/projectInvoiceController.js');
const { handleRazorpayWebhook } = await import('../src/controllers/paymentController.js');

describe('Webhook Flow Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            userId: 'user_123',
            params: { invoiceId: 'invoice_123' },
            body: {},
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
        process.env.RAZORPAY_WEBHOOK_SECRET = 'secret';
        process.env.ENABLE_REDIS_QUEUE = 'false'; // Force inline processing
    });

    describe('createPaymentOrder', () => {
        test('should create PaymentThread and Razorpay Order', async () => {
            // Setup
            const mockInvoice = {
                _id: 'invoice_123',
                projectId: 'project_123',
                invoiceNumber: 'INV-001',
                total: 1000,
                currency: 'INR',
                userId: 'owner_123',
                status: 'sent',
                save: mockProjectInvoiceSave
            };
            mockProjectInvoiceFindById.mockResolvedValue(mockInvoice);

            mockRazorpayOrdersCreate.mockResolvedValue({ id: 'order_razorpay_123' });
            mockPaymentThreadFindOne.mockResolvedValue(null); // No existing thread

            // Execute
            await createPaymentOrder(req, res);

            // Verify
            expect(mockRazorpayOrdersCreate).toHaveBeenCalled();
            expect(mockPaymentThreadSave).toHaveBeenCalled(); // Should save the new thread
            expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
                action: 'payment_initiated',
                resourceId: 'invoice_123'
            }));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                orderId: 'order_razorpay_123'
            }));
        });
    });

    describe('handleRazorpayWebhook (Payment Captured)', () => {
        test('should grant entitlement when PaymentThread is found', async () => {
            // Setup
            req.headers['x-razorpay-signature'] = 'valid_signature';
            req.body = {
                event: 'payment.captured',
                payload: {
                    payment: {
                        entity: {
                            id: 'pay_123',
                            order_id: 'order_razorpay_123',
                            amount: 100000,
                            currency: 'INR'
                        }
                    }
                }
            };

            mockProcessedWebhookFindOne.mockResolvedValue(null);

            // Let's mock PaymentThread finding
            mockPaymentThreadFindOne.mockResolvedValue({
                _id: 'thread_123',
                projectId: 'project_123',
                invoiceId: 'invoice_123',
                save: jest.fn()
            });

            // Mock Invoice finding (needed to find client)
            mockProjectInvoiceFindById.mockResolvedValue({
                _id: 'invoice_123',
                client: { userId: 'client_123' },
                accessType: 'all',
                save: jest.fn()
            });

            mockEntitlementFindOne.mockResolvedValue(null); // No existing entitlement

            await handleRazorpayWebhook(req, res);

            expect(mockEntitlementCreate).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'client_123',
                projectId: 'project_123',
                scope: 'project_download'
            }));
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
