import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { usePushToken } from '../hooks/usePushToken';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { useThemeColor } from '../components/ThemeColorProvider';
import BillingDetails from '../components/BillingDetails';
import BillingHistory from '../components/BillingHistory';
import SubscriptionAlert from '../components/SubscriptionAlert';
import { useTheme } from 'next-themes';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  CreditCard,
  Loader2,
  Check,
  Mail,
  Calendar,
  Receipt,
  ChevronRight,
  LogOut,
  Smartphone,
  Globe,
  Moon,
  Sun,
  Laptop
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { DashboardSkeleton } from '../components/DashboardSkeleton';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"

export default function Settings() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { themeColor, setThemeColor } = useThemeColor();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [activeSection, setActiveSection] = useState('account');
  const [projects, setProjects] = useState([]);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    digestFrequency: 'daily',
    projectUpdates: true,
    marketingEmails: false,
    mutedProjects: []
  });

  const { permission, requestPermission } = usePushToken();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSubscription(), fetchPreferences(), fetchProjects()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []); // handle paginated response structure if needed
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  const fetchPreferences = async () => {
    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/notifications/preferences`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();

        // Map backend to UI
        const mutedIds = data.projectSettings
          ? data.projectSettings.filter(p => p.muted).map(p => p.projectId)
          : (data.mutedProjects || []);

        setPreferences({
          emailNotifications: data.channels?.email ?? false,
          digestFrequency: data.digest?.emailFrequency || 'realtime',
          projectUpdates: data.triggers?.project_updates ?? true,
          marketingEmails: data.mutes?.marketing === false,
          mutedProjects: mutedIds
        });
      }
    } catch (error) {
      console.error('Failed to fetch prefs', error);
    }
  };

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
    }
  };

  const handleCancelSubscription = () => {
    setShowCancelDialog(true);
  };

  const executeCancellation = async () => {
    setShowCancelDialog(false);
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
        const refundInfo = data.refundInfo || data.refund || {};

        toast.success('Subscription cancelled successfully', {
          description: refundInfo.amount > 0
            ? `A refund of ₹${refundInfo.amount} will be processed. You have been downgraded to the Free plan.`
            : 'You have been downgraded to the Free plan.'
        });

        await fetchSubscription();

        setTimeout(() => {
          window.location.reload();
        }, 2000);
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
      const currentPlan = subscription?.plan?.id || 'pro';

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
        if (data.noImmediateCharge || data.alreadyPaid) {
          const messageDetails = data.alreadyPaid
            ? `You already paid for this period. Access restored until ${new Date(data.subscription.subscriptionEndDate).toLocaleDateString()}`
            : `Auto-renew enabled. Next billing: ${new Date(data.subscription.nextBillingDate).toLocaleDateString()}`;

          toast.success(data.message || 'Subscription reactivated successfully!', {
            description: messageDetails
          });
          await fetchSubscription();
          setIsCancelling(false);
          return;
        }

        if (data.trial) {
          const trialEndDate = new Date(data.subscription.trialEnd).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          toast.success('🎉 7-day free trial activated!', {
            description: `Full access to ${currentPlan.toUpperCase()} features until ${trialEndDate}. No charge until then.`
          });
          await fetchSubscription();
          setIsCancelling(false);
          return;
        }

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
            } finally {
              setIsCancelling(false);
            }
          },
          modal: {
            ondismiss: function () {
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
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const payload = {
        channels: {
          email: preferences.emailNotifications,
          push: true,
          inApp: true
        },
        digest: {
          emailFrequency: preferences.digestFrequency,
          enabled: preferences.emailNotifications
        },
        projectSettings: preferences.mutedProjects.map(pid => ({
          projectId: pid,
          muted: true
        })),
        triggers: {
          project_updates: preferences.projectUpdates,
        },
        mutes: {
          marketing: !preferences.marketingEmails
        }
      };

      const response = await fetch(`${apiUrl}/notifications/preferences`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save');

      toast.success('Preferences saved successfully');
    } catch (error) {
      toast.error('Failed to save preferences');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const navItems = [
    { id: 'account', label: 'Account', icon: User, description: 'Profile & personal details' },
    { id: 'appearance', label: 'Appearance', icon: Globe, description: 'Theme & display settings' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email & push alerts' },
    { id: 'billing', label: 'Billing', icon: CreditCard, description: 'Plan & payment history' },
    { id: 'security', label: 'Security', icon: Shield, description: 'Password & 2FA' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-gradient-to-b from-background to-background/50 border-b border-border/40 pb-6 pt-6 px-4 md:pb-8 md:pt-10 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <SettingsIcon className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
          </div>
          <p className="text-muted-foreground text-base md:text-lg ml-14">
            Manage your account settings, preferences, and subscription
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {subscription && <SubscriptionAlert subscription={subscription.subscription} />}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            {/* Sidebar Navigation */}
            <div className="md:col-span-3 space-y-2">
              <div className="sticky top-6 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${activeSection === item.id
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                      }`}
                  >
                    <item.icon className={`w-5 h-5 ${activeSection === item.id ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'}`} />
                    <div>
                      <div className="font-medium text-sm">{item.label}</div>
                    </div>
                    {activeSection === item.id && (
                      <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="md:col-span-9 space-y-6">
              {/* Account Section */}
              {activeSection === 'account' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>Update your photo and personal details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="flex items-center gap-6">
                        <div className="relative group">
                          <img
                            src={user?.imageUrl || '/default-avatar.png'}
                            alt={user?.fullName || 'User'}
                            className="w-24 h-24 rounded-full border-4 border-background shadow-xl"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <span className="text-xs text-white font-medium">Change</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-semibold">{user?.fullName || 'User'}</h3>
                          <p className="text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
                          <Badge variant="secondary" className="mt-2">
                            Member since {new Date(user?.createdAt).getFullYear()}
                          </Badge>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                          <Input
                            value={user?.fullName || ''}
                            disabled
                            className="bg-muted/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email Address</Label>
                          <div className="flex gap-2">
                            <Input
                              value={user?.primaryEmailAddress?.emailAddress || ''}
                              disabled
                              className="bg-muted/50"
                            />
                            {user?.primaryEmailAddress?.verification?.status === 'verified' && (
                              <div className="flex items-center justify-center w-10 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                <Check className="w-4 h-4 text-emerald-500" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Appearance Section */}
              {activeSection === 'appearance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                      <CardTitle>Appearance</CardTitle>
                      <CardDescription>Customize the look and feel of StudioFlow</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <Label>Theme Mode</Label>
                        <div className="grid grid-cols-3 gap-4">
                          <div
                            className={`
                              cursor-pointer rounded-lg border-2 p-4 hover:bg-accent flex flex-col items-center gap-2
                              ${theme === 'light' ? 'border-primary bg-accent' : 'border-transparent'}
                            `}
                            onClick={() => setTheme('light')}
                          >
                            <Sun className="w-6 h-6" />
                            <span className="text-sm font-medium">Light</span>
                          </div>
                          <div
                            className={`
                              cursor-pointer rounded-lg border-2 p-4 hover:bg-accent flex flex-col items-center gap-2
                              ${theme === 'dark' ? 'border-primary bg-accent' : 'border-transparent'}
                            `}
                            onClick={() => setTheme('dark')}
                          >
                            <Moon className="w-6 h-6" />
                            <span className="text-sm font-medium">Dark</span>
                          </div>
                          <div
                            className={`
                              cursor-pointer rounded-lg border-2 p-4 hover:bg-accent flex flex-col items-center gap-2
                              ${theme === 'system' ? 'border-primary bg-accent' : 'border-transparent'}
                            `}
                            onClick={() => setTheme('system')}
                          >
                            <Laptop className="w-6 h-6" />
                            <span className="text-sm font-medium">System</span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <Label>Theme Color</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { name: 'green', label: 'Emerald', color: 'bg-emerald-500' },
                            { name: 'blue', label: 'Blue', color: 'bg-blue-500' },
                            { name: 'violet', label: 'Violet', color: 'bg-violet-500' },
                            { name: 'orange', label: 'Orange', color: 'bg-orange-500' },
                          ].map((theme) => (
                            <div
                              key={theme.name}
                              className={`
                                cursor-pointer rounded-lg border-2 p-1 hover:bg-accent
                                ${themeColor === theme.name ? 'border-primary' : 'border-transparent'}
                              `}
                              onClick={() => setThemeColor(theme.name)}
                            >
                              <div className="space-y-2 rounded-md bg-popover p-2">
                                <div className={`h-2 w-full rounded-lg ${theme.color}`} />
                                <div className="space-y-1">
                                  <div className={`h-2 w-[80%] rounded-lg ${theme.color}/50`} />
                                  <div className={`h-2 w-[60%] rounded-lg ${theme.color}/20`} />
                                </div>
                              </div>
                              <div className="mt-2 text-center text-sm font-medium">
                                {theme.label}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                      <CardTitle>Notification Preferences</CardTitle>
                      <CardDescription>Choose how you want to be notified</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-primary" />
                            <Label className="text-base">Email Notifications</Label>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">Receive email updates about your projects</p>
                        </div>
                        <Switch
                          checked={preferences.emailNotifications}
                          onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                        />
                      </div>

                      {/* Digest Frequency - Only show if Email is enabled */}
                      {preferences.emailNotifications && (
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50 ml-6 border-l-2 border-l-primary/20">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-primary" />
                              <Label className="text-base">Email Frequency</Label>
                            </div>
                            <p className="text-sm text-muted-foreground pl-6">How often would you like to receive emails?</p>
                          </div>
                          <Select
                            value={preferences.digestFrequency}
                            onValueChange={(value) => handlePreferenceChange('digestFrequency', value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="realtime">Real-time (Immediate)</SelectItem>
                              <SelectItem value="daily">Daily Digest</SelectItem>
                              <SelectItem value="weekly">Weekly Digest</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-primary" />
                            <Label className="text-base">Push Notifications</Label>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">Receive notifications on this device</p>
                        </div>
                        <Switch
                          checked={permission === 'granted'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              requestPermission();
                            } else {
                              toast.info('To disable notifications, please change your browser settings.');
                            }
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-primary" />
                            <Label className="text-base">Project Updates</Label>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">Get notified when projects are updated</p>
                        </div>
                        <Switch
                          checked={preferences.projectUpdates}
                          onCheckedChange={(checked) => handlePreferenceChange('projectUpdates', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" />
                            <Label className="text-base">Marketing Emails</Label>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">Receive updates about new features</p>
                        </div>
                        <Switch
                          checked={preferences.marketingEmails}
                          onCheckedChange={(checked) => handlePreferenceChange('marketingEmails', checked)}
                        />
                      </div>

                      {/* Project Specific Mutes */}
                      {projects.length > 0 && (
                        <div className="space-y-4 pt-4">
                          <Label className="text-lg font-semibold">Project Notifications</Label>
                          <p className="text-sm text-muted-foreground">Mute notifications for specific projects.</p>
                          <div className="grid gap-4 md:grid-cols-2">
                            {projects.map(project => {
                              const isMuted = preferences.mutedProjects.includes(project._id);
                              return (
                                <div key={project._id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/30">
                                  <span className="font-medium truncate max-w-[200px]" title={project.title}>{project.title}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{isMuted ? 'Muted' : 'Active'}</span>
                                    <Switch
                                      checked={!isMuted} // Switch ON means Notifications Active (Not Muted)
                                      onCheckedChange={(checked) => {
                                        // If Check=TRUE -> Active -> Remove from Muted
                                        // If Check=FALSE -> Muted -> Add to Muted
                                        const newMuted = checked
                                          ? preferences.mutedProjects.filter(id => id !== project._id)
                                          : [...preferences.mutedProjects, project._id];
                                        handlePreferenceChange('mutedProjects', newMuted);
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 flex justify-end">
                        <Button
                          onClick={savePreferences}
                          disabled={saving}
                          className="min-w-[120px]"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Billing Section */}
              {activeSection === 'billing' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="history">Payment History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                      <BillingDetails
                        subscription={subscription}
                        onCancel={handleCancelSubscription}
                        onReactivate={handleReactivateSubscription}
                        loading={isCancelling}
                      />
                    </TabsContent>

                    <TabsContent value="history">
                      <BillingHistory />
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Security Section */}
              {activeSection === 'security' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                      <CardTitle>Security Settings</CardTitle>
                      <CardDescription>Manage your account security and sessions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4">
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-full">
                              <Shield className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">Password</p>
                              <p className="text-sm text-muted-foreground">Last changed via Clerk</p>
                            </div>
                          </div>
                          <Button variant="outline" onClick={() => user?.openManageAccount()}>
                            Change
                          </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-full">
                              <Smartphone className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">Two-Factor Authentication</p>
                              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                            </div>
                          </div>
                          <Button variant="outline" onClick={() => user?.openManageAccount({ section: 'mfa' })}>
                            Manage
                          </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-full">
                              <LogOut className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">Active Sessions</p>
                              <p className="text-sm text-muted-foreground">Manage logged-in devices</p>
                            </div>
                          </div>
                          <Button variant="outline" onClick={() => user?.openManageAccount({ section: 'sessions' })}>
                            View All
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? A prorated refund will be issued, and Pro features will be revoked immediately. You will be downgraded to the Free plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction onClick={executeCancellation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
