# StudioFlow Payment Rails — Manual Test Matrix

**Scope:** Validate v1 (subscriptions, legacy invoices), v2 Route (project invoices), Shadow mode, and failure handling. No code changes; manual/QA execution only.

---

## 1. Subscriptions (v1)

- [ ] **New subscription**
  - Preconditions: v1 keys configured; test user with no active sub.
  - Action: Purchase Pro plan via app.
  - Expected: Razorpay order created; payment captured; user.subscription updated to active; entitlement/plan access granted.
  - Verify: DB user.subscription fields; logs for order/payment; Razorpay dashboard order/payment.

- [ ] **Renewal**
  - Preconditions: Existing active subscription near renewal date (or trigger via test harness).
  - Action: Let renewal charge occur or simulate via test card.
  - Expected: New payment captured; nextBillingDate advanced; status remains active.
  - Verify: DB subscription dates; Razorpay payment; logs.

- [ ] **Cancellation**
  - Preconditions: Active subscription.
  - Action: Cancel via UI/API.
  - Expected: Status set to cancelled (or pending period end); no further renewals.
  - Verify: DB subscription status; Razorpay subscription status; logs.

- [ ] **Webhook retries**
  - Preconditions: Ability to replay Razorpay subscription webhooks.
  - Action: Send duplicate subscription webhook events.
  - Expected: Idempotent handling; no double updates.
  - Verify: Logs show "already processed"; DB unchanged after first; Razorpay unchanged.

---

## 2. Project Invoices — v1 Fallback

- [ ] **Owner not Route-ready**
  - Preconditions: ENABLE_PAYMENT_V2=true; owner has no linked account or isRouteReady=false.
  - Action: Attempt to pay invoice.
  - Expected: v1 path used (or v2 create-order blocked with clear error); payment settles to StudioFlow.
  - Verify: Response error reason; no v2 PaymentThread; v1 invoice/payment logs; Razorpay order under platform account.

- [ ] **Owner enableV2=false**
  - Preconditions: ENABLE_PAYMENT_V2=true; owner.enableV2=false.
  - Action: Attempt to pay invoice.
  - Expected: Blocked from v2; v1 or error depending on flow; funds to StudioFlow.
  - Verify: Error reason indicates v2 not eligible; no v2 PaymentThread; Razorpay order (if created) is platform.

- [ ] **ENABLE_PAYMENT_V2=false**
  - Preconditions: Flag off.
  - Action: Pay invoice.
  - Expected: v1 only; funds to StudioFlow.
  - Verify: No v2 PaymentThread; Razorpay order under platform.

- [ ] **Duplicate payment attempts**
  - Preconditions: Unpaid invoice.
  - Action: Click pay twice rapidly.
  - Expected: Same Razorpay order reused or second attempt blocked; single capture.
  - Verify: PaymentThread idempotency; invoice status once; Razorpay single payment.

---

## 3. Project Invoices — v2 Route

- [ ] **Eligible owner & invoice**
  - Preconditions: ENABLE_PAYMENT_V2=true; owner.enableV2=true; isRouteReady=true; linked account present; invoice type=project, status!=paid.
  - Action: Call v2 create-order endpoint (client or API).
  - Expected: Razorpay Route order created with transfer to owner account; PaymentThread (paymentRail v2, status pending, routeTransferId maybe present).
  - Verify: DB PaymentThread; logs decision; Razorpay dashboard order shows transfer; no entitlements yet.

- [ ] **payment.captured webhook**
  - Preconditions: Order from prior step; ability to trigger capture (test card) and receive webhook.
  - Action: Complete payment; let webhook hit `/payments/v2/project-webhook`.
  - Expected: Signature verified; invoice marked paid; PaymentThread status paid with paymentId; entitlement created once.
  - Verify: DB invoice status=paid; PaymentThread paid with razorpayPaymentId; entitlement exists; logs success.

- [ ] **Duplicate webhook**
  - Preconditions: Captured payment; ability to resend webhook with same event_id.
  - Action: Replay payment.captured.
  - Expected: ProcessedWebhook guard; no double entitlement; 200 response.
  - Verify: ProcessedWebhook entry; entitlement count unchanged; logs show already processed.

---

## 4. Shadow Mode

- [ ] **Shadow OFF**
  - Preconditions: ENABLE_PAYMENT_V2_SHADOW=false.
  - Action: Pay invoice (any eligibility).
  - Expected: No shadow records; no shadow logs.
  - Verify: ShadowPaymentRecord empty for that invoice; logs quiet.

- [ ] **Shadow ON**
  - Preconditions: ENABLE_PAYMENT_V2_SHADOW=true; ENABLE_PAYMENT_V2 may be on or off.
  - Action: Pay invoice.
  - Expected: ShadowPaymentRecord created with reason/amount/ownerShare; no Razorpay call; client behavior unchanged.
  - Verify: DB ShadowPaymentRecord entry; logs `[PaymentShadow]`; no v2 PaymentThread unless truly eligible and allowed.

