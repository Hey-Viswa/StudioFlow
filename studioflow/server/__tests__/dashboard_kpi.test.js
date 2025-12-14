
import { jest } from '@jest/globals';

// Define Mock Functions
const mockProjectFind = jest.fn();
const mockProjectInvoiceFind = jest.fn();
const mockProjectMemberFind = jest.fn();
const mockProjectMemberFindOne = jest.fn();
const mockKpiAggregateFindOne = jest.fn();
const mockKpiAggregateAggregate = jest.fn();
const mockUserFindOne = jest.fn();
const mockNotificationCountDocuments = jest.fn();

// Mock Models
jest.unstable_mockModule('../src/models/Project.js', () => ({
    default: {
        find: mockProjectFind
    }
}));

jest.unstable_mockModule('../src/models/ProjectInvoice.js', () => ({
    default: {
        find: mockProjectInvoiceFind
    }
}));

jest.unstable_mockModule('../src/models/ProjectMember.js', () => ({
    default: {
        find: mockProjectMemberFind,
        findOne: mockProjectMemberFindOne
    }
}));

jest.unstable_mockModule('../src/models/KpiAggregate.js', () => ({
    default: {
        findOne: mockKpiAggregateFindOne,
        aggregate: mockKpiAggregateAggregate
    }
}));

jest.unstable_mockModule('../src/models/Notification.js', () => ({
    default: {
        countDocuments: mockNotificationCountDocuments
    }
}));
jest.unstable_mockModule('../src/models/ProjectFile.js', () => ({ default: {} }));
jest.unstable_mockModule('../src/utils/storageAdapter.js', () => ({ default: {} }));

// Mock other dependencies
jest.unstable_mockModule('../src/models/User.js', () => ({
    default: {
        findOne: mockUserFindOne
    }
}));
jest.unstable_mockModule('../src/services/notificationServiceV2.js', () => ({}));

// Import Controller
const { getDashboardMetrics, getRecentInvoices, getChartData } = await import('../src/controllers/dashboardController.js');

const createChainable = (data) => ({
    sort: () => createChainable(data),
    limit: () => createChainable(data),
    select: () => createChainable(data),
    lean: () => Promise.resolve(data),
    then: (resolve, reject) => Promise.resolve(data).then(resolve, reject)
});

describe('Dashboard KPI Security Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            userId: 'user_mixed', // User is Owner of P1, Client in P2
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();

        // Setup Default "Mixed" Context
        mockProjectFind.mockImplementation((query) => {
            // console.log('DEBUG: mockProjectFind called with:', JSON.stringify(query));
            const { ownerId, _id, $and } = query || {};

            // Handle $and used in getProjectContexts
            if ($and) {
                const orClause = $and.find(c => c.$or);
                if (orClause) {
                    return createChainable([{ _id: 'p1', ownerId: 'user_mixed' }, { _id: 'p2', ownerId: 'other_owner' }]);
                }
            }

            let results = [];
            if (ownerId === 'user_mixed') results = [{ _id: 'p1', ownerId: 'user_mixed' }];

            if (_id && _id.$in) {
                if (_id.$in.includes('p2')) results.push({ _id: 'p2', ownerId: 'other_owner' });
                if (_id.$in.includes('p1')) results.push({ _id: 'p1', ownerId: 'user_mixed' });
            }
            return createChainable(results);
        });

        mockProjectMemberFind.mockImplementation((query) => {
            const { userId, role } = query || {};
            if (userId === 'user_mixed' && (!role || role.$ne !== 'owner')) {
                return createChainable([{ projectId: 'p2', role: 'client' }]);
            }
            return createChainable([]);
        });

        // Setup User and Notification Mocks
        mockUserFindOne.mockReturnValue(createChainable({ stats: { storageUsed: 100 }, recentActivity: [] }));
        mockNotificationCountDocuments.mockResolvedValue(5);
    });

    // Helper to generate context-aware invoices
    const mockImplFilteredInvoices = (query) => {
        const { projectId } = query || {};
        const pIds = projectId?.$in || [];

        if (!pIds || pIds.length === 0) return createChainable([]);

        let results = [];

        // P1 Invoices (Owner)
        if (pIds.includes('p1')) {
            results.push({
                _id: 'inv_p1', projectId: 'p1', total: 1000, amountPaid: 1000, status: 'paid', revenue: 1000,
                client: { userId: 'client_A' }, payerUserId: 'client_A', createdAt: new Date('2025-12-10')
            });
        }

        // P2 Invoices (Client)
        if (pIds.includes('p2')) {
            // Invoice for ME (user_mixed) - Shoud be seen
            results.push({
                _id: 'inv_p2_me', projectId: 'p2', total: 500, amountPaid: 500, status: 'paid', revenue: 500,
                client: { userId: 'user_mixed' }, payerUserId: 'user_mixed', createdAt: new Date('2025-12-11')
            });
            // Invoice for OTHER client in P2 - Should NOT be seen
            results.push({
                _id: 'inv_p2_other', projectId: 'p2', total: 4500, amountPaid: 4500, status: 'paid', revenue: 4500,
                client: { userId: 'other_client' }, payerUserId: 'other_client', createdAt: new Date('2025-12-12')
            });
        }

        return createChainable(results);
    };

    describe('getDashboardMetrics (Mixed Role)', () => {
        test('should return correct owner revenue and client spending without leakage', async () => {
            mockProjectInvoiceFind.mockImplementation(mockImplFilteredInvoices);

            await getDashboardMetrics(req, res);

            const response = res.json.mock.calls[0][0];
            const { metrics } = response;

            expect(metrics).toBeDefined();
            expect(metrics.totalBilled).toBe(1000);
            expect(metrics.clientMetrics.totalSpent).toBe(500);
            expect(metrics.roleContext).toBe('mixed');
        });
    });

    describe('getRecentInvoices (Leakage Check)', () => {
        test('should NOT return invoices from projects where user is member but NOT the payer', async () => {
            mockProjectInvoiceFind.mockImplementation(mockImplFilteredInvoices);

            await getRecentInvoices(req, res);

            const response = res.json.mock.calls[0][0];
            const { invoices } = response;

            expect(invoices).toHaveLength(2);
            const ids = invoices.map(i => i._id);
            expect(ids).toContain('inv_p1');
            expect(ids).toContain('inv_p2_me');
            expect(ids).not.toContain('inv_p2_other');
        });

        test('should strictly respect viewContext="client"', async () => {
            req.query.viewContext = 'client';

            mockProjectInvoiceFind.mockImplementation((query) => {
                const { projectId } = query || {};
                const pIds = projectId?.$in || [];
                if (pIds.includes('p1')) throw new Error('Should not query owned projects in client view');
                return mockImplFilteredInvoices(query);
            });

            await getRecentInvoices(req, res);
            expect(res.json).toHaveBeenCalled();
            const { invoices } = res.json.mock.calls[0][0];
            expect(invoices).toBeDefined();
            expect(invoices).toHaveLength(1);
            expect(invoices[0]._id).toBe('inv_p2_me');
        });
    });

    describe('getChartData (Leakage Check)', () => {
        test('should generate revenue data only from owned projects + personal spend', async () => {
            mockProjectInvoiceFind.mockImplementation(mockImplFilteredInvoices);

            await getChartData(req, res);

            const data = res.json.mock.calls[0][0];
            const revenueData = data.revenue || [];

            // Total revenue from data buckets
            const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);

            // Expected: 1000 (Owner P1) + 500 (Client P2). 
            // P2 Other (4500) must be excluded.
            expect(totalRevenue).toBe(1500);
        });
    });
});
