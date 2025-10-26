import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

// Use relative path - Vite proxy will forward to backend
const API_BASE = '/api';

export default function ProtectedExample() {
  const { getToken, isLoaded } = useAuth();
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const callProtected = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No session token available');
      }

      const url = `${API_BASE}/protected`;
      console.log('Calling API:', url);

      const res = await fetch(url, {
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
      console.error('API call error:', err);
      setResponse({ error: err.message, apiBase: API_BASE });
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
