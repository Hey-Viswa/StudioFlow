import { useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callProtectedAPI = async () => {
    setLoading(true);
    setError(null);
    setApiResponse(null);
    
    try {
      // Get Clerk session token
      const token = await getToken();
      if (!token) {
        throw new Error('No session token available');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/protected`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      setApiResponse(data);
      console.log('Protected API Response:', data);
    } catch (err) {
      setError(err.message);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, {user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'User'}!
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Protected API Test</CardTitle>
            <CardDescription>
              Test the Clerk JWT authentication with the backend
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={callProtectedAPI} disabled={loading}>
              {loading ? 'Calling API...' : 'Call Protected API'}
            </Button>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">Error:</p>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {apiResponse && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-md">
                <p className="text-sm font-medium mb-2">API Response:</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Info</CardTitle>
            <CardDescription>Your Clerk user details</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto">
              {JSON.stringify(
                {
                  id: user?.id,
                  email: user?.emailAddresses?.[0]?.emailAddress,
                  firstName: user?.firstName,
                  lastName: user?.lastName,
                },
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
