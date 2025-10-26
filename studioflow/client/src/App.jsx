import './App.css';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #333' }}>
          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <h1 style={{ margin: 0 }}>StudioFlow</h1>
            <Link to="/" style={{ color: '#61dafb', textDecoration: 'none' }}>Home</Link>
            <SignedIn>
              <Link to="/dashboard" style={{ color: '#61dafb', textDecoration: 'none' }}>Dashboard</Link>
            </SignedIn>
          </nav>
          <div>
            <SignedOut>
              <SignInButton mode="modal">
                <button style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Sign in</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/dashboard"
            element={
              <SignedIn>
                <Dashboard />
              </SignedIn>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
