import * as Sentry from '@sentry/react';

/**
 * Student-Budget-Friendly Sentry Configuration for React
 * 
 * FREE TIER LIMITS (as of 2025):
 * - 5,000 errors/month
 * - 10,000 performance transactions/month
 * 
 * Our configuration:
 * - Sample rate: 5% for performance (very low to save quota)
 * - Filter common/non-critical errors
 * - Only track production errors
 * - Ignore user input validation errors
 */

export function initSentry() {
  // Only initialize Sentry in production
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE || 'development',
      
      // BUDGET-FRIENDLY: Only sample 5% of transactions
      tracesSampleRate: 0.05,
      
      // Capture replays only for errors (not all sessions)
      replaysSessionSampleRate: 0, // Don't record normal sessions
      replaysOnErrorSampleRate: 0.1, // Record 10% of error sessions
      
      // Filter out noise
      ignoreErrors: [
        // Network errors
        'NetworkError',
        'Network request failed',
        'Failed to fetch',
        'Load failed',
        'ChunkLoadError',
        
        // Browser extensions
        'chrome-extension',
        'moz-extension',
        
        // Authentication (expected)
        'Invalid token',
        'Unauthorized',
        '401',
        
        // Common user errors
        'Not found',
        '404',
        
        // Cancelled requests
        'cancelled',
        'aborted',
        
        // React errors we handle
        'ResizeObserver loop limit exceeded',
      ],
      
      beforeSend(event, hint) {
        // Filter out errors from bots
        if (navigator.userAgent && /bot|crawler|spider/i.test(navigator.userAgent)) {
          return null;
        }
        
        // Filter validation errors
        const error = hint.originalException;
        if (error?.message?.includes('Validation') || error?.message?.includes('required')) {
          return null;
        }
        
        // Filter Clerk errors (they handle their own)
        if (error?.message?.includes('Clerk')) {
          return null;
        }
        
        return event;
      },
      
      integrations: [
        new Sentry.BrowserTracing({
          // Only trace important navigations
          tracingOrigins: [
            'localhost',
            /^https:\/\/.*\.vercel\.app/,
            /^https:\/\/studioflow\.studio/
          ],
        }),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });

    console.log('✅ Sentry initialized (Budget mode: 5% sampling)');
  } else {
    console.log('⚠️  Sentry disabled (not in production or no DSN)');
  }
}

// Manual error capture for critical errors only
export function captureException(error, context = {}) {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
      level: 'error'
    });
  }
}
