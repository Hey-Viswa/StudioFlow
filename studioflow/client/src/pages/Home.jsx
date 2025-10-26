import ProtectedExample from '../components/ProtectedExample';

export default function Home() {
  return (
    <main style={{ padding: '1.5rem' }}>
      <h2>Welcome to StudioFlow</h2>
      <p>Sign in with Clerk and call the protected API to see your decoded token.</p>
      <ProtectedExample />
    </main>
  );
}
