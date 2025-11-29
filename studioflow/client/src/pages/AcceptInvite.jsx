import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, useUser, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, CheckCircle2, XCircle, UserPlus, Shield } from 'lucide-react';

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [status, setStatus] = useState('verifying'); // verifying, valid, invalid, accepting, success, error
  const [projectInfo, setProjectInfo] = useState(null);
  const [error, setError] = useState(null);
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyInvite();
    } else {
      setStatus('invalid');
      setError('No invite token provided');
    }
  }, [token]);

  const verifyInvite = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/invites/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (data.valid) {
        setStatus('valid');
        setProjectInfo(data.project);
        // Don't auto-accept, let user click the button
      } else {
        setStatus('invalid');
        setError(data.error || 'Invalid invite link');
      }
    } catch (err) {
      console.error('Verify invite error:', err);
      setStatus('invalid');
      setError('Failed to verify invite');
    }
  };

  const handleAccept = async () => {
    setStatus('accepting');
    setError(null);

    try {
      // Get Clerk token
      const clerkToken = await getToken();

      if (!clerkToken) {
        throw new Error('Authentication required. Please sign in.');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/invites/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clerkToken}`
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to accept invite' }));
        throw new Error(errorData.error || 'Failed to accept invite');
      }

      const data = await response.json();
      setStatus('success');

      // Redirect to project after a brief delay
      setTimeout(() => {
        navigate(`/dashboard/projects/${data.project._id}`);
      }, 2000);
    } catch (err) {
      console.error('Accept invite error:', err);
      setStatus('error');
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'verifying' && <Loader2 className="w-12 h-12 text-primary animate-spin" />}
            {status === 'valid' && <UserPlus className="w-12 h-12 text-primary" />}
            {status === 'accepting' && <Loader2 className="w-12 h-12 text-primary animate-spin" />}
            {status === 'success' && <CheckCircle2 className="w-12 h-12 text-emerald-500" />}
            {(status === 'invalid' || status === 'error') && <XCircle className="w-12 h-12 text-destructive" />}
          </div>
          <CardTitle>
            {status === 'verifying' && 'Verifying Invite...'}
            {status === 'valid' && 'You\'re Invited!'}
            {status === 'accepting' && 'Joining Project...'}
            {status === 'success' && 'Welcome Aboard!'}
            {status === 'invalid' && 'Invalid Invite'}
            {status === 'error' && 'Something Went Wrong'}
          </CardTitle>
          <CardDescription>
            {status === 'verifying' && 'Please wait while we verify your invite link...'}
            {status === 'valid' && projectInfo && `You've been invited to collaborate on "${projectInfo.title}"`}
            {status === 'accepting' && 'Adding you to the project...'}
            {status === 'success' && 'Redirecting you to the project...'}
            {status === 'invalid' && error}
            {status === 'error' && error}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'valid' && projectInfo && (
            <>
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Project</p>
                  <p className="font-semibold">{projectInfo.title}</p>
                </div>
                {projectInfo.brief && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">{projectInfo.brief}</p>
                  </div>
                )}
                <div className="flex gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-500 capitalize">
                      {projectInfo.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Joining As</p>
                    <Badge variant="outline" className="capitalize bg-primary/10 text-primary border-primary/20">
                      <Shield className="w-3 h-3 mr-1" />
                      {projectInfo.role === 'team_member' ? 'Team Member' : projectInfo.role}
                    </Badge>
                  </div>
                </div>
              </div>

              <SignedIn>
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Signed in as <span className="font-medium">{user?.primaryEmailAddress?.emailAddress}</span>
                  </p>
                  <Button onClick={handleAccept} className="w-full" size="lg">
                    Accept Invite & Join Project
                  </Button>
                </div>
              </SignedIn>

              <SignedOut>
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sign in or create an account to accept this invite
                  </p>
                  <SignInButton
                    mode="modal"
                    forceRedirectUrl={window.location.href}
                    fallbackRedirectUrl={window.location.href}
                  >
                    <Button className="w-full" size="lg">
                      Sign In to Accept
                    </Button>
                  </SignInButton>
                </div>
              </SignedOut>
            </>
          )}

          {status === 'success' && (
            <div className="text-center space-y-3">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                ✓ Successfully joined the project!
              </p>
              <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}

          {(status === 'invalid' || status === 'error') && (
            <div className="text-center">
              <Button onClick={() => navigate('/')} className="w-full">
                Return to Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
