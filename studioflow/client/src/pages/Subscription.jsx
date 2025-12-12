import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Check,
  Crown,
  Zap,
  Users,
  FileText,
  Loader2,
  CreditCard,
  AlertCircle,
  Sparkles,
  Shield,
  Rocket,
  Download
} from 'lucide-react';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

const STATUS_META = {
  trial: {
    label: 'Free Trial Active',
    description: 'No charges until your trial ends. Enjoy full access.',
    tone: 'amber',
    dateLabel: 'Trial ends on'
  },
  active: {
    label: 'Active',
    description: 'Auto-renew is on. You will be billed on the renewal date.',
    tone: 'green',
    dateLabel: 'Renews on'
  },
  scheduled_downgrade: {
    label: 'Downgrade Scheduled',
    description: 'You keep current features until the scheduled downgrade date.',
    tone: 'yellow',
    dateLabel: 'Downgrades on'
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Auto-renew is off. Reactivate before access expires.',
    tone: 'red',
    dateLabel: 'Access ends on'
  },
  expired: {
    label: 'Expired',
    description: 'Plan access has ended. Choose a plan to continue.',
    tone: 'red',
    dateLabel: 'Expired on'
  },
  created: {
    label: 'Checkout Pending',
    description: 'Complete the Razorpay checkout to activate your plan.',
    tone: 'blue',
    dateLabel: 'Checkout created'
  },
  pending: {
    label: 'Payment Pending',
    description: 'Waiting for Razorpay confirmation. You keep access meanwhile.',
    tone: 'blue',
    dateLabel: 'Pending since'
  },
  default: {
    label: 'Inactive',
    description: 'Choose a plan to unlock Pro features.',
    tone: 'slate',
    dateLabel: 'Status updated'
  }
};

const TONE_CLASSES = {
  green: 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-200 border border-amber-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-200 border border-yellow-500/30',
  red: 'bg-rose-500/15 text-rose-200 border border-rose-500/30',
  blue: 'bg-sky-500/15 text-sky-200 border border-sky-500/30',
  slate: 'bg-slate-700/40 text-slate-200 border border-slate-600/50'
};

import BillingHistory from '../components/BillingHistory';

