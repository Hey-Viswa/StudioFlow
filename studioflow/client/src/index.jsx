import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const MissingKey = () => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Clerk key missing</h1>
      <p>
        Please set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in the root <code>.env</code> file and restart
        <code> npm run start</code>.
      </p>
    </div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {PUBLISHABLE_KEY ? (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <App />
      </ClerkProvider>
    ) : (
      <MissingKey />
    )}
  </React.StrictMode>
);

reportWebVitals();
