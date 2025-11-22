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
  Sparkles
} from 'lucide-react';

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

export default function Subscription() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    {
      id: 'free',
      name: 'Starter',
      subtitle: 'Free Forever',
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
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      subtitle: 'For individual professionals',
      price: 100,
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
      popular: true
    },
    {
      id: 'studio',
      name: 'Studio',
      subtitle: 'For agencies & teams',
      price: 499,
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
      popular: false
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
        console.log('📊 Subscription Data Received:', {
          plan: data.subscription?.plan,
          status: data.subscription?.status,
          trialEnd: data.subscription?.trialEnd,
          subscriptionEndDate: data.subscription?.subscriptionEndDate,
          autoRenew: data.subscription?.autoRenew,
          updatedAt: data.subscription?.updatedAt,
          previousPlan: data.subscription?.previousPlan,
          razorpaySubscriptionId: data.subscription?.razorpaySubscriptionId
        });
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

      console.log('Creating subscription for plan:', planId);

      // Create subscription (backend will handle trial logic)
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
        console.error('Subscription creation failed:', data);
        toast.error(data.error || 'Failed to create subscription', {
          description: data.details || 'Please try again'
        });
        setProcessingPlan(null);
        return;
      }

      console.log('✅ Subscription response:', data);

      // Handle regular subscription (requires payment)
      const { subscriptionId, amount, currency } = data;
      
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway');
        setProcessingPlan(null);
        return;
      }

      // Check if Razorpay key is configured
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      console.log('🔑 Razorpay Key check:', razorpayKey ? 'Found' : 'Missing');
      console.log('🔑 Full env check:', import.meta.env);
      
      if (!razorpayKey) {
        console.error('❌ VITE_RAZORPAY_KEY_ID is missing');
        toast.error('Payment gateway not configured');
        setProcessingPlan(null);
        return;
      }

      console.log('💳 Initializing Razorpay with subscription:', subscriptionId);
      
      // Initialize Razorpay with all payment methods
      const options = {
        key: razorpayKey,
        subscription_id: subscriptionId,
        name: 'StudioFlow',
        description: `${planId.toUpperCase()} Plan Subscription`,
        currency: currency,
        
        // Enable all payment methods
        config: {
          display: {
            blocks: {
              banks: {
                name: 'All payment methods',
                instruments: [
                  {
                    method: 'upi'
                  },
                  {
                    method: 'card'
                  },
                  {
                    method: 'netbanking'
                  },
                  {
                    method: 'wallet'
                  }
                ]
              }
            },
            sequence: ['block.banks'],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        
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
              toast.success('Subscription activated successfully!');
              fetchCurrentSubscription();
            } else {
              const errorData = await verifyResponse.json().catch(() => ({}));
              console.error('Payment verification failed:', errorData);
              toast.error(errorData.error || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Verification error:', error);
            toast.error('Error verifying payment');
          } finally {
            setProcessingPlan(null);
          }
        },
        prefill: {
          email: currentSubscription?.email || '',
          name: currentSubscription?.name || ''
        },
        theme: {
          color: '#6366f1'
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal closed');
            setProcessingPlan(null);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      razorpay.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setProcessingPlan(null);
      });

    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error(error.message || 'Failed to process upgrade');
      setProcessingPlan(null);
    }
  };

  const handleChangePlan = async (planId) => {
    // Check if this is an upgrade or downgrade
    const currentPlanPrice = plans.find(p => p.id === currentPlan)?.price || 0;
    const targetPlanPrice = plans.find(p => p.id === planId)?.price || 0;
    const isDowngrade = targetPlanPrice < currentPlanPrice;
    
    if (isDowngrade) {
      // Show confirmation dialog for downgrades
      setSelectedPlan(planId);
      setShowDowngradeDialog(true);
      return;
    }

    // Proceed with upgrade
    await executePlanChange(planId);
  };

  const executePlanChange = async (planId) => {
    const currentPlanPrice = plans.find(p => p.id === currentPlan)?.price || 0;
    const targetPlanPrice = plans.find(p => p.id === planId)?.price || 0;
    const isDowngrade = targetPlanPrice < currentPlanPrice;

    setProcessingPlan(planId);

    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      console.log('Changing plan to:', planId);

      // Call change plan endpoint
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
        console.error('Plan change failed:', data);
        toast.error(data.error || 'Failed to change plan', {
          description: data.details || 'Please try again'
        });
        setProcessingPlan(null);
        return;
      }

      console.log('✅ Plan change response:', data);

      // Handle downgrade (no payment required)
      if (isDowngrade) {
        const endDate = new Date(data.subscription.effectiveDate);
        const formattedDate = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        toast.success(`Downgrade scheduled for ${formattedDate}`, {
          description: data.accessInfo.message
        });
        fetchCurrentSubscription();
        setProcessingPlan(null);
        return;
      }

      // Handle upgrade (requires payment)
      if (data.requiresPayment) {
        // Load Razorpay script
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          toast.error('Failed to load payment gateway');
          setProcessingPlan(null);
          return;
        }

        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!razorpayKey) {
          console.error('❌ VITE_RAZORPAY_KEY_ID is missing');
          toast.error('Payment gateway not configured');
          setProcessingPlan(null);
          return;
        }

        console.log('💳 Initializing Razorpay for upgrade payment');
        
        // Initialize Razorpay for upgrade payment
        const options = {
          key: razorpayKey,
          amount: Math.round(data.amount * 100), // Convert to paise
          currency: data.currency || 'INR',
          name: 'StudioFlow',
          description: data.description,
          order_id: data.orderId,
          
          handler: async function (response) {
            try {
              console.log('Payment successful, verifying upgrade...');
              // Verify upgrade payment
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
                const errorData = await verifyResponse.json().catch(() => ({}));
                console.error('Payment verification failed:', errorData);
                toast.error(errorData.error || 'Payment verification failed');
              }
            } catch (error) {
              console.error('Verification error:', error);
              toast.error('Error verifying payment');
            } finally {
              setProcessingPlan(null);
            }
          },
          prefill: {
            email: currentSubscription?.email || '',
            name: currentSubscription?.name || ''
          },
          theme: {
            color: '#6366f1'
          },
          modal: {
            ondismiss: function() {
              console.log('Payment modal closed');
              setProcessingPlan(null);
            }
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();

        razorpay.on('payment.failed', function (response) {
          console.error('Payment failed:', response.error);
          toast.error(`Payment failed: ${response.error.description}`);
          setProcessingPlan(null);
        });
      } else {
        // No payment required, plan changed immediately
        toast.success(data.message || 'Plan changed successfully');
        fetchCurrentSubscription();
        setProcessingPlan(null);
      }

    } catch (error) {
      console.error('Change plan error:', error);
      toast.error(error.message || 'Failed to change plan');
      setProcessingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    setShowCancelDialog(false);

    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
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
        const accessDate = data.subscription?.accessUntil 
          ? new Date(data.subscription.accessUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'the end of your billing period';
        toast.success('Subscription cancelled', {
          description: `You keep access until ${accessDate}`
        });
        fetchCurrentSubscription();
      } else {
        console.error('Cancel failed:', data);
        toast.error(data.error || 'Failed to cancel subscription', {
          description: data.details || 'Please try again or contact support'
        });
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Error cancelling subscription', {
        description: error.message || 'Please check your connection and try again'
      });
    }
  };

  const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    // Check for invalid dates (1970 or before 2000)
    if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000 || date.getFullYear() === 1970) {
      return null;
    }
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
  const referenceUpdatedAt = formatDate(currentSubscription?.subscription?.updatedAt);

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Subscription</h2>
        <p className="text-muted-foreground text-slate-400">
          Start free, scale as you grow. No hidden fees.
        </p>
      </div>

      {/* Checkout Pending Warning */}
      {subscriptionStatus === 'created' && (
        <Alert className="bg-amber-900/50 border-amber-500 mb-6">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <AlertTitle className="text-amber-300 font-bold text-lg">Payment Pending - Checkout Not Completed</AlertTitle>
          <AlertDescription className="text-amber-200">
            You started a subscription but didn't complete the payment. Please complete the checkout below or the subscription will be cancelled.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan Overview */}
      <Card className="border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-slate-400">Current Plan</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                {subscriptionStatus === 'trial' ? (
                  <Sparkles className="w-5 h-5 text-amber-300" />
                ) : (
                  <Crown className="w-5 h-5 text-primary" />
                )}
                <h3 className="text-2xl font-semibold text-white">{activePlanMeta.name}</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                {statusMeta.label}
              </span>
              {currentPlan !== 'free' && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold">
                  ✓ SUBSCRIBED
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">{statusMeta.description}</p>
            <div className="text-xs text-slate-500">
              Updated {referenceUpdatedAt || 'just now'} • Auto-renew {autoRenewEnabled ? 'enabled' : 'disabled'}
            </div>
          </div>
          <div className="grid gap-4 w-full lg:w-auto lg:min-w-[320px]">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase text-slate-500">{dateLabel}</p>
              <p className="text-lg font-semibold text-white mt-1">{primaryDate || 'Not scheduled yet'}</p>
              {subscriptionStatus === 'scheduled_downgrade' && renewalDate && (
                <p className="text-xs text-slate-500 mt-2">
                  You will stay on {activePlanMeta.name} until {renewalDate}, then move to {currentSubscription?.subscription?.scheduledPlan?.toUpperCase() || 'the next plan'}.
                </p>
              )}
            </div>
            {subscriptionStatus === 'trial' && trialEndDate && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-xs uppercase text-amber-300">Trial progress</p>
                <p className="text-sm text-amber-100 mt-1">
                  Convert before {trialEndDate} to continue without interruption.
                </p>
              </div>
            )}
          </div>
        </div>
        {subscriptionStatus === 'active' && activePlanMeta.id !== 'free' && (
          <div className="mt-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowCancelDialog(true)}
              className="border-2 border-red-500 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 font-bold text-base shadow-lg"
            >
              <AlertCircle className="w-5 h-5 mr-2" />
              Cancel Auto-Renew
            </Button>
          </div>
        )}
      </Card>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          const subscriptionStatus = currentSubscription?.subscription?.status;
          const isActive = subscriptionStatus === 'active';
          const isExpiredOrCancelled = ['expired', 'cancelled', 'inactive'].includes(subscriptionStatus);
          const isScheduledDowngrade = subscriptionStatus === 'scheduled_downgrade';
          
          // Determine if button should be enabled:
          // - Free plan: always disabled
          // - Current plan + active: disabled (already have it)
          // - Current plan + expired/cancelled: enabled (reactivate)
          // - Different paid plan: enabled (upgrade/downgrade)
          const isButtonDisabled = plan.id === 'free' || 
                                   (isCurrentPlan && isActive) || 
                                   processingPlan === plan.id;
          
          // Determine button action and text
          const isReactivation = isCurrentPlan && isExpiredOrCancelled;
          const isUpgrade = !isCurrentPlan && (currentPlan === 'free' || plan.id === 'studio');
          const isDowngrade = !isCurrentPlan && currentPlan === 'studio' && plan.id === 'pro';
          
          return (
            <Card
              key={plan.id}
              className={`relative bg-card border-slate-800 ${
                plan.popular ? 'ring-2 ring-primary' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-white">POPULAR</Badge>
                </div>
              )}
              
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <p className="text-sm text-slate-400">{plan.subtitle}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      {plan.currency}{plan.price}
                    </span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full font-bold text-lg py-7 transition-all duration-200 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-2xl shadow-purple-500/50 border-2 border-purple-400'
                      : isReactivation
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-2xl shadow-green-500/50 border-2 border-green-400'
                      : isButtonDisabled
                      ? 'bg-slate-800/50 text-slate-500 border-2 border-slate-700'
                      : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white shadow-xl border-2 border-slate-500'
                  }`}
                  disabled={isButtonDisabled}
                  onClick={() => {
                    // If upgrading from free or reactivating, use handleUpgrade
                    // Otherwise (switching between paid plans), use handleChangePlan
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
                  ) : plan.id === 'free' ? (
                    'Free Plan'
                  ) : (isCurrentPlan && isActive) ? (
                    'Current Plan'
                  ) : (isCurrentPlan && isScheduledDowngrade) ? (
                    'Downgrade Scheduled'
                  ) : isReactivation ? (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Reactivate {plan.name}
                    </>
                  ) : isUpgrade ? (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Upgrade to {plan.name}
                    </>
                  ) : isDowngrade ? (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Downgrade to {plan.name}
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Subscribe to {plan.name}
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Features Comparison */}
      <Card className="bg-card border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">All Plans Include</h3>
        <div className="grid gap-4 md:grid-cols-3">
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
      <Card className="bg-slate-900/50 border-slate-800 p-4">
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
              <br/><br/>
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

