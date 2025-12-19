import request from 'supertest';
import express from 'express';
import paymentsV2Routes from '../routes/paymentsV2.js';

// Minimal app for route testing
const app = express();
app.use(express.json());
app.use('/api', paymentsV2Routes);

// Mock middlewares
jest.mock('../middlewares/verifyClerkJWKS.js', () => ({ __esModule: true, default: (req, res, next) => { req.userId = 'user'; next(); } }));
jest.mock('../middlewares/checkRole.js', () => ({ requireTeam: (_req, _res, next) => next() }));

// Mock models
const mockInvoice = { _id: 'inv1', userId: 'owner1', type: 'project' };
const mockOwner = { _id: 'owner1', paymentProfile: { enableV2: true, isRouteReady: true } };

jest.mock('../models/ProjectInvoice.js', () => ({ __esModule: true, default: { findById: jest.fn(() => mockInvoice) } }));
jest.mock('../models/User.js', () => ({ __esModule: true, default: { findById: jest.fn(() => mockOwner) } }));

// Mock resolver to control branch
jest.mock('../services/PaymentContextResolver.js', () => ({ resolvePaymentContext: jest.fn(() => ({ rail: 'v1', reason: 'flag_disabled' })) }));

// Mock controller to assert execution
const createOrderMock = jest.fn((req, res) => res.json({ ok: true }));
jest.mock('../controllers/paymentV2Controller.js', () => ({ __esModule: true, createRouteOrder: (...args) => createOrderMock(...args) }));

// Raw body parser dependency for webhook (unused here)
jest.mock('../controllers/paymentV2WebhookController.js', () => ({ __esModule: true, handleRouteProjectWebhook: jest.fn((req, res) => res.json({ ok: true })) }));

import { resolvePaymentContext } from '../services/PaymentContextResolver.js';

describe('payments v2 create-order routing gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('blocks when resolver chooses v1', async () => {
    resolvePaymentContext.mockReturnValue({ rail: 'v1', reason: 'flag_disabled' });

    const res = await request(app)
      .post('/api/payments/v2/create-order')
      .send({ invoiceId: 'inv1' });

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('flag_disabled');
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  test('calls controller when resolver chooses v2', async () => {
    resolvePaymentContext.mockReturnValue({ rail: 'v2', reason: 'all_checks_passed' });

    const res = await request(app)
      .post('/api/payments/v2/create-order')
      .send({ invoiceId: 'inv1' });

    expect(res.status).toBe(200);
    expect(createOrderMock).toHaveBeenCalled();
  });
});
