
import { jest } from '@jest/globals';
import { upgradeSubscription, reactivateSubscription } from '../src/controllers/subscriptionController.js';
import User from '../src/models/User.js';

// Mock dependencies
jest.mock('../src/models/User.js', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock('../src/models/Invoice.js', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock('../src/models/Project.js', () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn()
  }
}));

jest.mock('@clerk/backend', () => ({
  createClerkClient: () => ({})
}));

// Mock Razorpay
const mockSubscriptionsCreate = jest.fn();
const mockSubscriptionsCancel = jest.fn();
const mockSubscriptionsFetch = jest.fn();

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    subscriptions: {
      create: mockSubscriptionsCreate,
      cancel: mockSubscriptionsCancel,
      fetch: mockSubscriptionsFetch
    }
  }));
});

describe('Subscription Flow Tests', () => {
  let req, res, mockUser, mockSave;

  beforeEach(() => {
    req = { userId: 'test_user_id', body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    mockSave = jest.fn();
    mockUser = {
      clerkUserId: 'test_user_id',
      email: 'test@example.com',
      subscription: {
        plan: 'free',
        status: 'active',
        razorpaySubscriptionId: 'old_sub_id'
      },
      save: mockSave
    };

    User.findOne.mockResolvedValue(mockUser);
    
    jest.clearAllMocks();
    // Re-apply mock return because clearAllMocks might clear it
    User.findOne.mockResolvedValue(mockUser);
  });

  test('upgradeSubscription (Free -> Pro) should save new subscription ID to user', async () => {
    req.body.targetPlan = 'pro';
    mockUser.subscription.plan = 'free';
    
    // Mock Razorpay create response
    const newSubId = 'sub_new_free_to_pro';
    mockSubscriptionsCreate.mockResolvedValue({
      id: newSubId,
      status: 'created'
    });

    await upgradeSubscription(req, res);

    // Verify Razorpay was called
    expect(mockSubscriptionsCreate).toHaveBeenCalled();

    // CRITICAL CHECK: Verify user.save was called and ID was updated
    expect(mockUser.subscription.razorpaySubscriptionId).toBe(newSubId);
    expect(mockUser.subscription.status).toBe('created');
    expect(mockSave).toHaveBeenCalled();
    
    // Verify response
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      subscriptionId: newSubId
    }));
  });

  test('upgradeSubscription (Pro -> Studio) should save new subscription ID to user', async () => {
    req.body.targetPlan = 'studio';
    mockUser.subscription.plan = 'pro';
    mockUser.subscription.razorpaySubscriptionId = 'old_pro_sub';

    // Mock fetch current sub
    mockSubscriptionsFetch.mockResolvedValue({
      current_end: Math.floor(Date.now() / 1000) + 86400 // 1 day later
    });
    
    // Mock Razorpay create response
    const newSubId = 'sub_new_pro_to_studio';
    mockSubscriptionsCreate.mockResolvedValue({
      id: newSubId,
      status: 'created'
    });

    await upgradeSubscription(req, res);

    // Verify cancel was called for old sub
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith('old_pro_sub');

    // Verify create was called for new sub
    expect(mockSubscriptionsCreate).toHaveBeenCalled();

    // CRITICAL CHECK: Verify user.save was called and ID was updated
    expect(mockUser.subscription.razorpaySubscriptionId).toBe(newSubId);
    expect(mockUser.subscription.status).toBe('created');
    expect(mockSave).toHaveBeenCalled();
    
    // Verify response
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      subscriptionId: newSubId
    }));
  });

  test('reactivateSubscription should save new subscription ID to user when creating new sub', async () => {
    req.body.plan = 'pro';
    
    // Setup user as cancelled/expired
    mockUser.subscription.status = 'cancelled';
    mockUser.subscription.razorpaySubscriptionId = null; 

    // Mock Razorpay create response
    const newSubId = 'sub_reactivate_456';
    mockSubscriptionsCreate.mockResolvedValue({
      id: newSubId,
      status: 'created'
    });

    await reactivateSubscription(req, res);

    // Verify Razorpay was called
    expect(mockSubscriptionsCreate).toHaveBeenCalled();

    // CRITICAL CHECK: Verify user.save was called and ID was updated
    expect(mockUser.subscription.razorpaySubscriptionId).toBe(newSubId);
    expect(mockUser.subscription.status).toBe('created');
    expect(mockSave).toHaveBeenCalled();

    // Verify response
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      subscriptionId: newSubId
    }));
  });
});
