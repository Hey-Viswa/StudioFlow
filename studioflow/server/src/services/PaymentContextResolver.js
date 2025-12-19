// Pure decision helper for choosing payment rail; defaults to v1 on any doubt or error.
const isFlagOn = () => String(process.env.ENABLE_PAYMENT_V2 || '').toLowerCase() === 'true';

export const resolvePaymentContext = ({ invoice, owner }) => {
  try {
    const invoiceId = invoice?._id?.toString() || 'unknown';
    const ownerId = owner?._id?.toString() || 'unknown';

    const emit = (rail, reason) => {
      console.log('[PaymentResolver] decision', JSON.stringify({ rail, reason, invoiceId, ownerId }));
      return { rail, reason };
    };

    if (!isFlagOn()) return emit('v1', 'flag_disabled');

    if (!invoice) return emit('v1', 'invoice_missing');

    const invoiceType = (invoice.type || invoice.invoiceType || '').toString().toLowerCase();
    if (invoiceType && invoiceType !== 'project') {
      return emit('v1', 'non_project_invoice');
    }

    if (!owner) return emit('v1', 'owner_missing');

    const profile = owner.paymentProfile || {};

    if (profile.enableV2 !== true) return emit('v1', 'owner_v2_disabled');
    if (profile.isRouteReady !== true) return emit('v1', 'owner_not_route_ready');
    if (!profile.razorpayLinkedAccountId) return emit('v1', 'linked_account_missing');

    return emit('v2', 'all_checks_passed');
  } catch (err) {
    console.error('[PaymentResolver] error', err.message);
    return { rail: 'v1', reason: 'resolver_error' };
  }
};

export default resolvePaymentContext;
