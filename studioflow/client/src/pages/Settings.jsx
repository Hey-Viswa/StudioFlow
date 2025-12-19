import { useState, useEffect } from "react";
import { useSearchParams } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useTheme } from "next-themes";
import { useThemeColor } from "../components/ThemeColorProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import api from "@/lib/api"; 

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

import { User, Globe, Bell, CreditCard, Shield, Settings as SettingsIcon, Check, Sun, Moon, Laptop, Mail, Calendar, Smartphone, LogOut, Loader2, ChevronRight, Beaker, Layout, Palette } from "lucide-react";

import { usePushToken } from "../hooks/usePushToken";
import { useReviewFeatureFlag } from "../context/FeatureFlagContext";
import BillingDetails from "../components/BillingDetails";
import BillingHistory from "../components/BillingHistory";
import SubscriptionAlert from "../components/SubscriptionAlert";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import PublicProfileSettings from "../components/marketing/PublicProfileSettings";

export default function Settings() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { themeColor, setThemeColor } = useThemeColor();
  const { theme, setTheme } = useTheme();
  const { features, toggleFeature } = useReviewFeatureFlag();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = searchParams.get('tab') || 'account';
  const [activeSection, setActiveSectionState] = useState(initialSection);

  const setActiveSection = (value) => {
    setActiveSectionState(value);
    setSearchParams(prev => {
        prev.set('tab', value);
        return prev;
    }, { replace: true });
  }

  // Sync with URL if it changes (e.g. back button)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeSection) {
      setActiveSectionState(tabFromUrl);
    }
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rzpLoading, setRzpLoading] = useState(true);
  const [rzpSaving, setRzpSaving] = useState(false);
  const [rzpLinkedAccountId, setRzpLinkedAccountId] = useState('');
  const [rzpKeyId, setRzpKeyId] = useState('');
  const [rzpKeySecret, setRzpKeySecret] = useState('');
  const [rzpMeta, setRzpMeta] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [subscription, setSubscription] = useState(null);

  // const [activeSection, setActiveSection] = useState('account'); // Replaced
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
      await Promise.all([fetchSubscription(), fetchPreferences(), fetchProjects(), fetchRazorpayMeta()]);
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

  const fetchRazorpayMeta = async () => {
    try {
      const data = await api.get('payments/v2/owner/credentials', { getToken });
      setRzpMeta(data || null);
      if (data?.linkedAccountId) setRzpLinkedAccountId(data.linkedAccountId);
      if (data?.keyIdMasked) setRzpKeyId('');
    } catch (error) {
      console.error('Failed to load Razorpay credentials meta', error);
    } finally {
      setRzpLoading(false);
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

  const saveRazorpaySettings = async () => {
    if (!rzpLinkedAccountId) {
      toast.error('Linked Account ID is required');
      return;
    }
    if ((rzpKeyId && !rzpKeySecret) || (!rzpKeyId && rzpKeySecret)) {
      toast.error('Provide both Key ID and Key Secret, or leave both empty');
      return;
    }

    setRzpSaving(true);
    try {
      const payload = { linkedAccountId: rzpLinkedAccountId.trim() };
      if (rzpKeyId && rzpKeySecret) {
        payload.keyId = rzpKeyId.trim();
        payload.keySecret = rzpKeySecret.trim();
      }

      const result = await api.post('payments/v2/owner/credentials', payload, { getToken });
      setRzpMeta(result || null);
      setRzpLinkedAccountId(result?.linkedAccountId || rzpLinkedAccountId);
      setRzpKeyId('');
      // Never keep secrets in memory after submit
      setRzpKeySecret('');
      toast.success('Razorpay settings saved securely');
    } catch (error) {
      console.error('Failed to save Razorpay settings', error);
      toast.error('Failed to save Razorpay settings', { description: error.message });
    } finally {
      setRzpSaving(false);
    }
  };

  const navItems = [
    { id: 'account', label: 'Account', icon: User, description: 'Profile & personal details' },
    { id: 'public-profile', label: 'Public Profile', icon: Globe, description: 'Portfolio & showcase' },
    { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme & display settings' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email & push alerts' },
    { id: 'billing', label: 'Billing', icon: CreditCard, description: 'Plan & payment history' },
    { id: 'security', label: 'Security', icon: Shield, description: 'Password & 2FA' },
    { id: 'experiments', label: 'Experiments', icon: Beaker, description: 'Try new features' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-gradient-to-b from-muted/30 to-background border-b border-border/40 pb-8 pt-8 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-primary/10 rounded-xl border border-primary/10 ring-1 ring-inset ring-primary/5">
              <SettingsIcon className="w-6 h-6 text-primary shadow-sm" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Settings</h1>
              <p className="text-muted-foreground text-sm md:text-base mt-1">
                Manage your account settings, preferences, and subscription
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {subscription && <SubscriptionAlert subscription={subscription.subscription} />}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            {/* Sidebar Navigation */}
            <div className="md:col-span-3">
              <div className="sticky top-24 space-y-1">
                <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group text-left border relative overflow-hidden",
                      activeSection === item.id
                        ? "bg-primary/10 text-primary border-primary/20 shadow-sm font-medium"
                        : "hover:bg-accent/50 text-muted-foreground border-transparent hover:text-foreground"
                    )}
                  >
                    {activeSection === item.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-lg" />
                    )}
                    <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", 
                      activeSection === item.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    <div className="flex-1">
                      <div className="font-medium text-sm leading-none mb-1">{item.label}</div>
                      <div className="text-[10px] opacity-70 leading-none">{item.description}</div>
                    </div>
                    {activeSection === item.id && (
                      <ChevronRight className="w-4 h-4 ml-auto text-primary/50" />
                    )}
                  </button>
                ))}
                </nav>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="md:col-span-9 space-y-6">
              {/* Account Section */}
              {activeSection === 'account' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Card className="border-border/50 shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
                      <CardTitle className="text-xl">Profile Information</CardTitle>
                      <CardDescription>Update your photo and personal details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="relative group shrink-0">
                          <div className="w-24 h-24 rounded-full border-4 border-background shadow-md overflow-hidden ring-1 ring-border">
                            <img
                              src={user?.imageUrl || '/default-avatar.png'}
                              alt={user?.fullName || 'User'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <span className="text-xs text-white font-medium">Change</span>
                          </div>
                        </div>
                        <div className="space-y-1 text-center sm:text-left pt-2">
                          <h3 className="text-xl font-semibold">{user?.fullName || 'User'}</h3>
                          <p className="text-muted-foreground break-all">{user?.primaryEmailAddress?.emailAddress}</p>
                          <div className="pt-2 flex justify-center sm:justify-start">
                            <Badge variant="secondary" className="gap-1">
                              <Calendar className="w-3 h-3" />
                              Member since {new Date(user?.createdAt).getFullYear()}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input
                              value={user?.fullName || ''}
                              disabled
                              className="bg-muted/50 pl-9"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Email Address</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                              <Input
                                value={user?.primaryEmailAddress?.emailAddress || ''}
                                disabled
                                className="bg-muted/50 pl-9"
                              />
                            </div>
                            {user?.primaryEmailAddress?.verification?.status === 'verified' && (
                              <div className="flex items-center justify-center w-10 bg-emerald-500/10 rounded-md border border-emerald-500/20 shrink-0" title="Verified">
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

              {/* Public Profile Section */}
              {activeSection === 'public-profile' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <PublicProfileSettings />
                </div>
              )}

              {/* Appearance Section */}
              {activeSection === 'appearance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Card className="border-border/50 shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
                      <CardTitle className="text-xl">Appearance</CardTitle>
                      <CardDescription>Customize the look and feel of StudioFlow</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6">
                      <div className="space-y-4">
                        <Label className="text-base">Theme Mode</Label>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { id: 'light', label: 'Light', icon: Sun },
                            { id: 'dark', label: 'Dark', icon: Moon },
                            { id: 'system', label: 'System', icon: Laptop },
                          ].map(({ id, label, icon: Icon }) => (
                            <button
                              key={id}
                              onClick={() => setTheme(id)}
                              className={cn(
                                "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:bg-accent hover:text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                theme === id
                                  ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                                  : "border-border/40 text-muted-foreground hover:border-border"
                              )}
                            >
                              <div className={cn(
                                "p-3 rounded-full transition-colors",
                                theme === id ? "bg-primary text-primary-foreground" : "bg-muted"
                              )}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <span className="font-medium text-sm">{label}</span>
                              {theme === id && (
                                <div className="absolute top-3 right-3 text-primary">
                                  <Check className="w-4 h-4" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <Label className="text-base">Theme Color</Label>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select a primary color for buttons, links, and active elements.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { name: 'green', label: 'Emerald', color: 'bg-emerald-500' },
                            { name: 'blue', label: 'Blue', color: 'bg-blue-500' },
                            { name: 'violet', label: 'Violet', color: 'bg-violet-500' },
                            { name: 'orange', label: 'Orange', color: 'bg-orange-500' },
                            { name: 'rose', label: 'Rose', color: 'bg-rose-500' },
                            { name: 'yellow', label: 'Yellow', color: 'bg-yellow-500' },
                            { name: 'red', label: 'Red', color: 'bg-red-500' },
                            { name: 'zinc', label: 'Zinc', color: 'bg-zinc-500' },
                          ].map((item) => {
                            const isActive = themeColor === item.name;
                            return (
                              <button
                                key={item.name}
                                onClick={() => setThemeColor(item.name)}
                                className={cn(
                                  "group relative flex flex-col items-start gap-2 p-3 rounded-xl border-2 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                  isActive
                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                    : "border-border/40 hover:border-border hover:bg-accent/50"
                                )}
                              >
                                <div className="w-full h-12 rounded-lg bg-background border border-border/50 shadow-sm p-2 flex flex-col gap-1.5 overflow-hidden relative">
                                  <div className={cn("h-full w-full rounded md:rounded-md transition-all", item.color)} />
                                  <div className="flex gap-1 opacity-50">
                                     <div className={cn("h-1.5 w-full rounded-full", item.color)} />
                                     <div className={cn("h-1.5 w-2/3 rounded-full", item.color)} />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between w-full">
                                  <span className={cn("text-xs font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                                    {item.label}
                                  </span>
                                  {isActive && <Check className="w-3 h-3 text-primary" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Card className="border-border/50 shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
                      <CardTitle className="text-xl">Notification Preferences</CardTitle>
                      <CardDescription>Choose how you want to be notified</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
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
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="history">Payment History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                      <Card className="border-border/50 shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
                          <CardTitle className="text-xl">Razorpay Route (Owner Payouts)</CardTitle>
                          <CardDescription>
                            Store your linked account ID (required). Key ID/Secret are optional and stored encrypted; the secret is never shown again.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="rzp-linked">Linked Account ID *</Label>
                              <Input
                                id="rzp-linked"
                                placeholder="rzp_acc_..."
                                value={rzpLinkedAccountId}
                                onChange={(e) => setRzpLinkedAccountId(e.target.value)}
                                disabled={rzpSaving || rzpLoading}
                              />
                              <p className="text-xs text-muted-foreground">Required for Route; must be active in Razorpay Dashboard.</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="rzp-keyid">Key ID (optional)</Label>
                              <Input
                                id="rzp-keyid"
                                placeholder="rzp_test_xxx"
                                value={rzpKeyId}
                                onChange={(e) => setRzpKeyId(e.target.value)}
                                disabled={rzpSaving || rzpLoading}
                              />
                              <p className="text-xs text-muted-foreground">Only needed if you require owner-specific API auth; otherwise leave blank.</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="rzp-secret">Key Secret (optional)</Label>
                            <Input
                              id="rzp-secret"
                              type="password"
                              placeholder="Enter once; not stored in UI"
                              value={rzpKeySecret}
                              onChange={(e) => setRzpKeySecret(e.target.value)}
                              disabled={rzpSaving || rzpLoading}
                            />
                            <p className="text-xs text-muted-foreground">Never displayed after save. Do not share or reuse secrets.</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium text-foreground">Stored:</span>{' '}
                              {rzpMeta?.linkedAccountId ? rzpMeta.linkedAccountId : 'None'}
                            </div>
                            <div className="h-4 w-px bg-border" />
                            <div>
                              <span className="font-medium text-foreground">Key:</span>{' '}
                              {rzpMeta?.keyIdMasked || 'Not provided'}
                            </div>
                            <div className="h-4 w-px bg-border" />
                            <div>
                              <span className="font-medium text-foreground">Fingerprint:</span>{' '}
                              {rzpMeta?.fingerprint || '—'}
                            </div>
                            <div className="h-4 w-px bg-border" />
                            <div>
                              <span className="font-medium text-foreground">Rotated:</span>{' '}
                              {rzpMeta?.rotatedAt ? new Date(rzpMeta.rotatedAt).toLocaleString() : '—'}
                            </div>
                          </div>

                          <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground">Secure Preview</span>
                              <Badge variant="outline">Masked</Badge>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                              <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-wide">Linked Account</span>
                                <span className="font-medium text-foreground break-all">{rzpMeta?.linkedAccountId || '—'}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-wide">Key (masked)</span>
                                <span className="font-medium text-foreground">{rzpMeta?.keyIdMasked || '—'}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-wide">Fingerprint</span>
                                <span className="font-medium text-foreground">{rzpMeta?.fingerprint || '—'}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-wide">Last Rotation</span>
                                <span className="font-medium text-foreground">{rzpMeta?.rotatedAt ? new Date(rzpMeta.rotatedAt).toLocaleString() : '—'}</span>
                              </div>
                            </div>
                            <p className="text-xs">Secrets are encrypted at rest and never shown after save. Use a new secret to rotate.</p>
                          </div>

                          <div className="pt-2 flex justify-end">
                            <Button onClick={saveRazorpaySettings} disabled={rzpSaving || rzpLoading} className="min-w-[160px]">
                              {rzpSaving ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Saving securely...
                                </>
                              ) : (
                                'Save Razorpay Settings'
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

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
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Card className="border-border/50 shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
                      <CardTitle className="text-xl">Security Settings</CardTitle>
                      <CardDescription>Manage your account security and sessions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
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

              {/* Experiments Section */}
              {activeSection === 'experiments' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Card className="border-border/50 shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
                      <CardTitle className="text-xl">Experimental Features</CardTitle>
                      <CardDescription>Try out new features before they are released</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Beaker className="w-4 h-4 text-primary" />
                            <Label className="text-base">Enable Storyboard</Label>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">
                            Visualize your project flow with the experimental storyboard view.
                          </p>
                        </div>
                        <Switch
                          checked={features.storyboard}
                          onCheckedChange={() => {
                            toggleFeature('storyboard');
                            toast.success(`Storyboard ${!features.storyboard ? 'enabled' : 'disabled'} successfully`);
                          }}
                        />
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
