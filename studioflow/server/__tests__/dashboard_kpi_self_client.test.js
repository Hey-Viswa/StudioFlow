import { jest } from '@jest/globals';

// Define Mock Functions
const mockProjectFind = jest.fn();
const mockProjectInvoiceFind = jest.fn();
const mockProjectMemberFind = jest.fn();
const mockUserFindOne = jest.fn();
const mockNotificationCountDocuments = jest.fn();

// Mock Models
jest.unstable_mockModule('../src/models/Project.js', () => ({ default: { find: mockProjectFind } }));
jest.unstable_mockModule('../src/models/ProjectInvoice.js', () => ({ default: { find: mockProjectInvoiceFind } }));
jest.unstable_mockModule('../src/models/ProjectMember.js', () => ({ default: { find: mockProjectMemberFind } }));
jest.unstable_mockModule('../src/models/User.js', () => ({ default: { findOne: mockUserFindOne } }));
jest.unstable_mockModule('../src/models/Notification.js', () => ({ default: { countDocuments: mockNotificationCountDocuments } }));
jest.unstable_mockModule('../src/models/ProjectFile.js', () => ({ default: {} }));
jest.unstable_mockModule('../src/models/KpiAggregate.js', () => ({ default: {} }));
jest.unstable_mockModule('../src/utils/storageAdapter.js', () => ({ default: {} }));
jest.unstable_mockModule('../src/services/notificationServiceV2.js', () => ({}));

// Import Controller
const { getDashboardMetrics } = await import('../src/controllers/dashboardController.js');

const createChainable = (data) => ({
    sort: () => createChainable(data),
    limit: () => createChainable(data),
    select: () => createChainable(data),
    lean: () => Promise.resolve(data),
    then: (resolve, reject) => Promise.resolve(data).then(resolve, reject)
});

describe('Dashboard KPI Self-Client Test', () => {
    let req, res;
    beforeEach(() => {
        req = { userId: 'user_mixed', query: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        jest.clearAllMocks();
    });

    test('getDashboardMetrics: Self-Client Scenario (Owner + Member in same project)', async () => {
        // User is owner of project1 AND a member of project1
        // We simulate the getProjectContexts returning the same ID in both lists
        mockProjectFind.mockImplementation(() => createChainable([
            { _id: 'project1', ownerId: 'user_mixed' }
        ]));

        mockProjectMemberFind.mockImplementation(() => createChainable([
            { projectId: 'project1' }
        ]));

        // Mock invoice in project1 where user is also the payer
        mockProjectInvoiceFind.mockReturnValue(createChainable([
            {
                _id: 'inv_self',
                projectId: 'project1',
                total: 500,
                status: 'paid',
                payerUserId: 'user_mixed', // Paid by me
                client: { userId: 'user_mixed' },
                createdAt: new Date('2025-01-15')
            }
        ]));

        // Also mock User/Notification to prevent errors
        mockUserFindOne.mockReturnValue(createChainable({ stats: {} }));
        mockNotificationCountDocuments.mockReturnValue(createChainable(0));

        req.query.viewContext = undefined; // Unified view

        await getDashboardMetrics(req, res);

        const response = res.json.mock.calls[0][0];
        const { metrics } = response;

        expect(metrics).toBeDefined();
        // Since I own it, I billed it.
        expect(metrics.totalBilled).toBe(500);
        // Since I paid it, I spent it.
        expect(metrics.clientMetrics.totalSpent).toBe(500);
    });
});
