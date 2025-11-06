import { useNavigate } from 'react-router-dom';
import { useAuth, SignedIn, SignedOut } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Check,
  ArrowRight,
  Zap,
  Users,
  FileText,
  Crown,
  Sparkles,
  Shield
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

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
        'Email support (48h)'
      ],
      popular: false,
      cta: 'Start Free'
    },
    {
      id: 'pro',
      name: 'Pro',
      subtitle: 'For individual professionals',
      price: 100,
      currency: '₹',
      period: '/month',
      features: [
        '50 projects included',
        '5 team members per project',
        'Real-time updates',
        'Branded invoices + Razorpay',
        'Priority support (24h)',
        'Advanced analytics'
      ],
      popular: true,
      cta: 'Get Started'
    },
    {
      id: 'studio',
      name: 'Studio',
      subtitle: 'For agencies & teams',
      price: 499,
      currency: '₹',
      period: '/month',
      features: [
        '100 projects included',
        'Unlimited team members',
        'All Pro features',
        'Advanced analytics',
        'Custom workflows',
        'Dedicated support (12h)'
      ],
      popular: false,
      cta: 'Get Started'
    }
  ];

  const handleGetStarted = (planId) => {
    if (isSignedIn) {
      // Navigate to subscription page if already signed in
      navigate('/dashboard/subscription');
    } else {
      // Navigate to sign up if not signed in
      navigate('/sign-up');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-background"></div>
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6">
            <Badge className="bg-primary/20 text-primary border-primary/30">
              <Sparkles className="w-3 h-3 mr-1" />
              Streamline Your Creative Workflow
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">
              Manage Projects,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                Collaborate Seamlessly
              </span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              The all-in-one platform for freelancers and agencies to manage projects, collaborate with clients, and get paid faster.
            </p>
            <div className="flex gap-4 justify-center items-center flex-wrap">
              <SignedOut>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white px-8"
                  onClick={() => navigate('/sign-up')}
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 hover:bg-slate-800"
                  onClick={() => navigate('/sign-in')}
                >
                  Sign In
                </Button>
              </SignedOut>
              <SignedIn>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white px-8"
                  onClick={() => navigate('/dashboard')}
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </SignedIn>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-slate-900/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Everything You Need</h2>
            <p className="text-slate-400">Powerful features to run your creative business</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-card border-slate-800 p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Project Management</h3>
              <p className="text-slate-400">
                Track projects, tasks, and deadlines all in one place. Stay organized and deliver on time.
              </p>
            </Card>
            <Card className="bg-card border-slate-800 p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Client Collaboration</h3>
              <p className="text-slate-400">
                Share updates, get feedback, and keep clients in the loop without endless email chains.
              </p>
            </Card>
            <Card className="bg-card border-slate-800 p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Smart Invoicing</h3>
              <p className="text-slate-400">
                Create professional invoices and get paid faster with integrated Razorpay payments.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4" id="pricing">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-slate-400">Start free, scale as you grow. No hidden fees.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative bg-card border-slate-800 p-8 ${
                  plan.popular ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-white px-4 py-1">
                      <Crown className="w-3 h-3 mr-1" />
                      MOST POPULAR
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-slate-400 text-sm">{plan.subtitle}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-white">
                      {plan.currency}{plan.price}
                    </span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.popular
                      ? 'bg-primary hover:bg-primary/90 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                  onClick={() => handleGetStarted(plan.id)}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 text-slate-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Secure payments powered by Razorpay</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/20 via-purple-500/10 to-background">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Join hundreds of freelancers and agencies already using StudioFlow
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white px-8"
            onClick={() => handleGetStarted('pro')}
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}

