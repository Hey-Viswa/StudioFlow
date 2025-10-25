import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function ProtectedExample() {
  const { getToken, isLoaded } = useAuth();
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const callProtected = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const token = await getToken({ template: 'standard' });
      if (!token) {
        throw new Error('No session token available');
      }

      const res = await fetch(`${API_BASE}/protected`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResponse(data);
    } catch (err) {
      console.error(err);
      setResponse({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ marginTop: '2rem' }}>
      <button onClick={callProtected} disabled={loading || !isLoaded}>
        {loading ? 'Calling…' : 'Call Protected API'}
      </button>
      <pre style={{ marginTop: '1rem', background: '#111', color: '#0f0', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto' }}>
        {response ? JSON.stringify(response, null, 2) : 'Response will appear here'}
      </pre>
    </section>
  );
}
