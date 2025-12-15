import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useThemeColor } from '../components/ThemeColorProvider';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import BillingHistory from '../components/BillingHistory';

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
  green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  red: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  blue: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
};

export default function Subscription() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { themeColor } = useThemeColor();
  const { theme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Helper to get consistent plan icon
  const getPlanIcon = (planId) => {
    switch(planId) {
        case 'pro': return Zap;
        case 'studio': return Crown;
        default: return Rocket;
    }
  }

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
      popular: false,
      accent: 'slate'
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
      popular: true,
      accent: 'primary' // Will use theme color
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
      popular: false,
      accent: 'violet'
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

      const response = await fetch(`${apiUrl}/subscriptions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });

      const data = await response.json();

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
          color: '#6366f1' // Could be dynamic based on theme, but branding standard is usually fixed
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

      const response = await fetch(`${apiUrl}/subscriptions/change-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPlan: planId })
      });

      const data = await response.json();

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

  if (loading) {
     return <DashboardSkeleton />;
  }

  const currentPlan = currentSubscription?.subscription?.plan || 'free';
  const subscriptionStatus = currentSubscription?.subscription?.status || 'default';
  const statusMeta = STATUS_META[subscriptionStatus] || STATUS_META.default;
  const badgeClass = TONE_CLASSES[statusMeta.tone] || TONE_CLASSES.slate;
  
  const activePlanData = plans.find((plan) => plan.id === currentPlan) || plans[0];
  const ActiveIcon = getPlanIcon(activePlanData.id);

  const trialEndDate = currentSubscription?.subscription?.trialEnd ? new Date(currentSubscription.subscription.trialEnd).toLocaleDateString() : null;
  const renewalDate = currentSubscription?.subscription?.subscriptionEndDate ? new Date(currentSubscription.subscription.subscriptionEndDate).toLocaleDateString() : null;
  const primaryDate = subscriptionStatus === 'trial' ? trialEndDate : renewalDate;
  const dateLabel = statusMeta.dateLabel;

  return (
    <div className="flex-1 space-y-8 p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Subscription & Billing
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
             Manage your studio's tier, billing methods, and usage. Scale your capabilities as your team grows.
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/contact?subject=Billing%20Support')}>
                Contact Support
            </Button>
        </div>
      </div>

      {/* Current Plan Card */}
      {currentPlan !== 'free' && (
        <Card className={cn("relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5")}>
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <ActiveIcon className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{activePlanData.name} Plan</h2>
                    <Badge className={cn("text-xs px-2 py-0.5", badgeClass)}>
                        {statusMeta.label}
                    </Badge>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{statusMeta.description}</span>
                    {primaryDate && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="font-medium text-foreground/80">{dateLabel} {primaryDate}</span>
                      </>
                    )}
                </div>
              </div>
            </div>

            {subscriptionStatus === 'active' && (
              <Button 
                variant="outline" 
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleCancelSubscription}
              >
                Cancel Subscription
              </Button>
            )}
            {subscriptionStatus === 'cancelled' && (
                <Button onClick={() => handleUpgrade(currentPlan)}>
                    Reactivate Plan
                </Button>
            )}
          </div>
        </Card>
      )}

      {/* Pricing Grid */}
      <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          const isActive = subscriptionStatus === 'active';
          const isReactivation = isCurrentPlan && ['expired', 'cancelled'].includes(subscriptionStatus);
          const isUpgrade = !isCurrentPlan && (currentPlan === 'free' || plan.id === 'studio');
          const isDowngrade = !isCurrentPlan && currentPlan === 'studio' && plan.id === 'pro';
          const isButtonDisabled = plan.id === 'free' || (isCurrentPlan && isActive) || processingPlan === plan.id;
          const PlanIcon = getPlanIcon(plan.id);

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col p-6 transition-all duration-300 hover:shadow-lg border-2",
                plan.popular ? "border-primary shadow-md" : "border-border hover:border-border/80" 
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary hover:bg-primary text-primary-foreground shadow-sm">
                    MOST POPULAR
                  </Badge>
                </div>
              )}

              <div className="mb-6 space-y-4">
                 <div className={cn(
                     "w-12 h-12 rounded-lg flex items-center justify-center",
                     plan.popular ? "bg-primary/10 text-primary" : "bg-secondary text-foreground"
                 )}>
                    <PlanIcon className="w-6 h-6" />
                 </div>
                 
                 <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{plan.subtitle}</p>
                 </div>
              </div>

              <div className="mb-6 pb-6 border-b border-border/50">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.currency}{plan.price}</span>
                  <span className="text-muted-foreground text-sm font-medium">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className={cn(
                        "w-4 h-4 mt-0.5 shrink-0",
                        plan.popular ? "text-primary" : "text-foreground"
                    )} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={cn(
                    "w-full font-semibold",
                    plan.id === 'pro' && "shadow-lg shadow-primary/20",
                    isButtonDisabled && "opacity-80"
                )}
                variant={plan.popular ? 'default' : 'secondary'}
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
                      ? 'Expires Soon'
                      : 'Reactivate'
                  ) : isUpgrade ? (
                    'Upgrade'
                  ) : isDowngrade ? (
                    'Downgrade'
                  ) : (
                    'Get Started'
                  )}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Billing History Section */}
      <div className="mt-12 space-y-6">
        <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Billing History
            </h3>
            <p className="text-sm text-muted-foreground">View and download your past invoices</p>
        </div>
        <BillingHistory />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-border/50">
          <div className="flex gap-4">
             <div className="p-2 bg-primary/10 rounded-lg h-fit">
                <Shield className="w-5 h-5 text-primary" />
             </div>
             <div>
                 <h4 className="font-medium text-sm">Secure Payments</h4>
                 <p className="text-xs text-muted-foreground mt-1">Processed securely via Razorpay. We do not store card details.</p>
             </div>
          </div>
          <div className="flex gap-4">
             <div className="p-2 bg-primary/10 rounded-lg h-fit">
                <Zap className="w-5 h-5 text-primary" />
             </div>
             <div>
                 <h4 className="font-medium text-sm">Instant Activation</h4>
                 <p className="text-xs text-muted-foreground mt-1">Access pro features immediately after payment confirmation.</p>
             </div>
          </div>
          <div className="flex gap-4">
             <div className="p-2 bg-primary/10 rounded-lg h-fit">
                <Users className="w-5 h-5 text-primary" />
             </div>
             <div>
                 <h4 className="font-medium text-sm">Team Scalability</h4>
                 <p className="text-xs text-muted-foreground mt-1">Add more seats or upgrade your plan anytime as you grow.</p>
             </div>
          </div>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will be cancelled and you will be downgraded to the Free plan.
              Any remaining subscription time will be lost, and premium features will be revoked immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Downgrade Confirmation Dialog */}
      <AlertDialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Downgrade Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              You are downgrading to {plans.find(p => p.id === selectedPlan)?.name} plan.
              Your current plan will remain active until{' '}
              {new Date(currentSubscription?.subscription?.subscriptionEndDate).toLocaleDateString()}.
              <br /><br />
              <strong>No payment required now.</strong> You'll keep access to your current plan features until the end of your billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDowngradeDialog(false);
                executePlanChange(selectedPlan);
              }}
            >
              Confirm Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
