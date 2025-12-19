# Payment V2 (Razorpay Route) Test Guide

## Preconditions
- Environment: `ENABLE_PAYMENT_V2=true`; optional `ENABLE_PAYMENT_V2_SHADOW=true` for shadow-only observations.
- Secrets: set `PAYMENT_SECRET_MASTER_KEY` to 32-byte base64. If enforcing owner secrets: `REQUIRE_OWNER_RAZORPAY_SECRET=true`.
- Platform creds: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_ROUTE_WEBHOOK_SECRET` set (sandbox or prod as appropriate).
- Linked account: Razorpay Route-enabled linked account exists and is active.
- Auth: valid Clerk session for owner and client flows.

## Owner Credential Flow
1) **Upsert credentials** (owner auth): `POST /api/payments/v2/owner/credentials` with JSON `{ linkedAccountId, keyId?, keySecret? }`.
   - Expect 200 with masked `keyIdMasked`, `fingerprint`; no secret returned.
2) **Fetch metadata**: `GET /api/payments/v2/owner/credentials`.
   - Expect masked metadata only; no secret value.
3) Negative: omit `linkedAccountId` → 400; supply keyId without keySecret → 400.
4) If `REQUIRE_OWNER_RAZORPAY_SECRET=true` and no secret stored, v2 order should be blocked (403) with audit `route_order_blocked_missing_secret`.

## Resolver & Routing Gate
1) Create a project invoice for a Route-ready owner.
2) Call `POST /api/payments/v2/create-order` with `invoiceId`.
   - If eligible → 200 with `{ orderId, paymentRail: 'v2' }`.
   - If not → 403 with `reason` (see logs: `[PaymentResolver] decision ...`).
3) Attempt legacy endpoint `POST /api/invoices/project/:invoiceId/pay` when v2 eligible → expect 409 rejection (prevents fallback to v1).

## Preflight & Payload Validation
- Break linkedAccountId or suspend linked account → preflight returns 503/403; audit `route_preflight_failed`.
- Zero/negative invoice total → 400.
- Server enforces: exactly one transfer, `account`=linkedAccountId, `on_hold=false`, positive amount, and `platform_fee + transfer_amount == order.amount`.

## Order Creation Response
- If Razorpay response lacks transfer metadata → 502; PaymentThread saved as `route_failed`.
- Check PaymentThread: should be `pending` with `paymentRail: 'v2'` and `routeTransferId` set.

## Payment + Webhook
1) Pay via Razorpay Checkout using returned orderId.
2) Send Razorpay `payment.captured` webhook with valid signature to `/api/payments/v2/project-webhook`.
3) Handler flow:
   - Validates signature and idempotency.
   - Fetches transfer by `routeTransferId`; requires status in processed/completed and account matches owner linked account.
   - On success: PaymentThread → `paid`; invoice → `paid`; entitlement granted.
   - On mismatch/missing/failed transfer: PaymentThread → `route_failed`; invoice not marked paid; entitlement not granted.
4) Duplicate webhook → idempotent (ProcessedWebhook collection).

## Failure Cases to Verify
- Route disabled or linked account invalid → preflight blocks.
- Linked account suspended mid-flow → webhook marks `route_failed`.
- Transfer account mismatch → webhook blocks, no entitlement.
- Transfer not settled → webhook blocks, no entitlement.

## Shadow Mode (optional)
- With `ENABLE_PAYMENT_V2_SHADOW=true`, calls record decisions in `ShadowPaymentRecord` but still require resolver to allow real v2 execution.

## Observability & Logs
- Decisions: `[PaymentResolver] decision { rail, reason, invoiceId, ownerId }`.
- Preflight/payload errors: structured JSON logs and audit events (`route_preflight_failed`, `route_order_blocked_owner_not_ready`, etc.).
- No secrets in logs or responses; only masked/fingerprint metadata.

## Quick Test Commands
- API smoke: use Postman or curl to exercise endpoints above.
- Jest gate check: `cd studioflow/server && npm test -- paymentContextResolverRoute`.

## Success Criteria
- When eligibility is met, funds settle directly to the owner’s linked account; no v1 fallback occurs.
- Any misconfiguration yields explicit 4xx/5xx with audit trail; no client charge without valid transfer.
