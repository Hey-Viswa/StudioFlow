import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestAuth() {
  const { getToken } = useAuth();
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callProtectedAPI = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiUrl}/protected`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'API call failed');
      }

      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Authentication Test</CardTitle>
          <CardDescription className="text-gray-400">
            Test the protected API endpoint with Clerk authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={callProtectedAPI} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Calling...' : 'Call Protected API'}
          </Button>

          {response && (
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-green-400 font-semibold mb-2">✅ Success</h3>
              <pre className="text-xs text-gray-300 overflow-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-900">
              <h3 className="text-red-400 font-semibold mb-2">❌ Error</h3>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
