import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut, useAuth } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { FolderKanban, Users, Receipt, Play, Check, Sparkles, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const [activeSection, setActiveSection] = useState('');
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    const sections = ['features', 'pricing', 'faq'];
    sections.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      sections.forEach((sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src="/studioflowlogo.svg" alt="StudioFlow" className="h-8 w-auto hidden dark:block" />
                <img src="/studioflow-black.svg" alt="StudioFlow" className="h-8 w-auto block dark:hidden" />
              </div>
              {/* <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">StudioFlow</h1> */}
            </div>

            {/* Centered Navigation Pills */}
            <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center gap-1 bg-muted/80 p-1.5 rounded-full border border-border">
              <button
                onClick={() => scrollToSection('features')}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeSection === 'features'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeSection === 'pricing'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeSection === 'faq'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
              >
                FAQ
              </button>
            </div>

            {/* Auth Buttons - Always visible */}
            <div className="flex items-center gap-3">
              {!isSignedIn ? (
                <>
                  <SignInButton mode="modal">
                    <Button variant="ghost" className="hover:scale-105 transition-transform duration-200">
                      Sign in
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button className="bg-white text-[#020817] hover:bg-gray-100 hover:scale-105 transition-all duration-200 shadow-lg font-semibold">
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </SignUpButton>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => navigate('/dashboard')}
                    variant="ghost"
                    className="hover:scale-105 transition-transform duration-200"
                  >
                    Dashboard
                  </Button>
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "w-10 h-10 hover:scale-105 transition-transform duration-200"
                      }
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32 sm:pt-40 sm:pb-48">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(120,119,198,0.08),transparent_50%)]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm animate-slide-up">
                <Sparkles className="w-3 h-3" />
                <span>Now in Beta</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Project management for{' '}
                <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  video editors
                </span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed animate-slide-up max-w-xl" style={{ animationDelay: '0.2s' }}>
                Organize timelines, collaborate with clients, and get paid—without leaving your flow.
              </p>

              <div className="flex flex-wrap gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button size="lg" className="gap-2 hover:scale-105 transition-all duration-200 shadow-2xl shadow-primary/30 hover:shadow-3xl hover:shadow-primary/50 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
                      <Sparkles className="w-5 h-5" />
                      Get Started Free
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Button
                    size="lg"
                    onClick={() => navigate('/dashboard')}
                    className="gap-2 hover:scale-105 transition-all duration-200 shadow-2xl shadow-primary/30 hover:shadow-3xl hover:shadow-primary/50 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8"
                  >
                    <Sparkles className="w-5 h-5" />
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </SignedIn>
                <Button size="lg" variant="outline" className="gap-2 hover:scale-105 transition-all duration-200 hover:bg-primary/5 border-2">
                  <Play className="w-4 h-4" />
                  Watch Demo
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>No credit card needed</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Hero Image Placeholder */}
            <div className="relative animate-slide-in-left" style={{ animationDelay: '0.5s' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent rounded-lg blur-3xl" />
              <div className="relative aspect-[4/3] rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-border/50 overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="w-full h-full rounded-lg bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md border border-border/50 shadow-2xl p-6 animate-float">
                    <div className="w-full h-3 bg-primary/20 rounded-full mb-4" />
                    <div className="space-y-3">
                      <div className="h-2 bg-muted rounded w-3/4" />
                      <div className="h-2 bg-muted rounded w-1/2" />
                      <div className="h-2 bg-muted rounded w-5/6" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-primary">Features</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Built for post-production</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage video projects, collaborate with clients, and get paid faster.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-border/50 bg-card/50 backdrop-blur hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:scale-105 hover:border-primary/30 group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <FolderKanban className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">Project organization</CardTitle>
                <CardDescription>
                  Sort cuts, assets, and versions per client and per project.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:scale-105 hover:border-primary/30 group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">Client collaboration</CardTitle>
                <CardDescription>
                  Share links, collect timestamped feedback, track approvals.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:scale-105 hover:border-primary/30 group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">Invoices & payments</CardTitle>
                <CardDescription>
                  Send branded invoices, accept payments, and receive faster.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-primary">Pricing</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Simple pricing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {/* Starter Plan */}
            <Card className="border-border/50 bg-card/50 backdrop-blur hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:scale-105 hover:border-primary/20 group flex flex-col">
              <CardHeader>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">Starter</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded-full group-hover:bg-primary/10 transition-colors">Free Forever</span>
                </div>
                <CardTitle className="text-4xl font-bold">₹0<span className="text-lg text-muted-foreground font-normal">/mo</span></CardTitle>
                <CardDescription>Perfect for solo freelancers</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span><strong>5 projects</strong> included</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>1 team member per project</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>Basic invoicing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>Email support (48h)</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="mt-auto">
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button variant="outline" className="w-full hover:bg-primary/5 transition-colors">Choose Starter</Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Button
                    variant="outline"
                    className="w-full hover:bg-primary/5 transition-colors"
                    onClick={() => navigate('/dashboard/subscription')}
                  >
                    Get Started Free
                  </Button>
                </SignedIn>
              </CardFooter>
            </Card>

            {/* Pro Plan */}
            <Card className="border-primary/50 bg-card/50 backdrop-blur shadow-xl hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 hover:scale-110 relative group animate-glow-pulse flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                <span className="bg-gradient-to-r from-primary to-purple-600 text-white px-5 py-1.5 rounded-full text-xs font-bold shadow-xl shadow-primary/50 group-hover:scale-110 transition-transform inline-block uppercase tracking-wider">
                  Popular
                </span>
              </div>
              <CardHeader className="pt-12">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">Pro</span>
                </div>
                <CardTitle className="text-5xl font-bold">
                  ₹100<span className="text-lg text-muted-foreground font-normal">/mo</span>
                </CardTitle>
                <CardDescription className="text-base">For individual professionals</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span><strong>50 projects</strong> included</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>5 team members per project</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>Real-time updates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>Branded invoices + Razorpay</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>Priority support (24h)</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="mt-auto">
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 shadow-2xl shadow-purple-600/40 hover:shadow-3xl hover:shadow-purple-600/60 transition-all font-bold text-base text-white">
                      Choose Pro
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 shadow-2xl shadow-purple-600/40 hover:shadow-3xl hover:shadow-purple-600/60 transition-all font-bold text-base text-white"
                    onClick={() => navigate('/dashboard/subscription')}
                  >
                    Upgrade to Pro
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </SignedIn>
              </CardFooter>
            </Card>

            {/* Studio Plan */}
            <Card className="border-border/50 bg-card/50 backdrop-blur hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:scale-105 hover:border-primary/20 group flex flex-col">
              <CardHeader>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">Studio</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded-full group-hover:bg-primary/10 transition-colors">For Agencies</span>
                </div>
                <CardTitle className="text-4xl font-bold">
                  ₹499<span className="text-lg text-muted-foreground font-normal">/mo</span>
                </CardTitle>
                <CardDescription>Small agencies & teams</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span><strong>100 projects</strong> included</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>Unlimited team members</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>All Pro features</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>Dedicated support (12h)</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="mt-auto">
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button variant="outline" className="w-full hover:bg-primary/5 transition-colors">Choose Studio</Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Button
                    variant="outline"
                    className="w-full hover:bg-primary/5 transition-colors"
                    onClick={() => navigate('/dashboard/subscription')}
                  >
                    Upgrade to Studio
                  </Button>
                </SignedIn>
              </CardFooter>
            </Card>
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-muted/30 relative z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-primary">FAQ</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Frequently Asked Questions</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yes, you can cancel anytime. Your plan will remain active until the end of the billing cycle.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">How many projects can I create?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Starter (Free): 5 projects, Pro (₹100/mo): 50 projects, Studio (₹499/mo): 100 projects with unlimited team members.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">Can I invite team members?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yes! Generate invite links for your projects. Team members can view progress, add comments, and collaborate in real-time.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">Which payment methods are supported?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We accept all major cards, UPI, net banking, and wallets via Razorpay's secure payment gateway.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">What happens to my data if I cancel?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your projects are moved to trash and retained for 30 days. You can restore them anytime before permanent deletion.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">Do you offer refunds?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yes, we offer a 7-day money-back guarantee for new subscriptions. Contact support for assistance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="relative">
                <img src="/studioflowlogo.svg" alt="StudioFlow" className="h-5 w-auto hidden dark:block" />
                <img src="/studioflow-black.svg" alt="StudioFlow" className="h-5 w-auto block dark:hidden" />
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">StudioFlow</span> © 2025
              </p>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="/privacy-policy" className="text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-105">
                Privacy
              </a>
              <a href="/terms-conditions" className="text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-105">
                Terms
              </a>
              <a href="/contact-us" className="text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-105">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
