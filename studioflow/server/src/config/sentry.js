import * as Sentry from '@sentry/node';

/**
 * Student-Budget-Friendly Sentry Configuration
 * 
 * FREE TIER LIMITS (as of 2025):
 * - 5,000 errors/month
 * - 10,000 performance transactions/month
 * - 1 GB of attachments
 * 
 * Our configuration ensures we stay within limits:
 * - Sample rate: 10% (only track 10% of transactions)
 * - Filter common/non-critical errors
 * - Only track production errors
 */

export function initSentry(app) {
  // Only initialize Sentry in production with valid DSN
  if (process.env.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    console.log('⚠️  Sentry disabled (not in production or no DSN)');
    return false; // Return false to indicate Sentry is not initialized
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // BUDGET-FRIENDLY: Only sample 10% of transactions
    tracesSampleRate: 0.1,
    
    // Filter out noise - ignore common non-critical errors
    ignoreErrors: [
      // Browser/Network errors
      'NetworkError',
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      
      // Authentication errors (expected behavior)
      'Invalid token',
      'Token expired',
      'Unauthorized',
      
      // Common user errors
      'Not found',
      '404',
      
      // Timeout errors
      'timeout',
      'ETIMEDOUT',
      'ECONNRESET'
    ],
    
    // Only send errors, not debug/info logs
    beforeSend(event, hint) {
      // Filter out errors from bots/crawlers
      const userAgent = event.request?.headers?.['user-agent'] || '';
      if (/bot|crawler|spider|scraper/i.test(userAgent)) {
        return null; // Don't send
      }
      
      // Filter out validation errors (user input errors)
      const error = hint.originalException;
      if (error?.message?.includes('Validation') || error?.message?.includes('required')) {
        return null;
      }
      
      return event;
    },
    
    // Node integrations (updated for new Sentry SDK)
    integrations: [
      Sentry.httpIntegration({ tracing: true }),
      Sentry.expressIntegration({ app }),
    ],
  });

  console.log('✅ Sentry initialized (Budget mode: 10% sampling)');
  return true; // Return true to indicate Sentry is initialized
}

// Sentry error handler middleware
export function sentryErrorHandler() {
  if (process.env.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    return (req, res, next) => next(); // No-op middleware
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only send 5xx errors to Sentry
      return error.status >= 500;
    }
  });
}

// Sentry request handler middleware
export function sentryRequestHandler() {
  if (process.env.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    return (req, res, next) => next(); // No-op middleware
  }
  return Sentry.Handlers.requestHandler();
}

// Sentry tracing handler middleware
export function sentryTracingHandler() {
  if (process.env.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    return (req, res, next) => next(); // No-op middleware
  }
  return Sentry.Handlers.tracingHandler();
}

// Manual error capture for critical errors only
export function captureException(error, context = {}) {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
      level: 'error'
    });
  }
}