export default function Subscription() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const getButtonStyles = (planId) => {
    switch (planId) {
      case 'pro':
        return 'bg-gradient-to-r from-emerald-400 to-lime-400 text-slate-900 shadow-lg shadow-emerald-500/25 hover:brightness-95';
      case 'studio':
        return 'bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white shadow-lg shadow-fuchsia-500/30 hover:brightness-110';
      case 'free':
        return 'bg-slate-800 text-white border border-slate-700 hover:border-white/60 hover:bg-slate-700';
      default:
        return 'bg-secondary hover:bg-secondary/80';
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Starter',
      subtitle: 'Perfect for getting started',
      price: 0,
      currency: '₹',
      period: '/month',
      features: [
        '5 projects included',
        '1 team member per project',
        'Basic invoicing',
        'Email support (48h response)'
      ],
      color: 'slate',
      popular: false,
      icon: Rocket
    },
    {
      id: 'pro',
      name: 'Pro',
      subtitle: 'For individual professionals',
      price: 1,
      currency: '₹',
      period: '/mo',
      features: [
        '50 projects included',
        '5 team members per project',
        'Real-time updates',
        'Branded invoices + Razorpay',
        'Priority support (24h response)',
        'Advanced analytics'
      ],
      color: 'primary',
      popular: true,
      icon: Zap
    },
    {
      id: 'studio',
      name: 'Studio',
      subtitle: 'For agencies & teams',
      price: 2,
      currency: '₹',
      period: '/mo',
      features: [
        '100 projects included',
        'Unlimited team members',
        'All Pro features',
        'Advanced analytics',
        'Custom workflows',
        'Dedicated support (12h response)'
      ],
      color: 'purple',
      popular: false,
      icon: Crown
    }
  ];

  useEffect(() => {
    fetchCurrentSubscription();
  }, []);

  const fetchCurrentSubscription = async () => {
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
        setCurrentSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (planId) => {
    if (planId === 'free') {
      toast.error('You are already on the free plan');
      return;
    }

    setProcessingPlan(planId);

    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // console.log(`🔄 Creating ${planId} subscription...`);
      const response = await fetch(`${apiUrl}/subscriptions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });

      const data = await response.json();
      // console.log('📥 Create subscription response:', data);

      if (!response.ok) {
        console.error('❌ Subscription creation failed:', data);
        throw new Error(data.error || 'Failed to create subscription');
      }

      const { subscriptionId, amount, currency } = data;

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        throw new Error('Payment gateway not configured');
      }

      const options = {
        key: razorpayKey,
        subscription_id: subscriptionId,
        name: 'StudioFlow',
        description: `${planId.toUpperCase()} Plan Subscription`,
        currency: currency,
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
              toast.success('Subscription activated successfully!');
              fetchCurrentSubscription();
            } else {
              const errorData = await verifyResponse.json();
              throw new Error(errorData.error || 'Verification failed');
            }
          } catch (error) {
            toast.error(error.message);
          } finally {
            setProcessingPlan(null);
          }
        },
        theme: {
          color: '#6366f1'
        },
        modal: {
          ondismiss: function () {
            setProcessingPlan(null);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error(error.message);
      setProcessingPlan(null);
    }
  };

  const handleChangePlan = async (planId) => {
    const currentPlanPrice = plans.find(p => p.id === currentPlan)?.price || 0;
    const targetPlanPrice = plans.find(p => p.id === planId)?.price || 0;
    const isDowngrade = targetPlanPrice < currentPlanPrice;

    if (isDowngrade) {
      setSelectedPlan(planId);
      setShowDowngradeDialog(true);
      return;
    }

    executePlanChange(planId);
  };

  const executePlanChange = async (planId) => {
    const currentPlanPrice = plans.find(p => p.id === currentPlan)?.price || 0;
    const targetPlanPrice = plans.find(p => p.id === planId)?.price || 0;
    const isDowngrade = targetPlanPrice < currentPlanPrice;

    setProcessingPlan(planId);

    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // console.log(`🔄 Changing plan from ${currentPlan} to ${planId}...`);
      const response = await fetch(`${apiUrl}/subscriptions/change-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPlan: planId })
      });

      const data = await response.json();
      // console.log('📥 Change plan response:', data);

      if (!response.ok) {
        console.error('❌ Plan change failed:', data);
        throw new Error(data.error || 'Failed to change plan');
      }

      if (isDowngrade) {
        toast.success('Downgrade scheduled successfully');
        fetchCurrentSubscription();
        setProcessingPlan(null);
        return;
      }

      if (data.requiresPayment) {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) throw new Error('Failed to load payment gateway');

        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        const options = {
          key: razorpayKey,
          amount: Math.round(data.amount * 100),
          currency: data.currency || 'INR',
          name: 'StudioFlow',
          description: data.description,
          order_id: data.orderId,
          handler: async function (response) {
            try {
              const verifyResponse = await fetch(`${apiUrl}/subscriptions/verify-upgrade`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature
                })
              });

              if (verifyResponse.ok) {
                toast.success('Upgrade completed successfully!');
                fetchCurrentSubscription();
              } else {
                throw new Error('Verification failed');
              }
            } catch (error) {
              toast.error(error.message);
            } finally {
              setProcessingPlan(null);
            }
          },
          theme: { color: '#6366f1' },
          modal: { ondismiss: () => setProcessingPlan(null) }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        toast.success('Plan changed successfully');
        fetchCurrentSubscription();
        setProcessingPlan(null);
      }

    } catch (error) {
      toast.error(error.message);
      setProcessingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!showCancelDialog) {
      setShowCancelDialog(true);
      return;
    }

    setShowCancelDialog(false);

    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      console.log('🔄 Cancelling subscription...');
      const response = await fetch(`${apiUrl}/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'User requested cancellation' })
      });

      const data = await response.json();
      console.log('📥 Cancel response:', data);

      if (response.ok) {
        toast.success(data.message || 'Subscription cancelled successfully');
        fetchCurrentSubscription();
      } else {
        console.error('❌ Cancel failed:', data);
        throw new Error(data.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('❌ Cancel error:', error);
      toast.error(error.message || 'Failed to cancel subscription');
    }
  };

  const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) return null;
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      toast.info('Fetching invoice...');
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/subscriptions/invoices/${invoiceId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank');
        } else {
          toast.error('Invoice URL not found');
        }
      } else {
        const err = await response.json();
        toast.error(err.error || 'Failed to fetch invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const currentPlan = currentSubscription?.subscription?.plan || 'free';
  const subscriptionStatus = currentSubscription?.subscription?.status || 'default';
  const statusMeta = STATUS_META[subscriptionStatus] || STATUS_META.default;
  const badgeClass = TONE_CLASSES[statusMeta.tone] || TONE_CLASSES.slate;
  const activePlanMeta = plans.find((plan) => plan.id === currentPlan) || plans[0];
  const trialEndDate = formatDate(currentSubscription?.subscription?.trialEnd);
  const renewalDate = formatDate(currentSubscription?.subscription?.subscriptionEndDate);
  const primaryDate = subscriptionStatus === 'trial' ? trialEndDate : renewalDate;
  const dateLabel = statusMeta.dateLabel;
  const autoRenewEnabled = currentSubscription?.subscription?.autoRenew ?? true;

  return (
    <div className="min-h-screen bg-background/50">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-background to-background/50 border-b border-border/40 pb-8 pt-8 px-4 md:pb-12 md:pt-10 md:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Choose the Perfect Plan
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full potential of StudioFlow with our premium plans.
            Scale your business with advanced features and priority support.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Current Subscription Status */}
        {currentPlan !== 'free' && (
          <div className="mb-12">
            <Card className="border-primary/20 bg-primary/5 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-primary/10 blur-3xl rounded-full -mr-16 -mt-16" />
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/20 rounded-xl">
                    <activePlanMeta.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold">{activePlanMeta.name} Plan</h3>
                      <Badge className={badgeClass}>{statusMeta.label}</Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {statusMeta.description} • {dateLabel} {primaryDate}
                    </p>
                  </div>
                </div>

                {subscriptionStatus === 'active' && (
                  <Button
                    variant="outline"
                    className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    onClick={handleCancelSubscription}
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isActive = subscriptionStatus === 'active';
            const isReactivation = isCurrentPlan && ['expired', 'cancelled'].includes(subscriptionStatus);
            const isUpgrade = !isCurrentPlan && (currentPlan === 'free' || plan.id === 'studio');
            const isDowngrade = !isCurrentPlan && currentPlan === 'studio' && plan.id === 'pro';
            const isButtonDisabled = plan.id === 'free' || (isCurrentPlan && isActive) || processingPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col p-8 transition-all duration-300 hover:translate-y-[-4px] ${plan.popular
                  ? 'border-primary shadow-2xl shadow-primary/10 bg-card'
                  : 'border-border/50 bg-card/50 hover:bg-card hover:border-border'
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm shadow-lg shadow-primary/20">
                      MOST POPULAR
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <div className="p-3 w-fit rounded-xl bg-muted/50 mb-4">
                    <plan.icon className={`w-6 h-6 text-${plan.color}-500`} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm h-10">{plan.subtitle}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.currency}{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </div>

                <div className="flex-1 mb-8">
                  <ul className="space-y-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <div className={`mt-1 p-0.5 rounded-full bg-${plan.color}-500/20`}>
                          <Check className={`w-3 h-3 text-${plan.color}-500`} />
                        </div>
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  className={`w-full py-6 text-base font-semibold shadow-lg transition-all duration-300 ${getButtonStyles(plan.id)} ${isButtonDisabled ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  disabled={isButtonDisabled || (isReactivation && new Date(currentSubscription?.subscription?.subscriptionEndDate) > new Date())}
                  onClick={() => {
                    if (currentPlan === 'free' || isReactivation) {
                      handleUpgrade(plan.id);
                    } else {
                      handleChangePlan(plan.id);
                    }
                  }}
                >
                  {processingPlan === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan && isActive ? (
                    'Current Plan'
                  ) : isReactivation ? (
                    new Date(currentSubscription?.subscription?.subscriptionEndDate) > new Date()
                      ? `Access until ${new Date(currentSubscription?.subscription?.subscriptionEndDate).toLocaleDateString()}`
                      : 'Reactivate Plan'
                  ) : isUpgrade ? (
                    'Upgrade Plan'
                  ) : isDowngrade ? (
                    'Downgrade Plan'
                  ) : (
                    'Get Started'
                  )}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Billing History */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold mb-4">Billing History</h3>
          <BillingHistory />
        </div>

        {/* FAQ or Trust Section could go here */}
        <div className="mt-20 text-center">
          <p className="text-muted-foreground text-sm">
            Secure payments powered by Razorpay. Cancel anytime.
          </p>
        </div>
        {/* Features Comparison */}
        <Card className="bg-card border-slate-800 p-6 mt-12">
          <h3 className="text-lg font-semibold text-white mb-4">All Plans Include</h3>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-white">Project Management</p>
                <p className="text-sm text-slate-400">Organize and track all your projects</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-white">Client Collaboration</p>
                <p className="text-sm text-slate-400">Work together seamlessly</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-white">Invoicing</p>
                <p className="text-sm text-slate-400">Professional invoicing tools</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Security Note */}
        <Card className="bg-slate-900/50 border-slate-800 p-4 mt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Secure Payment via Razorpay</p>
              <p className="text-sm text-slate-400">
                All payments are processed securely through Razorpay. We never store your card details.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Your subscription will be cancelled and you will be downgraded to the Free plan.
              Any remaining subscription time will be lost, and premium features will be revoked immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700 font-semibold">
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-red-600 text-white hover:bg-red-700 font-semibold shadow-lg"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Downgrade Confirmation Dialog */}
      <AlertDialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Downgrade Plan?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              You are downgrading to {plans.find(p => p.id === selectedPlan)?.name} plan.
              Your current plan will remain active until{' '}
              {new Date(currentSubscription?.subscription?.subscriptionEndDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}, after which you'll be charged ₹{plans.find(p => p.id === selectedPlan)?.price}/month.
              <br /><br />
              <strong>No payment required now.</strong> You'll keep access to your current plan features until the end of your billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700 font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDowngradeDialog(false);
                executePlanChange(selectedPlan);
              }}
              className="bg-amber-600 text-white hover:bg-amber-700 font-semibold shadow-lg"
            >
              Confirm Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

