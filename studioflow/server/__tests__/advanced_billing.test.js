import { jest } from '@jest/globals';

// Define Mock Functions
const mockProjectFindById = jest.fn();
const mockProjectInvoiceCreate = jest.fn();
const mockProjectMemberFind = jest.fn();
const mockProjectBillingConfigFindOne = jest.fn();
const mockTimeEntryFind = jest.fn();
const mockTimeEntryUpdateMany = jest.fn();
const mockIsFeatureEnabled = jest.fn();

// Mock Models
jest.unstable_mockModule('../src/models/Project.js', () => ({ default: { findById: mockProjectFindById } }));
jest.unstable_mockModule('../src/models/ProjectInvoice.js', () => ({ default: { create: mockProjectInvoiceCreate } }));
jest.unstable_mockModule('../src/models/ProjectMember.js', () => ({ default: { find: mockProjectMemberFind } }));
jest.unstable_mockModule('../src/models/ProjectBillingConfig.js', () => ({ default: { findOne: mockProjectBillingConfigFindOne } }));
jest.unstable_mockModule('../src/models/TimeEntry.js', () => ({ default: { find: mockTimeEntryFind, updateMany: mockTimeEntryUpdateMany } }));

// Mock Utils
jest.unstable_mockModule('../src/utils/featureFlags.js', () => ({ isFeatureEnabled: mockIsFeatureEnabled }));
jest.unstable_mockModule('../src/config/razorpay.js', () => ({ razorpay: {} }));
jest.unstable_mockModule('../src/services/notificationServiceV2.js', () => ({ createNotificationWithIdempotency: jest.fn().mockResolvedValue(true) }));
jest.unstable_mockModule('../src/services/auditService.js', () => ({ logAudit: jest.fn() }));

// Import Controller (dynamic import after mocks)
const { generateProjectInvoice } = await import('../src/controllers/projectInvoiceController.js');

describe('Advanced Billing Feature Test', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { projectId: 'proj_123' },
            userId: 'user_owner',
            body: {
                items: [{ title: 'Service', rate: 100, quantity: 1 }],
                dueDate: new Date()
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        jest.clearAllMocks();

        // Default Mock Setup
        mockProjectFindById.mockReturnValue({
            _id: 'proj_123',
            title: 'Test Project',
            ownerId: 'user_owner',
            isOwner: (id) => id === 'user_owner'
        });

        mockProjectMemberFind.mockReturnValue({
            select: jest.fn().mockReturnValue([{ userId: 'client_1', name: 'Client', role: 'client', status: 'active' }])
        });

        mockProjectInvoiceCreate.mockImplementation((data) => ({
            _id: 'inv_new_1',
            ...data,
            invoiceNumber: 'PINV-001',
            total: 100 // simplified
        }));
    });

    test('Flag OFF: Should behave as standard invoice generator', async () => {
        mockIsFeatureEnabled.mockResolvedValue(false);
        req.body.includeUnbilledHours = true; // Requesting it, but flag is OFF

        await generateProjectInvoice(req, res);

        expect(mockIsFeatureEnabled).toHaveBeenCalledWith('ADVANCED_BILLING', { projectId: 'proj_123' });
        // Should NOT fetch unbilled hours or config
        expect(mockProjectBillingConfigFindOne).not.toHaveBeenCalled();
        expect(mockTimeEntryFind).not.toHaveBeenCalled();

        // Items should remain 1 (original item)
        const createdInvoiceData = mockProjectInvoiceCreate.mock.calls[0][0];
        expect(createdInvoiceData.items).toHaveLength(1);
    });

    test('Flag ON: Should include unbilled hours when requested', async () => {
        mockIsFeatureEnabled.mockResolvedValue(true);
        req.body.includeUnbilledHours = true;

        // Mock Config
        mockProjectBillingConfigFindOne.mockResolvedValue({
            projectId: 'proj_123',
            hourlyRate: 50,
            features: { hourlyBilling: true }
        });

        // Mock Time Entries
        mockTimeEntryFind.mockResolvedValue([
            { _id: 'te_1', description: 'Task A', durationMinutes: 60, startTime: new Date() },
            { _id: 'te_2', description: 'Task B', durationMinutes: 120, startTime: new Date() }
        ]);

        await generateProjectInvoice(req, res);

        expect(mockProjectBillingConfigFindOne).toHaveBeenCalled();
        expect(mockTimeEntryFind).toHaveBeenCalled();

        const createdInvoiceData = mockProjectInvoiceCreate.mock.calls[0][0];
        // Original 1 + 2 time entries = 3 items
        expect(createdInvoiceData.items).toHaveLength(3);

        // Verify calculations (Item 2 is first time entry: 60 mins @ $50/hr = $50)
        expect(createdInvoiceData.items[1].rate).toBe(50);
        expect(createdInvoiceData.items[1].amount).toBe(50);

        // Verify Item 3: 120 mins = 2 hrs @ $50/hr = $100
        expect(createdInvoiceData.items[2].amount).toBe(100);

        // Verify TimeEntry status update
        expect(mockTimeEntryUpdateMany).toHaveBeenCalledWith(
            { _id: { $in: ['te_1', 'te_2'] } },
            { $set: { status: 'invoiced', invoiceId: 'inv_new_1' } }
        );
    });

    test('Flag ON: Should apply auto-discounts from config', async () => {
        mockIsFeatureEnabled.mockResolvedValue(true);
        req.body.includeUnbilledHours = false;
        // User did NOT provide a discount manually
        req.body.discount = undefined;

        mockProjectBillingConfigFindOne.mockResolvedValue({
            projectId: 'proj_123',
            discounts: [
                { code: 'LOYALTY', type: 'percentage', value: 10, active: true }
            ]
        });

        await generateProjectInvoice(req, res);

        const createdInvoiceData = mockProjectInvoiceCreate.mock.calls[0][0];
        expect(createdInvoiceData.discount).toEqual({
            percentage: 10,
            amount: 0 // Controller logic sets one or the other, usually pre-save calc handles amount but controller structure passes raw
        });
    });
});
