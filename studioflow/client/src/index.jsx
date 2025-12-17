import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { HelmetProvider } from 'react-helmet-async';
import { initSentry } from './config/sentry';
import './index.css';
// Production deployment v3
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from './components/theme-provider';
import { FeatureFlagProvider } from './context/FeatureFlagContext';

// Initialize Sentry FIRST (before React renders)
initSentry();

// Global handler for stale chunk errors (Post-Deployment Cache Fix)
window.addEventListener('error', (event) => {
  // Check for common chunk loading errors
  const isChunkError = /Loading chunk [\d]+ failed/.test(event.message) ||
    /Failed to fetch dynamically imported module/.test(event.message) ||
    /Importing a module script failed/.test(event.message);

  if (isChunkError) {
    console.warn('⚠️ Stale chunk detected (Audit: Deployment Update). retrying...');
    // Prevent infinite reload loops if server is actually down
    const lastReload = sessionStorage.getItem('chunk_reload');
    if (!lastReload || Date.now() - parseInt(lastReload) > 10000) {
      sessionStorage.setItem('chunk_reload', Date.now().toString());
      window.location.reload();
    }
  }
});

// Production Clerk Configuration
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.error('❌ Missing Clerk Publishable Key!');
  console.error('Please add VITE_CLERK_PUBLISHABLE_KEY to studioflow/client/.env.local');
  console.error('Environment variables:', import.meta.env);
} else {
  // console.log('✅ Clerk Publishable Key loaded');
}

const MissingKey = () => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center', fontFamily: 'system-ui' }}>
    <div>
      <h1 style={{ marginBottom: '1rem', color: '#dc2626' }}>⚠️ Clerk Configuration Missing</h1>
      <p style={{ marginBottom: '0.5rem' }}>
        Please set <code style={{ background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>VITE_CLERK_PUBLISHABLE_KEY</code> in
      </p>
      <p style={{ marginBottom: '1rem' }}>
        <code style={{ background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>studioflow/client/.env.local</code>
      </p>
      <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
        Current key: <code>{PUBLISHABLE_KEY || 'undefined'}</code>
      </p>
      <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
        Then restart the dev server: <code style={{ background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>npm run dev</code>
      </p>
    </div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {PUBLISHABLE_KEY ? (
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        appearance={{
          baseTheme: undefined,
          variables: {
            colorPrimary: '#7877c6',
            colorBackground: '#ffffff',
            colorInputBackground: '#ffffff',
            colorInputText: '#020817',
            borderRadius: '0.5rem',
          },
          elements: {
            formButtonPrimary:
              'bg-primary hover:bg-primary/90 text-white font-semibold transition-all duration-200',
            card: 'shadow-2xl border border-gray-200',
            headerTitle: 'text-2xl font-bold',
            headerSubtitle: 'text-gray-600',
            socialButtonsBlockButton:
              'border-2 hover:bg-gray-50 transition-all duration-200',
            formFieldInput:
              'border-2 focus:border-primary transition-all duration-200',
            footerActionLink: 'text-primary hover:text-primary/80 font-semibold',
          },
        }}
      >
        <FeatureFlagProvider>
          <HelmetProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <App />
            </ThemeProvider>
          </HelmetProvider>
        </FeatureFlagProvider>
      </ClerkProvider>
    ) : (
      <MissingKey />
    )}
  </React.StrictMode>
);

reportWebVitals();
