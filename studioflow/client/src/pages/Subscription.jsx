import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Check,
  Crown,
  Zap,
  Users,
  FileText,
  Loader2,
  CreditCard,
  AlertCircle
} from 'lucide-react';

export default function Subscription() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [processingPlan, setProcessingPlan] = useState(null);

  const plans = [
    {
      id: 'free',
      name: 'Starter',
      subtitle: 'Best for solo',
      price: 0,
      currency: '₹',
      period: '/month',
      features: [
        'Up to 5 active projects',
        'Project management',
        'Basic invoicing',
        'Email support'
      ],
      color: 'slate',
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      subtitle: 'Unlimited projects',
      price: 799,
      currency: '₹',
      period: '/mo',
      features: [
        'Unlimited projects',
        'Client collaboration',
        'Branded invoices + Razorpay',
        'Priority support'
      ],
      color: 'primary',
      popular: true
    },
    {
      id: 'studio',
      name: 'Studio',
      subtitle: 'Teams',
      price: 1999,
      currency: '₹',
      period: '/mo',
      features: [
        'Everything in Pro',
        'Team permissions',
        'Advanced reviews',
        'Dedicated support'
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

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway');
        setProcessingPlan(null);
        return;
      }

      console.log('Creating subscription for plan:', planId);

      // Create subscription
      const response = await fetch(`${apiUrl}/subscriptions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Subscription creation failed:', errorData);
        toast.error(errorData.error || 'Failed to create subscription');
        setProcessingPlan(null);
        return;
      }

      const { subscriptionId, amount, currency } = await response.json();
      console.log('Subscription created:', subscriptionId);

      // Check if Razorpay key is configured
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        toast.error('Payment gateway not configured');
        setProcessingPlan(null);
        return;
      }

      // Initialize Razorpay
      const options = {
        key: razorpayKey,
        subscription_id: subscriptionId,
        name: 'StudioFlow',
        description: `${planId.toUpperCase()} Plan Subscription`,
        currency: currency,
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

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${apiUrl}/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Subscription cancelled successfully');
        fetchCurrentSubscription();
      } else {
        toast.error('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Error cancelling subscription');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlan = currentSubscription?.subscription?.plan || 'free';

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Subscription</h2>
        <p className="text-muted-foreground text-slate-400">
          Start free, scale as you grow. No hidden fees.
        </p>
      </div>

      {/* Current Plan Alert */}
      {currentPlan !== 'free' && (
        <Card className="bg-card border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  {currentPlan === 'pro' ? 'Pro' : 'Studio'} Plan Active
                </p>
                <p className="text-sm text-slate-400">
                  {currentSubscription?.subscription?.status === 'active'
                    ? 'Your subscription is active'
                    : `Status: ${currentSubscription?.subscription?.status}`}
                </p>
              </div>
            </div>
            {currentSubscription?.subscription?.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSubscription}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          const canUpgrade = plan.id !== 'free' && currentPlan === 'free';
          
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
                  className={`w-full ${
                    plan.popular
                      ? 'bg-primary hover:bg-primary/90'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                  disabled={isCurrentPlan || processingPlan === plan.id || !canUpgrade}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {processingPlan === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : canUpgrade ? (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Choose {plan.name}
                    </>
                  ) : (
                    'Choose Starter'
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
    </div>
  );
}

