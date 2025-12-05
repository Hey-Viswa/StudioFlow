import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export const initSentry = (app) => {
  if (!process.env.SENTRY_DSN) {
    console.warn('⚠️ Sentry DSN not provided. Observability disabled.');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    args: {
      app,
    },
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0, // Capture 100% of transactions for now (adjust for prod)
    profilesSampleRate: 1.0,
    environment: process.env.NODE_ENV || 'development',
  });

  console.log('✅ Sentry initialized');
};

export default { initSentry };
