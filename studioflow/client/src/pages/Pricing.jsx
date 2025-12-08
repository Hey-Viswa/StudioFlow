import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Check, ArrowLeft, Loader2 } from 'lucide-react';

export default function Pricing() {
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const plans = [
    {
      name: 'Starter',
      price: '₹0',
      period: 'Forever free',
      description: 'Best for solo creators',
      features: ['Up to 5 active projects', 'Project management', 'Basic invoicing', 'Email support'],
      planId: 'starter',
      isFree: true,
    },
    {
      name: 'Pro',
      price: '₹1',
      period: '/mo',
      description: 'For professionals',
      badge: 'POPULAR',
      features: ['Up to 50 projects', 'Client collaboration', 'Branded invoices', 'Priority support', 'Real-time comments', 'Advanced analytics'],
      planId: 'pro',
      isFree: false,
    },
    {
      name: 'Studio',
      price: '₹2',
      period: '/mo',
      description: 'For growing teams',
      features: ['Up to 100 projects', 'Everything in Pro', 'Team permissions', 'Advanced reviews', 'Dedicated support', 'Custom workflows'],
      planId: 'studio',
      isFree: false,
    },
  ];

  const handleSubscribe = async (planId, isFree) => {
    if (isFree) {
      navigate(isSignedIn ? '/dashboard' : '/sign-up');
      return;
    }

    if (!isSignedIn) {
      navigate('/sign-up');
      return;
    }

    setLoading(planId);

    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const orderResponse = await fetch(`${apiUrl}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan: planId }),
      });

      if (!orderResponse.ok) throw new Error('Failed to create order');

      const orderData = await orderResponse.json();

      const options = {
        key: orderData.key,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'StudioFlow',
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan Subscription`,
        order_id: orderData.order.id,
        handler: async function (response) {
          try {
            const verifyResponse = await fetch(`${apiUrl}/payment/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (verifyResponse.ok) {
              navigate('/dashboard?payment=success');
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.primaryEmailAddress?.emailAddress || '',
        },
        theme: { color: '#8b5cf6' },
        modal: { ondismiss: () => setLoading(null) }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to initiate payment. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">Select the perfect plan for your workflow</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.planId} className={`relative ${plan.badge ? 'border-primary shadow-lg' : ''}`}>
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">{plan.badge}</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.badge ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.planId, plan.isFree)}
                  disabled={loading === plan.planId}
                >
                  {loading === plan.planId ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                  ) : (
                    `Choose ${plan.name}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
