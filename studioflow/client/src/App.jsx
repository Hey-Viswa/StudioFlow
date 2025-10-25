import './App.css';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import ProtectedExample from './components/ProtectedExample.jsx';

function App() {
  return (
    <div className="App">
      <header className="App-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
        <h1>StudioFlow</h1>
        <div>
          <SignedOut>
            <SignInButton>Sign in</SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      <main style={{ padding: '1.5rem' }}>
        <h2>Welcome</h2>
        <p>Sign in with Clerk and call the protected API to see your decoded token.</p>
        <ProtectedExample />
      </main>
    </div>
  );
}

export default App;
