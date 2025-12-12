import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { ArrowLeft, Loader2, Rocket, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export default function CreateProject() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limitExceeded, setLimitExceeded] = useState(false);
  const [planInfo, setPlanInfo] = useState(null);
  const [usage, setUsage] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    brief: '',
    dueDate: ''
  });

  // Fetch current usage on mount
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/projects/usage`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Transform the response to match our UI needs
          setUsage({
            current: data.currentProjects,
            limit: data.unlimited ? Infinity : data.limit,
            plan: data.plan
          });
        } else {
          console.error('Failed to fetch usage:', response.status);
        }
      } catch (err) {
        console.error('Failed to fetch usage:', err);
      }
    };

    fetchUsage();
  }, [getToken]);

  const validateDate = (dateString) => {
    if (!dateString) return { valid: true }; // Date is optional

    // Date format validation: YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return { valid: false, message: 'Invalid date format. Use YYYY-MM-DD' };
    }

    // Parse and validate actual date
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return { valid: false, message: 'Invalid date' };
    }

    // Check if date is in the past
    if (date < today) {
      return { valid: false, message: 'Due date cannot be in the past' };
    }

    return { valid: true };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validate character limits
    if (name === 'title' && value.length > 50) {
      toast.error('Title must be 50 characters or less');
      return;
    }
    if (name === 'brief' && value.length > 100) {
      toast.error('Brief must be 100 characters or less');
      return;
    }

    // Validate date
    if (name === 'dueDate' && value) {
      const validation = validateDate(value);
      if (!validation.valid) {
        toast.error(validation.message);
        return;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLimitExceeded(false);
    setPlanInfo(null);

    try {
      // Get the session token from Clerk - this returns a JWT
      const token = await getToken();
      if (!token) {
        throw new Error('Not authenticated - please sign in again');
      }

      // console.log('Token obtained, length:', token.length);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create project' }));

        // Check if it's a limit exceeded error
        if (response.status === 403 && errorData.limit) {
          setLimitExceeded(true);
          // Transform the error data to match our UI needs
          setPlanInfo({
            limit: errorData.limit,
            current: errorData.currentCount || errorData.current,
            currentPlan: 'free' // The backend only limits free plan
          });
          throw new Error(errorData.message || errorData.error || 'Project limit reached');
        }

        throw new Error(errorData.error || 'Failed to create project');
      }

      const data = await response.json();

      // Navigate to the new project's detail page
      navigate(`/dashboard/projects/${data.project._id}`);
    } catch (err) {
      console.error('Create project error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Create New Project</CardTitle>
                <CardDescription>
                  Start a new video editing project and invite clients to collaborate
                </CardDescription>
              </div>
              {usage && (
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">Project Usage</p>
                  <p className={cn(
                    "text-lg font-bold",
                    usage.current >= usage.limit ? "text-destructive" : "text-primary"
                  )}>
                    {usage.current} / {usage.limit === Infinity ? '∞' : usage.limit}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{usage.plan} Plan</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Product Promo Video"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brief">Project Brief</Label>
                <Textarea
                  id="brief"
                  name="brief"
                  placeholder="Describe the project scope, deliverables, and client requirements..."
                  value={formData.brief}
                  onChange={handleChange}
                  maxLength={100}
                  disabled={loading}
                  className="resize-none min-h-[80px] max-h-[200px]"
                />
                <p className="text-sm text-muted-foreground">
                  {formData.brief.length}/100 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <div className="relative">
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    disabled={loading}
                    className="w-full pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0"
                  />
                  <CalendarIcon
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white cursor-pointer z-10"
                    onClick={() => document.getElementById('dueDate').showPicker()}
                  />
                </div>
              </div>

              {limitExceeded && planInfo && (
                <Alert variant="warning" className="border-2">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle className="text-lg font-semibold">Project Limit Reached</AlertTitle>
                  <AlertDescription className="mt-2 space-y-3">
                    <p>
                      You've reached the limit of <strong>{planInfo.limit} projects</strong> on the <strong className="capitalize">{planInfo.currentPlan}</strong> plan.
                    </p>
                    <p>
                      Current usage: <strong>{planInfo.current} / {planInfo.limit} projects</strong>
                    </p>
                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={() => navigate('/dashboard/subscription')}
                        className="bg-primary hover:bg-primary/90"
                      >
                        Upgrade Your Plan
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/dashboard/projects')}
                      >
                        Manage Projects
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {error && !limitExceeded && (
                <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive/90 mt-1">{error}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !formData.title}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      Create Project
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
