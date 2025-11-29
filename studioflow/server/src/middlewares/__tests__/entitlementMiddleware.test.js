import { jest } from '@jest/globals';
import { checkResourceLimit } from './entitlementMiddleware.js';
import EntitlementService from '../services/EntitlementService.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';

// Mock dependencies
jest.mock('../models/User.js');
jest.mock('../models/Project.js');
jest.mock('../models/ProjectMember.js');
jest.mock('../services/EntitlementService.js');

describe('Entitlement Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            userId: 'user_123',
            params: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('checkResourceLimit', () => {
        it('should allow request if user is within limit', async () => {
            // Setup
            User.findById.mockResolvedValue({ _id: 'user_123' });
            Project.countDocuments.mockResolvedValue(2); // Current count
            EntitlementService.canCreate.mockReturnValue(true); // Allow

            // Execute
            const middleware = checkResourceLimit('project');
            await middleware(req, res, next);

            // Verify
            expect(User.findById).toHaveBeenCalledWith('user_123');
            expect(Project.countDocuments).toHaveBeenCalled();
            expect(EntitlementService.canCreate).toHaveBeenCalledWith(expect.any(Object), 'project', 2);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should block request if user exceeds limit', async () => {
            // Setup
            User.findById.mockResolvedValue({ _id: 'user_123' });
            Project.countDocuments.mockResolvedValue(5); // Current count
            EntitlementService.canCreate.mockReturnValue(false); // Deny

            // Execute
            const middleware = checkResourceLimit('project');
            await middleware(req, res, next);

            // Verify
            expect(EntitlementService.canCreate).toHaveBeenCalledWith(expect.any(Object), 'project', 5);
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                code: 'LIMIT_REACHED'
            }));
        });

        it('should return 401 if user not found', async () => {
            User.findById.mockResolvedValue(null);

            const middleware = checkResourceLimit('project');
            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });
    });
});
