import { jest } from '@jest/globals';

// 1. Define Mock Functions
const mockProjectFindById = jest.fn();
const mockProjectMemberFindOne = jest.fn();
const mockEntitlementFindOne = jest.fn();
const mockProjectFileFindOne = jest.fn();
const mockStorageAdapterGetSignedDownloadUrl = jest.fn();

// 2. Register Mocks with unstable_mockModule
jest.unstable_mockModule('../src/models/Project.js', () => ({
    default: {
        findById: mockProjectFindById
    }
}));

jest.unstable_mockModule('../src/models/ProjectMember.js', () => ({
    default: {
        findOne: mockProjectMemberFindOne
    }
}));

jest.unstable_mockModule('../src/models/Entitlement.js', () => ({
    default: {
        findOne: mockEntitlementFindOne
    }
}));

jest.unstable_mockModule('../src/models/ProjectFile.js', () => ({
    default: {
        findOne: mockProjectFileFindOne,
        find: jest.fn(),
        countDocuments: jest.fn(),
        aggregate: jest.fn()
    }
}));

jest.unstable_mockModule('../src/models/User.js', () => ({
    default: {
        findOne: jest.fn()
    }
}));

jest.unstable_mockModule('../src/utils/storageAdapter.js', () => ({
    default: {
        getSignedDownloadUrl: mockStorageAdapterGetSignedDownloadUrl,
        generateStorageKey: jest.fn(),
        verifyUpload: jest.fn()
    }
}));

jest.unstable_mockModule('../src/config/fileLimits.js', () => ({
    getMaxFileSize: jest.fn(),
    getMaxTotalStorage: jest.fn(),
    getMaxFilesPerProject: jest.fn(),
    isFileTypeAllowed: jest.fn(),
    formatBytes: jest.fn()
}));

jest.unstable_mockModule('../src/utils/permissions.js', () => ({
    checkPermission: jest.fn().mockReturnValue(true),
    PERMISSIONS: { FILE_VIEW: 'file.view' },
    ROLES: { OWNER: 'owner', CLIENT: 'client', COLLABORATOR: 'collaborator' }
}));

// 3. Import System Under Test (Dynamic Import)
const { checkProjectEntitlement } = await import('../src/middlewares/entitlementMiddleware.js');
const { getFileDetails } = await import('../src/controllers/fileController.js');

describe('Entitlement Unit Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            userId: 'user_123',
            params: { id: 'project_123', fileId: 'file_123' },
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();

        jest.clearAllMocks();
    });

    describe('Middleware: checkProjectEntitlement', () => {
        test('should allow Owner', async () => {
            mockProjectFindById.mockReturnValue({
                select: jest.fn().mockResolvedValue({ ownerId: 'user_123' })
            });

            await checkProjectEntitlement('project_download')(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should allow Team Member (Collaborator)', async () => {
            mockProjectFindById.mockReturnValue({
                select: jest.fn().mockResolvedValue({ ownerId: 'other_owner' })
            });
            mockProjectMemberFindOne.mockResolvedValue({ role: 'collaborator', status: 'active' });

            await checkProjectEntitlement('project_download')(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test('should block Unpaid Client', async () => {
            mockProjectFindById.mockReturnValue({
                select: jest.fn().mockResolvedValue({ ownerId: 'other_owner' })
            });
            mockProjectMemberFindOne.mockResolvedValue({ role: 'client', status: 'active' });
            mockEntitlementFindOne.mockResolvedValue(null); // No entitlement

            await checkProjectEntitlement('project_download')(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ENTITLEMENT_REQUIRED' }));
            expect(next).not.toHaveBeenCalled();
        });

        test('should allow Paid Client', async () => {
            mockProjectFindById.mockReturnValue({
                select: jest.fn().mockResolvedValue({ ownerId: 'other_owner' })
            });
            mockProjectMemberFindOne.mockResolvedValue({ role: 'client', status: 'active' });
            mockEntitlementFindOne.mockResolvedValue({
                expiresAt: new Date(Date.now() + 10000) // Future
            });

            await checkProjectEntitlement('project_download')(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test('should block Client with Expired Entitlement', async () => {
            mockProjectFindById.mockReturnValue({
                select: jest.fn().mockResolvedValue({ ownerId: 'other_owner' })
            });
            mockProjectMemberFindOne.mockResolvedValue({ role: 'client', status: 'active' });
            mockEntitlementFindOne.mockResolvedValue({
                expiresAt: new Date(Date.now() - 10000) // Past
            });

            await checkProjectEntitlement('project_download')(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ENTITLEMENT_EXPIRED' }));
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Controller: getFileDetails', () => {
        // Note: The controller relies on middleware for entitlement checks now.
        // We are testing that it proceeds to get the file if middleware passes (simulated by calling it directly).
        // But wait, the controller calls `getProjectRole` internally. We need to make sure that doesn't crash.
        // `getProjectRole` uses `Project.findById` and `ProjectMember.findOne`.

        test('should return file details and signed url for authorized user', async () => {
            // Setup mocks for getProjectRole inside controller
            mockProjectFindById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue({ ownerId: 'user_123' }) // User is owner
                })
            });

            // Mock File
            const mockFile = {
                fileId: 'file_123',
                projectId: 'project_123',
                storageKey: 'key/123',
                originalFilename: 'test.pdf',
                recordDownload: jest.fn(),
                toObject: jest.fn().mockReturnValue({ filename: 'test.pdf' })
            };
            mockProjectFileFindOne.mockResolvedValue(mockFile);

            // Mock Storage
            mockStorageAdapterGetSignedDownloadUrl.mockResolvedValue('https://signed.url');

            await getFileDetails(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                downloadUrl: 'https://signed.url'
            }));
        });
    });
});
