import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import User from '../src/models/User.js';
import '../src/config/razorpayEnv.js';
import { isUsingTestRazorpayKeys } from '../src/config/razorpayEnv.js';
import SubscriptionStateMachine from '../src/services/SubscriptionStateMachine.js';

// Resolve repo root regardless of where script is invoked
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

// Load env (root .env first, then current process)
dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config();

const TEST_PRO_PLAN_FALLBACK = 'plan_RcTPS7s2l9ku5N';
const TEST_STUDIO_PLAN_FALLBACK = 'plan_RcTPuLbBYG9E8N';

const planFromId = (planId) => {
  if (!planId) return null;
  if (
    planId === process.env.RAZORPAY_PRO_PLAN_ID ||
    planId === process.env.RAZORPAY_PRO_PLAN_ID_TEST ||
    planId === TEST_PRO_PLAN_FALLBACK
  ) return 'pro';
  if (
    planId === process.env.RAZORPAY_STUDIO_PLAN_ID ||
    planId === process.env.RAZORPAY_STUDIO_PLAN_ID_TEST ||
    planId === TEST_STUDIO_PLAN_FALLBACK
  ) return 'studio';
  return null;
};

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log(`ℹ️ Razorpay ready (${isUsingTestRazorpayKeys ? 'TEST' : 'LIVE'})`);
} else {
  console.error('❌ Missing Razorpay credentials');
  process.exit(1);
}

async function recoverSubscriptionId(user) {
  if (!user.subscription?.razorpayCustomerId && !user.subscription?.razorpaySubscriptionId) return null;

  // If already present, return it
  if (user.subscription.razorpaySubscriptionId) return user.subscription.razorpaySubscriptionId;

  // Try payments by customer
  try {
    const payments = await razorpay.payments.all({ customer_id: user.subscription.razorpayCustomerId, count: 50 });
    const withSub = payments.items.find(p => p.subscription_id);
    if (withSub) return withSub.subscription_id;

    const withInvoice = payments.items.find(p => p.invoice_id);
    if (withInvoice) {
      const inv = await razorpay.invoices.fetch(withInvoice.invoice_id);
      if (inv?.subscription_id) return inv.subscription_id;
    }
  } catch (err) {
    console.error(`⚠️ Payment lookup failed for ${user.email || user.clerkUserId}:`, err.message);
  }
  return null;
}

async function reconcileUser(user) {
  const subId = await recoverSubscriptionId(user);
  if (!subId) return { updated: false, reason: 'no-subscription-id' };

  try {
    const rpSub = await razorpay.subscriptions.fetch(subId);
    let plan = rpSub.notes?.plan || planFromId(rpSub.plan_id) || user.subscription.plan || 'pro';

    let status = user.subscription.status || 'pending';
    try {
      status = SubscriptionStateMachine.transition(status, 'active');
    } catch {
      status = 'active';
    }

    user.subscription.razorpaySubscriptionId = subId;
    user.subscription.plan = plan;
    user.subscription.status = status;
    user.subscription.subscriptionStartDate = rpSub.start_at ? new Date(rpSub.start_at * 1000) : user.subscription.subscriptionStartDate;
    if (rpSub.current_end) {
      user.subscription.subscriptionEndDate = new Date(rpSub.current_end * 1000);
    } else if (rpSub.end_at) {
      user.subscription.subscriptionEndDate = new Date(rpSub.end_at * 1000);
    }
    user.subscription.autoRenew = rpSub.status === 'active';

    await user.save();

    return { updated: true, plan, status };
  } catch (err) {
    return { updated: false, reason: err.message };
  }
}

async function main() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI missing');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('✓ Mongo connected');

    const users = await User.find({ 'subscription.plan': { $exists: true } }).lean(false);
    console.log(`Scanning ${users.length} users...`);

    let healed = 0;
    for (const user of users) {
      const result = await reconcileUser(user);
      if (result.updated) {
        healed += 1;
        console.log(`✅ Healed ${user.email || user.clerkUserId}: ${result.plan} / ${result.status}`);
      }
    }

    console.log(`Done. Healed ${healed} users.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Heal failed:', err.message);
    process.exit(1);
  }
}

main();
