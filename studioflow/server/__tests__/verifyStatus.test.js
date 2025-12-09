
import { jest } from '@jest/globals';

const mockFindOne = jest.fn();
const mockSave = jest.fn();
const mockSubscriptionsFetch = jest.fn();

// Use unstable_mockModule for ESM support
// Must be called before dynamic import
await jest.unstable_mockModule('../src/models/User.js', () => ({
    default: {
        findOne: mockFindOne
    }
}));

await jest.unstable_mockModule('../src/models/Project.js', () => ({
    default: {}
}));

await jest.unstable_mockModule('../src/models/Invoice.js', () => ({
    default: {}
}));

await jest.unstable_mockModule('@clerk/backend', () => ({
    createClerkClient: jest.fn(() => ({}))
}));

await jest.unstable_mockModule('../src/utils/pdfGenerator.js', () => ({
    generateInvoicePDF: jest.fn(),
    getInvoicePDFPath: jest.fn()
}));

await jest.unstable_mockModule('../src/utils/emailService.js', () => ({
    sendInvoiceEmail: jest.fn()
}));

await jest.unstable_mockModule('../src/services/EntitlementService.js', () => ({
    default: {}
}));

await jest.unstable_mockModule('../src/services/SubscriptionStateMachine.js', () => ({
    default: {}
}));

await jest.unstable_mockModule('razorpay', () => ({
    default: jest.fn().mockImplementation(() => ({
        subscriptions: {
            fetch: mockSubscriptionsFetch
        },
        customers: {
            create: jest.fn()
        }
    }))
}));

describe('verifySubscriptionStatus', () => {
    let req, res, mockUser;
    let verifySubscriptionStatus;

    beforeAll(async () => {
        process.env.RAZORPAY_KEY_ID = 'test_key';
        process.env.RAZORPAY_KEY_SECRET = 'test_secret';

        const module = await import('../src/controllers/subscriptionController.js');
        verifySubscriptionStatus = module.verifySubscriptionStatus;
    });

    beforeEach(() => {
        req = { userId: 'test_user_id' };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        mockUser = {
            clerkUserId: 'test_user_id',
            email: 'test@example.com',
            subscription: {
                plan: 'pro',
                status: 'created',
                razorpaySubscriptionId: 'sub_123456',
                nextBillingDate: new Date('2024-01-01'),
                save: mockSave
            },
            save: mockSave
        };

        mockFindOne.mockResolvedValue(mockUser);
        jest.clearAllMocks();
        mockFindOne.mockResolvedValue(mockUser);
    });

    test('should update status from created to active when Razorpay matches', async () => {
        mockSubscriptionsFetch.mockResolvedValue({
            id: 'sub_123456',
            status: 'active',
            current_end: 1735689600,
            end_at: 1767225600
        });

        await verifySubscriptionStatus(req, res);

        expect(mockSubscriptionsFetch).toHaveBeenCalledWith('sub_123456');
        expect(mockUser.subscription.status).toBe('active');
        expect(mockSave).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            updated: true,
            message: 'Subscription synced successfully'
        }));
    });

    test('should NOT update if status matches', async () => {
        mockUser.subscription.status = 'active';

        mockSubscriptionsFetch.mockResolvedValue({
            id: 'sub_123456',
            status: 'active',
            current_end: 1735689600
        });

        mockUser.subscription.nextBillingDate = new Date(1735689600 * 1000);

        await verifySubscriptionStatus(req, res);

        expect(mockSave).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            updated: false,
            message: 'Already in sync'
        }));
    });

    test('should handle missing subscription ID', async () => {
        mockUser.subscription.razorpaySubscriptionId = null;

        await verifySubscriptionStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'No active subscription found to verify' });
    });

    test('should handle Razorpay fetch error', async () => {
        mockSubscriptionsFetch.mockRejectedValue(new Error('Network Error'));

        await verifySubscriptionStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(502);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Failed to fetch status from payment gateway'
        }));
    });
});
