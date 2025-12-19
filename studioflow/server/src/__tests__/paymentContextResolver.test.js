import { resolvePaymentContext } from '../services/PaymentContextResolver.js';

describe('PaymentContextResolver', () => {
  const baseInvoice = { _id: 'inv1', type: 'project' };
  const baseOwner = { _id: 'owner1', paymentProfile: { enableV2: true, isRouteReady: true } };

  const withFlag = (val) => {
    process.env.ENABLE_PAYMENT_V2 = val;
  };

  afterEach(() => {
    delete process.env.ENABLE_PAYMENT_V2;
  });

  test('flag off -> v1', () => {
    withFlag('false');
    const res = resolvePaymentContext({ invoice: baseInvoice, owner: baseOwner });
    expect(res.rail).toBe('v1');
    expect(res.reason).toBe('flag_disabled');
  });

  test('non-project invoice -> v1', () => {
    withFlag('true');
    const res = resolvePaymentContext({ invoice: { ...baseInvoice, type: 'subscription' }, owner: baseOwner });
    expect(res.rail).toBe('v1');
    expect(res.reason).toBe('non_project_invoice');
  });

  test('owner enableV2 false -> v1', () => {
    withFlag('true');
    const owner = { ...baseOwner, paymentProfile: { enableV2: false, isRouteReady: true } };
    const res = resolvePaymentContext({ invoice: baseInvoice, owner });
    expect(res.rail).toBe('v1');
    expect(res.reason).toBe('owner_v2_disabled');
  });

  test('owner not route ready -> v1', () => {
    withFlag('true');
    const owner = { ...baseOwner, paymentProfile: { enableV2: true, isRouteReady: false } };
    const res = resolvePaymentContext({ invoice: baseInvoice, owner });
    expect(res.rail).toBe('v1');
    expect(res.reason).toBe('owner_not_route_ready');
  });

  test('all checks pass -> v2', () => {
    withFlag('true');
    const res = resolvePaymentContext({ invoice: baseInvoice, owner: baseOwner });
    expect(res.rail).toBe('v2');
    expect(res.reason).toBe('all_checks_passed');
  });

  test('errors default to v1', () => {
    withFlag('true');
    const res = resolvePaymentContext({ invoice: null, owner: null });
    expect(res.rail).toBe('v1');
    expect(res.reason).toBe('error_default_v1');
  });
});
