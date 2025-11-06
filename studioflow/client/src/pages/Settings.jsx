import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import BillingDetails from '../components/BillingDetails';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield,
  CreditCard,
  Loader2,
  Check,
  Crown,
  Mail,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    projectUpdates: true,
    marketingEmails: false
  });

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/subscriptions/current`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? You will retain access to premium features until the end of your billing period, after which your account will be downgraded to the free plan.'
    );

    if (!confirmed) return;

    setIsCancelling(true);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${apiUrl}/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Subscription cancelled successfully', {
          description: data.message || 'Your subscription has been cancelled.'
        });
        // Refresh subscription data
        await fetchSubscription();
      } else {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast.error('Failed to cancel subscription', {
        description: error.message
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setIsCancelling(true);
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Load Razorpay script first
      const loadScript = () => {
        return new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const scriptLoaded = await loadScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }
      
      // Get current plan to reactivate
      const currentPlan = subscription?.plan?.id || 'pro';
      
      console.log('Reactivating subscription for plan:', currentPlan);
      
      const response = await fetch(`${apiUrl}/subscriptions/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: currentPlan })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Subscription created:', data.subscriptionId);
        
        // Initialize Razorpay for payment
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        
        if (!razorpayKey) {
          throw new Error('Payment gateway not configured');
        }
        
        const options = {
          key: razorpayKey,
          subscription_id: data.subscriptionId,
          name: 'StudioFlow',
          description: `Reactivate ${currentPlan.toUpperCase()} Plan`,
          handler: async function (response) {
            try {
              console.log('Payment successful, verifying...');
              // Verify payment
              const verifyResponse = await fetch(`${apiUrl}/subscriptions/verify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_subscription_id: response.razorpay_subscription_id,
                  razorpay_signature: response.razorpay_signature
                })
              });

              if (verifyResponse.ok) {
                toast.success('Subscription reactivated successfully!');
                await fetchSubscription();
              } else {
                const errorData = await verifyResponse.json();
                throw new Error(errorData.error || 'Verification failed');
              }
            } catch (verifyError) {
              console.error('Verification error:', verifyError);
              toast.error('Payment verification failed');
            }
          },
          modal: {
            ondismiss: function() {
              console.log('Payment modal closed');
              setIsCancelling(false);
            }
          },
          theme: {
            color: '#6366f1'
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      toast.error('Failed to reactivate subscription', {
        description: error.message
      });
      setIsCancelling(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      // Simulate API call - implement actual endpoint later
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Preferences saved successfully');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const getPlanBadge = (plan) => {
    const badges = {
      free: { color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', label: 'Free' },
      pro: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Pro' },
      studio: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Studio' }
    };
    return badges[plan] || badges.free;
  };

  const currentPlan = subscription?.subscription?.plan || 'free';
  const planBadge = getPlanBadge(currentPlan);

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
        <p className="text-muted-foreground text-slate-400">
          Manage your account settings and preferences
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Sidebar Navigation */}
          <div className="md:col-span-1">
            <Card className="bg-card border-slate-800 sticky top-6">
              <CardContent className="p-4">
                <nav className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary">
                    <User className="w-4 h-4" />
                    <span className="font-medium">Account</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                    <Bell className="w-4 h-4" />
                    <span className="font-medium">Notifications</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                    <CreditCard className="w-4 h-4" />
                    <span className="font-medium">Billing</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">Security</span>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Account Information */}
            <Card className="bg-card border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Account Information</CardTitle>
                <CardDescription>Your personal account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <img 
                    src={user?.imageUrl || '/default-avatar.png'} 
                    alt={user?.fullName || 'User'} 
                    className="w-16 h-16 rounded-full border-2 border-slate-700"
                  />
                  <div>
                    <p className="font-semibold text-white">{user?.fullName || 'User'}</p>
                    <p className="text-sm text-slate-400">{user?.primaryEmailAddress?.emailAddress}</p>
                  </div>
                </div>

                <Separator className="bg-slate-800" />

                <div className="grid gap-4">
                  <div>
                    <Label className="text-slate-300">Full Name</Label>
                    <Input 
                      value={user?.fullName || ''} 
                      disabled
                      className="mt-1.5 bg-slate-900 border-slate-700 text-slate-400"
                    />
                    <p className="text-xs text-slate-500 mt-1">Managed by Clerk authentication</p>
                  </div>

                  <div>
                    <Label className="text-slate-300">Email Address</Label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Input 
                        value={user?.primaryEmailAddress?.emailAddress || ''} 
                        disabled
                        className="bg-slate-900 border-slate-700 text-slate-400"
                      />
                      {user?.primaryEmailAddress?.verification?.status === 'verified' && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <Check className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300">Member Since</Label>
                    <div className="mt-1.5 flex items-center gap-2 text-slate-400">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(user?.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing & Subscription */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Billing & Subscription
              </h2>
              <BillingDetails 
                subscription={subscription}
                onCancel={handleCancelSubscription}
                onReactivate={handleReactivateSubscription}
                loading={isCancelling}
              />
            </div>

            {/* Notification Preferences */}
            <Card className="bg-card border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
                <CardDescription>Manage your notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Email Notifications</Label>
                      <p className="text-sm text-slate-400">Receive email updates about your projects</p>
                    </div>
                    <button
                      onClick={() => handlePreferenceChange('emailNotifications', !preferences.emailNotifications)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.emailNotifications ? 'bg-primary' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Project Updates</Label>
                      <p className="text-sm text-slate-400">Get notified when projects are updated</p>
                    </div>
                    <button
                      onClick={() => handlePreferenceChange('projectUpdates', !preferences.projectUpdates)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.projectUpdates ? 'bg-primary' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.projectUpdates ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <Separator className="bg-slate-800" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">Marketing Emails</Label>
                      <p className="text-sm text-slate-400">Receive updates about new features</p>
                    </div>
                    <button
                      onClick={() => handlePreferenceChange('marketingEmails', !preferences.marketingEmails)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.marketingEmails ? 'bg-primary' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.marketingEmails ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={savePreferences}
                    disabled={saving}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Preferences'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card className="bg-card border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security
                </CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-400">
                  Your account is secured with Clerk authentication. To manage your password, 
                  two-factor authentication, or other security settings, please visit your 
                  account settings.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={() => window.open('https://accounts.clerk.dev', '_blank')}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Manage Security Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