- [ ] **Missing eligibility reasons logged**
  - Preconditions: Shadow ON; make invoice/owner ineligible (e.g., no linkedId).
  - Action: Pay invoice.
  - Expected: Shadow record shows missing conditions; rail decision v1.
  - Verify: ShadowPaymentRecord.missing includes linked_id_missing (or similar); logs reason.

---

## 5. Failure Scenarios

- [ ] **Razorpay API timeout (v2 create-order)**
  - Preconditions: ENABLE_PAYMENT_V2=true and eligible; simulate timeout (network block or mock).
  - Action: Call v2 create-order.
  - Expected: 502 error; no PaymentThread persisted.
  - Verify: DB has no new v2 thread; logs show Razorpay create failure; Razorpay dashboard has no order.

- [ ] **Webhook signature mismatch**
  - Preconditions: payment.captured payload; use wrong secret.
  - Action: Send webhook with invalid signature to v2 endpoint.
  - Expected: 400 response; no state change.
  - Verify: Invoice not updated; no entitlement; logs invalid signature; ProcessedWebhook not written.

- [ ] **Missing PaymentThread**
  - Preconditions: Send webhook with valid signature but order_id not in DB.
  - Action: payment.captured.
  - Expected: Log critical; return 200; no invoice change.
  - Verify: Logs for missing thread; invoice unchanged.

- [ ] **Entitlement failure**
  - Preconditions: Force entitlement create to throw (e.g., duplicate constraint) after payment captured.
  - Action: Trigger webhook.
  - Expected: Payment and invoice marked paid; entitlement creation error logged; no rollback.
  - Verify: Invoice paid; PaymentThread paid; entitlement absent or single; error log present; ProcessedWebhook recorded.

---

## Logging & Verification Quick Reference

- **DB:** PaymentThread (paymentRail, status, razorpayOrderId/PaymentId), ProjectInvoice.status/paidAt, Entitlement, ShadowPaymentRecord, ProcessedWebhook.
- **Logs:** PaymentResolver decisions, PaymentShadow entries, webhook signature validation, idempotency skips, entitlement errors.
- **Razorpay Dashboard:** Orders (Route transfer to owner), Payments, Transfers, Subscription status.

---

## Completion Criteria

- All checkboxes validated manually.
- No unexpected entitlements or payments.
- Shadow records auto-expire (14 days) confirmed.
- v1 behavior unchanged throughout.

---

## 2. Three Critical Gotchas (Read Before Testing)

- **Frontend hitting wrong endpoint**: UI must call `/api/payments/v2/create-order` for project invoices. If it calls `/api/invoices/project/:invoiceId/pay`, Route never runs and funds go to StudioFlow. Action: watch the Network tab and confirm v2 endpoint only; expect 409 if legacy is hit while v2-eligible.
- **Route not enabled at Razorpay**: Tests assume Route/Marketplace is approved and the linked account is active in the same mode (test vs live). If not, preflight will fail or transfers will be ignored. Action: Razorpay Dashboard → Settings → Route/Marketplace → confirm Route enabled and linked accounts visible.
- **`REQUIRE_OWNER_RAZORPAY_SECRET` misuse**: Route does not require owner API keys; linked account ID is sufficient. Enabling this flag without stored secrets will block v2. Recommendation: keep encryption system, set `REQUIRE_OWNER_RAZORPAY_SECRET=false` unless you explicitly need owner keys.

## 3. Correct Test Run Order (Do Exactly This)

1) **Phase 1 — Dry safety checks (no money)**
  - Flags: `ENABLE_PAYMENT_V2=true`; owner `enableV2=true`; `isRouteReady=true`; missing `linkedAccountId`.
  - Expect: 403/503, `route_preflight_failed`, no Razorpay order, no checkout.
  - If this fails, stop.

2) **Phase 2 — Route readiness validation**
  - Add valid `linkedAccountId`; keep Route disabled/not approved in Razorpay.
  - Expect: preflight failure; Route order blocked/`route_failed`; no checkout.

3) **Phase 3 — ₹1 real Route execution (most important)**
  - Route enabled; linked account active; new ₹1 invoice; UI calls `/api/payments/v2/create-order`.
  - Expect all: Razorpay order shows Transfers tab; owner receives ₹1; StudioFlow gets ₹0 (or only fee); PaymentThread `paymentRail=v2`; entitlement granted. If any missing, stop and debug.

4) **Phase 4 — Failure enforcement**
  - Tamper webhook (wrong transfer account) and replay.
  - Expect: `route_failed`; invoice not paid; no entitlement.

## 4. Success Criteria (Non-Negotiable)

- Money settles to owner when v2-eligible.
- Money never settles to StudioFlow for v2.
- No v1 fallback when v2 eligible.
- No entitlement without a valid transfer.
- All failures are loud and audited.
