import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut, useAuth } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { FolderKanban, Users, Receipt, Play, Check, Sparkles, ArrowRight, Zap, Shield, Globe, Move, Layers, MousePointer2, MessageSquare, FileText, Download, CheckCircle2, ListTodo, Clock } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Draggable } from 'gsap/Draggable';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(ScrollTrigger, Draggable, Flip, useGSAP);
import { AbstractShape1, AbstractShape2, AbstractShape3, AbstractShape4 } from '../components/landing/FeatureGraphics';
import SEO from '../components/SEO';

const Landing = () => {
  const [activeSection, setActiveSection] = useState('');
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  const container = useRef();
  const heroRef = useRef();
  const featuresRef = useRef();
  const pricingRef = useRef();
  const showcaseRef = useRef();

  // Flip State
  const [layout, setLayout] = useState('grid');
  const flipContainerRef = useRef();

  useGSAP(() => {
    // Hero Animation
    const tl = gsap.timeline();

    tl.from('.hero-badge', {
      y: -20,
      opacity: 0,
      duration: 0.5,
      ease: 'expo.out'
    })
      .from('.hero-title', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.05,
        ease: 'expo.out'
      }, '-=0.3')
      .from('.hero-desc', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: 'expo.out'
      }, '-=0.4')
      .from('.hero-buttons', {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: 'expo.out'
      }, '-=0.4')
      .from('.hero-visual', {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: 'expo.out'
      }, '-=0.4');

    // Draggable Implementation
    Draggable.create(".draggable-item", {
      bounds: ".draggable-container",
      inertia: true,
      edgeResistance: 0.65,
      type: "x,y",
      onDragStart: function () {
        gsap.to(this.target, { scale: 1.1, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", duration: 0.2 });
      },
      onDragEnd: function () {
        gsap.to(this.target, { scale: 1, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", duration: 0.2 });
      }
    });

    // Features Animation
    // Features Animation - Disabled to ensure visibility
    // gsap.from('.feature-card', { ... });

    // Mockup Animations
    // Workspace Files
    gsap.from('.mockup-file', {
      scrollTrigger: { trigger: '.feature-card-1', start: 'top 85%' },
      x: -20, opacity: 0, duration: 0.4, stagger: 0.05, ease: 'back.out(1.2)'
    });
    // Review Comment
    gsap.from('.mockup-comment', {
      scrollTrigger: { trigger: '.feature-card-2', start: 'top 85%' },
      y: 10, opacity: 0, scale: 0.9, duration: 0.4, ease: 'back.out(1.2)', delay: 0.1
    });
    // Invoice Badge
    gsap.from('.mockup-invoice-badge', {
      scrollTrigger: { trigger: '.feature-card-3', start: 'top 85%' },
      scale: 0, duration: 0.3, ease: 'back.out(1.5)', delay: 0.2
    });
    // Asset Download
    gsap.from('.mockup-download-btn', {
      scrollTrigger: { trigger: '.feature-card-4', start: 'top 85%' },
      scale: 0.8, opacity: 0, duration: 0.3, ease: 'back.out(1.5)', delay: 0.1
    });
    // Task Items
    gsap.from('.mockup-task', {
      scrollTrigger: { trigger: '.feature-card-5', start: 'top 85%' },
      x: -10, opacity: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out', delay: 0.1
    });
    // Team Avatars
    gsap.from('.mockup-avatar', {
      scrollTrigger: { trigger: '.feature-card-6', start: 'top 85%' },
      scale: 0, opacity: 0, duration: 0.3, stagger: 0.05, ease: 'back.out(1.5)', delay: 0.1
    });

    // Workflow Animation
    // Workflow Animation
    gsap.fromTo('.workflow-step',
      { y: 30, autoAlpha: 0 },
      {
        scrollTrigger: {
          trigger: '#workflow',
          start: 'top 75%',
        },
        y: 0,
        autoAlpha: 1,
        duration: 0.5,
        stagger: 0.1,
        ease: 'expo.out'
      }
    );

    gsap.fromTo('.workflow-line',
      { scaleX: 0 },
      {
        scrollTrigger: {
          trigger: '#workflow',
          start: 'top 75%',
        },
        scaleX: 1,
        duration: 0.8,
        ease: 'expo.out',
        delay: 0.1
      }
    );

    // Workflow Internal Animations
    // Workflow Internal Animations
    gsap.fromTo('.workflow-file',
      { width: 0, opacity: 0 },
      {
        scrollTrigger: { trigger: '#workflow', start: 'top 65%' },
        width: '100%', opacity: 1, duration: 0.4, stagger: 0.1, delay: 0.2, ease: 'power2.out'
      }
    );

    gsap.fromTo('.workflow-user',
      { scale: 0, opacity: 0 },
      {
        scrollTrigger: { trigger: '#workflow', start: 'top 65%' },
        scale: 1, opacity: 1, duration: 0.3, stagger: 0.05, ease: 'back.out(1.5)', delay: 0.3
      }
    );

    gsap.fromTo('.workflow-payment',
      { scaleX: 0 },
      {
        scrollTrigger: { trigger: '#workflow', start: 'top 65%' },
        scaleX: 1, duration: 0.6, ease: 'expo.out', delay: 0.4
      }
    );

    // Pricing Animation
    // Pricing Animation
    gsap.fromTo('.pricing-card',
      { y: 30, autoAlpha: 0 },
      {
        scrollTrigger: {
          trigger: '#pricing',
          start: 'top 75%',
        },
        y: 0,
        autoAlpha: 1,
        duration: 0.5,
        stagger: 0.1,
        ease: 'expo.out'
      }
    );

  }, { scope: container });

  // Flip Animation Handler
  const toggleLayout = () => {
    const state = Flip.getState(".flip-item");
    setLayout(layout === 'grid' ? 'list' : 'grid');

    // We need to wait for React to update the DOM before animating
    // In a real app, useLayoutEffect or a timeout might be safer, but Flip handles this well usually
    setTimeout(() => {
      Flip.from(state, {
        duration: 0.6,
        ease: "power1.inOut",
        absolute: true, // crucial for smooth layout changes
        stagger: 0.05,
        onEnter: elements => gsap.fromTo(elements, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.6 }),
        onLeave: elements => gsap.to(elements, { opacity: 0, scale: 0, duration: 0.6 })
      });
    }, 0);
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  return (
    <div ref={container} className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
      <SEO
        title="All-in-One Project Management for Creative Agencies"
        description="Stop chasing client feedback in emails. StudioFlow is the all-in-one project management tool for creative agencies with real-time proofing, invoicing, and secure file delivery."
      />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="relative">
                <img src="/studioflowlogo.svg" alt="StudioFlow" className="h-8 w-auto hidden dark:block" />
                <img src="/studioflow-black.svg" alt="StudioFlow" className="h-8 w-auto block dark:hidden" />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1 bg-secondary/50 p-1 rounded-full border border-border/50 backdrop-blur-md">
              {['features', 'workflow', 'pricing'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 capitalize ${activeSection === item
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              {!isSignedIn ? (
                <>
                  <SignInButton mode="modal">
                    <Button variant="ghost" className="hover:bg-primary/5">Sign in</Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105">
                      Get Started <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </SignUpButton>
                </>
              ) : (
                <Button onClick={() => navigate('/dashboard')} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                  Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-24 pb-16 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-50 dark:opacity-20 mix-blend-screen" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-green-500/20 rounded-full blur-[100px] opacity-30 dark:opacity-10" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="hero-badge inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 sm:mb-8">
            <Sparkles className="w-3 h-3" />
            <span>Reimagined for Video Editors</span>
          </div>

          <h1 className="hero-title text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
            Manage Projects. <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary via-green-400 to-primary bg-clip-text text-transparent animate-gradient-x">
              Master Your Flow.
            </span>
          </h1>

          <p className="hero-desc text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-4">
            The all-in-one workspace for video editors to organize timelines, collaborate with clients, and get paid faster—without the chaos.
          </p>

          <div className="hero-buttons flex flex-col sm:flex-row justify-center gap-4 mb-16 sm:mb-20 px-4 sm:px-0">
            {!isSignedIn ? (
              <SignUpButton mode="modal">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 hover:scale-105 transition-all duration-300">
                  Start for Free
                </Button>
              </SignUpButton>
            ) : (
              <Button size="lg" onClick={() => navigate('/dashboard')} className="w-full sm:w-auto h-12 px-8 text-base bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 hover:scale-105 transition-all duration-300">
                Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300">
              <Play className="w-4 h-4 mr-2" /> Watch Demo
            </Button>
          </div>

          {/* Hero Visual */}
          <div className="hero-visual relative max-w-5xl mx-auto px-2 sm:px-0">
            <div className="relative rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm shadow-2xl overflow-hidden aspect-[16/9] group">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-purple-500/5 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Mockup UI */}
              <div className="absolute inset-0 flex flex-col">
                {/* Window Controls */}
                <div className="h-8 sm:h-10 border-b border-border/50 bg-muted/30 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/20" />
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/20" />
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/20" />
                  </div>
                </div>

                <div className="flex-1 bg-background/40 flex overflow-hidden">
                  {/* Sidebar */}
                  <div className="w-48 border-r border-border/50 bg-muted/10 p-4 hidden md:flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded bg-primary/20" />
                      <div className="h-4 w-20 bg-primary/10 rounded" />
                    </div>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted/20">
                        <div className="w-4 h-4 rounded bg-muted-foreground/20" />
                        <div className="h-3 w-16 bg-muted-foreground/10 rounded" />
                      </div>
                    ))}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 p-4 sm:p-6 overflow-hidden">
                    <div className="flex justify-between items-center mb-6 sm:mb-8">
                      <div>
                        <div className="h-5 sm:h-6 w-24 sm:w-32 bg-foreground/10 rounded mb-2" />
                        <div className="h-3 sm:h-4 w-32 sm:w-48 bg-muted-foreground/10 rounded" />
                      </div>
                      <div className="h-6 sm:h-8 w-16 sm:w-24 bg-primary rounded shadow-lg shadow-primary/20" />
                    </div>

                    {/* Project Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`aspect-video bg-card border border-border/50 rounded-lg p-3 shadow-sm flex flex-col justify-between group hover:border-primary/30 transition-colors ${i > 1 ? 'hidden sm:flex' : 'flex'}`}>
                          <div className="flex justify-between items-start">
                            <div className="w-8 h-8 rounded bg-primary/10" />
                            <div className="w-16 h-4 rounded-full bg-green-500/10" />
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 w-3/4 bg-foreground/10 rounded" />
                            <div className="h-3 w-1/2 bg-muted-foreground/10 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -right-12 -top-12 p-4 bg-background/80 backdrop-blur-md rounded-xl border border-border shadow-xl animate-float hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">Invoice Paid</div>
                  <div className="text-xs text-muted-foreground">Just now</div>
                </div>
              </div>
            </div>

            <div className="absolute -left-12 bottom-12 p-4 bg-background/80 backdrop-blur-md rounded-xl border border-border shadow-xl animate-float-delayed hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">New Client Added</div>
                  <div className="text-xs text-muted-foreground">2 mins ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Features Section */}
      <section id="features" ref={featuresRef} className="py-24 relative bg-muted/10">
        <div className="absolute inset-0 bg-[radial-gradient(#80808012_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need to scale</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Stop juggling spreadsheets and emails. StudioFlow brings your entire post-production workflow into one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto md:auto-rows-[400px]">
            {/* Card 1: Centralized Workspace (Wide) */}
            <div className="feature-card feature-card-1 md:col-span-2 lg:col-span-2 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 group overflow-hidden relative h-full">
              <div className="grid md:grid-cols-2 gap-8 h-full items-center">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-500">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 tracking-tight">Centralized Workspace</h3>
                  <p className="text-muted-foreground text-lg">
                    Keep every cut, asset, and version organized. Never lose a file again with our intuitive folder structure.
                  </p>
                </div>

                {/* Mockup: File List */}
                <div className="bg-background/50 rounded-xl border border-border/50 backdrop-blur-sm shadow-inner overflow-hidden w-full">
                  <div className="p-3 border-b border-border/50 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                  </div>
                  <div className="p-2 space-y-2">
                    <div className="mockup-file flex items-center justify-between p-2 rounded-lg bg-background/80 border border-border/50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <div className="text-xs font-medium">Final_Cut_v2.mp4</div>
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-green-500/10 text-[10px] text-green-500 font-medium">Approved</div>
                    </div>
                    <div className="mockup-file flex items-center justify-between p-2 rounded-lg bg-background/40 border border-border/30">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-orange-500" />
                        <div className="text-xs font-medium">Rough_Cut_v1.mp4</div>
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-orange-500/10 text-[10px] text-orange-500 font-medium">v1</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Streamlined Reviews (Tall) */}
            <div className="feature-card feature-card-2 md:col-span-1 lg:col-span-1 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group overflow-hidden relative flex flex-col justify-between h-full">
              <div className="relative z-10 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-500">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Streamlined Reviews</h3>
                <p className="text-muted-foreground text-lg mb-8">
                  Share secure links. Clients can view progress and approve cuts.
                </p>

                {/* Mockup: Comment/Approve */}
                <div className="bg-background/50 rounded-xl border border-border/50 backdrop-blur-sm shadow-inner p-4">
                  <div className="mockup-comment flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0" />
                    <div className="flex-1 bg-background rounded-lg p-3 text-xs border border-border/50 shadow-sm">
                      <p className="font-medium mb-1">Client</p>
                      <p className="text-muted-foreground">Make the logo pop?</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-medium shadow-lg shadow-green-500/20 hover:scale-105 transition-transform cursor-default">
                      <CheckCircle2 className="w-3 h-3" />
                      Approve
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Integrated Invoicing (Tall) */}
            <div className="feature-card feature-card-3 md:col-span-1 lg:col-span-1 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group overflow-hidden relative flex flex-col justify-between h-full">
              <div className="relative z-10 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6 text-green-500">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Integrated Invoicing</h3>
                <p className="text-muted-foreground text-lg mb-8">
                  Create professional invoices. Track payments and get paid faster.
                </p>

                {/* Mockup: Invoice Row */}
                <div className="bg-background/50 rounded-xl border border-border/50 backdrop-blur-sm shadow-inner p-2 space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/50 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs">₹</div>
                      <div>
                        <div className="text-xs font-bold">#1024</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold">₹45k</div>
                      <div className="mockup-invoice-badge text-[10px] text-green-500 font-medium bg-green-500/10 px-2 py-0.5 rounded-full inline-block mt-1">Paid</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Secure Asset Delivery (Wide) */}
            <div className="feature-card feature-card-4 md:col-span-2 lg:col-span-2 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 group overflow-hidden relative h-full">
              <div className="grid md:grid-cols-2 gap-8 h-full items-center">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6 text-orange-500">
                    <Download className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 tracking-tight">Secure Asset Delivery</h3>
                  <p className="text-muted-foreground text-lg">
                    Deliver final assets securely. Control access and track when files are downloaded.
                  </p>
                </div>

                {/* Mockup: Download UI */}
                <div className="bg-background/50 rounded-xl border border-border/50 backdrop-blur-sm shadow-inner p-4 flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Final_Deliverables.zip</div>
                      <div className="text-xs text-muted-foreground">2.4 GB • Ready</div>
                    </div>
                  </div>
                  <div className="mockup-download-btn p-2 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-110 transition-transform cursor-pointer">
                    <Download className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Task Management (Tall) */}
            <div className="feature-card feature-card-5 md:col-span-2 lg:col-span-1 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group overflow-hidden relative flex flex-col justify-between h-full">
              <div className="relative z-10 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-6 text-pink-500">
                  <ListTodo className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Task Management</h3>
                <p className="text-muted-foreground text-lg mb-8">
                  Stay on track. Assign tasks and monitor project progress.
                </p>

                {/* Mockup: Task List */}
                <div className="bg-background/50 rounded-xl border border-border/50 backdrop-blur-sm shadow-inner p-2 space-y-2">
                  <div className="mockup-task flex items-center gap-3 p-2 rounded-lg bg-background border border-border/50">
                    <div className="w-4 h-4 rounded-full border-2 border-pink-500/50" />
                    <div className="flex-1">
                      <div className="text-xs font-medium">Color Grade</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Tomorrow
                      </div>
                    </div>
                  </div>
                  <div className="mockup-task flex items-center gap-3 p-2 rounded-lg bg-background border border-border/50 opacity-60">
                    <div className="w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium line-through text-muted-foreground">Rough Cut</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 6: Team Collaboration (Wide) */}
            <div className="feature-card feature-card-6 md:col-span-2 lg:col-span-2 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 group overflow-hidden relative h-full">
              <div className="grid md:grid-cols-2 gap-8 h-full items-center">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 text-indigo-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 tracking-tight">Team Collaboration</h3>
                  <p className="text-muted-foreground text-lg">
                    Work together. Invite team members and keep everyone aligned.
                  </p>
                </div>

                {/* Mockup: Team Avatars */}
                <div className="bg-background/50 rounded-xl border border-border/50 backdrop-blur-sm shadow-inner p-4 flex items-center justify-center gap-4 w-full">
                  <div className="flex -space-x-3">
                    <div className="mockup-avatar w-10 h-10 rounded-full bg-red-500 border-2 border-background" />
                    <div className="mockup-avatar w-10 h-10 rounded-full bg-blue-500 border-2 border-background" />
                    <div className="mockup-avatar w-10 h-10 rounded-full bg-green-500 border-2 border-background flex items-center justify-center text-xs font-bold text-white">+2</div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-medium">
                    Team Active
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Showcase Section */}
      <section id="workflow" ref={showcaseRef} className="py-24 bg-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How StudioFlow Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From raw footage to final payment, we've streamlined every step of your journey.
            </p>
          </div>

          <div className="relative">
            {/* Connecting Line */}
            <div className="workflow-line absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-green-500/20 -translate-y-1/2 hidden lg:block origin-left rounded-full" />

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
              {/* Step 1: Organize */}
              <div className="workflow-step bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 sm:p-8 relative group hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center mb-6 text-2xl font-bold shadow-lg shadow-blue-500/20 relative z-10 group-hover:scale-110 transition-transform">
                  1
                </div>
                <h3 className="text-xl font-bold mb-3">Organize Projects</h3>
                <p className="text-muted-foreground mb-6">
                  Create dedicated workspaces for each client. Upload assets, manage versions, and keep everything structured.
                </p>

                {/* Mockup: Folder Structure */}
                <div className="bg-background/80 rounded-xl p-4 border border-border/50 shadow-sm">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
                    <FolderKanban className="w-5 h-5 text-blue-500" />
                    <div className="text-xs font-medium text-muted-foreground">Project Files</div>
                  </div>
                  <div className="space-y-3">
                    <div className="workflow-file flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border/30">
                      <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2 w-24 bg-muted-foreground/20 rounded mb-1.5" />
                        <div className="h-1.5 w-12 bg-muted-foreground/10 rounded" />
                      </div>
                    </div>
                    <div className="workflow-file flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border/30 opacity-60">
                      <div className="w-8 h-8 rounded bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2 w-20 bg-muted-foreground/20 rounded mb-1.5" />
                        <div className="h-1.5 w-10 bg-muted-foreground/10 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Collaborate */}
              <div className="workflow-step bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 sm:p-8 relative group hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center mb-6 text-2xl font-bold shadow-lg shadow-purple-500/20 relative z-10 group-hover:scale-110 transition-transform">
                  2
                </div>
                <h3 className="text-xl font-bold mb-3">Client Review</h3>
                <p className="text-muted-foreground mb-6">
                  Share secure links with clients. They can view progress, leave time-stamped comments, and approve cuts.
                </p>

                {/* Mockup: Video Player & Comment */}
                <div className="bg-background/80 rounded-xl p-3 border border-border/50 shadow-sm relative overflow-hidden">
                  <div className="aspect-video bg-muted rounded-lg mb-3 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
                    <Play className="w-8 h-8 text-muted-foreground/30 fill-current" />

                    {/* Comment Bubble */}
                    <div className="workflow-user absolute bottom-2 right-2 bg-background/90 backdrop-blur border border-border/50 p-2 rounded-lg shadow-lg max-w-[120px]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 rounded-full bg-purple-500" />
                        <span className="text-[10px] font-bold">Client</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted-foreground/20 rounded mb-1" />
                      <div className="h-1.5 w-2/3 bg-muted-foreground/20 rounded" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <div className="h-2 w-24 bg-muted-foreground/20 rounded" />
                    <div className="flex -space-x-2">
                      <div className="workflow-user w-6 h-6 rounded-full bg-red-500 border-2 border-background" />
                      <div className="workflow-user w-6 h-6 rounded-full bg-blue-500 border-2 border-background" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Get Paid */}
              <div className="workflow-step md:col-span-2 lg:col-span-1 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 sm:p-8 relative group hover:border-green-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white flex items-center justify-center mb-6 text-2xl font-bold shadow-lg shadow-green-500/20 relative z-10 group-hover:scale-110 transition-transform">
                  3
                </div>
                <h3 className="text-xl font-bold mb-3">Get Paid</h3>
                <p className="text-muted-foreground mb-6">
                  Create professional invoices instantly. Accept payments via Razorpay directly through the portal.
                </p>

                {/* Mockup: Invoice Card */}
                <div className="bg-background/80 rounded-xl p-4 border border-border/50 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Amount Due</div>
                      <div className="text-lg font-bold">₹45,000</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Status</span>
                        <span className="text-green-500 font-medium">Processing</span>
                      </div>
                      <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                        <div className="workflow-payment bg-green-500 h-2 rounded-full w-full origin-left" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/50 p-2 rounded-lg">
                      <Shield className="w-3 h-3" />
                      Secured by Razorpay
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" ref={pricingRef} className="py-24 bg-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg">Start for free, upgrade as you grow.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="pricing-card p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/30 transition-all duration-300 h-full flex flex-col">
              <div className="mb-8">
                <h3 className="text-lg font-medium text-muted-foreground mb-2">Starter</h3>
                <div className="text-4xl font-bold">₹0<span className="text-base font-normal text-muted-foreground">/mo</span></div>
                <p className="text-sm text-muted-foreground mt-2">Perfect for freelancers just starting out.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {['5 Active Projects', 'Basic Invoicing', '1 Team Member', 'Community Support'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary" /> {item}
                  </li>
                ))}
              </ul>
              {!isSignedIn ? (
                <SignUpButton mode="modal" forceRedirectUrl="/dashboard/subscription">
                  <Button variant="outline" className="w-full mt-auto">Get Started</Button>
                </SignUpButton>
              ) : (
                <Button variant="outline" className="w-full mt-auto" onClick={() => navigate('/dashboard/subscription')}>Get Started</Button>
              )}
            </div>

            {/* Pro */}
            <div className="pricing-card p-6 sm:p-8 rounded-2xl border-2 border-primary bg-card shadow-xl relative h-full flex flex-col">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <div className="mb-8">
                <h3 className="text-lg font-medium text-primary mb-2">Pro</h3>
                <div className="text-4xl font-bold">₹1<span className="text-base font-normal text-muted-foreground">/mo</span></div>
                <p className="text-sm text-muted-foreground mt-2">For professional editors scaling up.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {['50 Active Projects', 'Advanced Invoicing', '5 Team Members'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary" /> {item}
                  </li>
                ))}
              </ul>
              {!isSignedIn ? (
                <SignUpButton mode="modal" forceRedirectUrl="/dashboard/subscription">
                  <Button className="w-full bg-primary hover:bg-primary/90 mt-auto">Subscribe</Button>
                </SignUpButton>
              ) : (
                <Button className="w-full bg-primary hover:bg-primary/90 mt-auto" onClick={() => navigate('/dashboard/subscription')}>Subscribe</Button>
              )}
            </div>

            {/* Studio */}
            <div className="pricing-card md:col-span-2 lg:col-span-1 p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/30 transition-all duration-300 h-full flex flex-col">
              <div className="mb-8">
                <h3 className="text-lg font-medium text-muted-foreground mb-2">Studio</h3>
                <div className="text-4xl font-bold">₹2<span className="text-base font-normal text-muted-foreground">/mo</span></div>
                <p className="text-sm text-muted-foreground mt-2">For agencies and production houses.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {['100 Active Projects', 'Unlimited Team', 'Advanced Invoicing', 'Priority Support'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary" /> {item}
                  </li>
                ))}
              </ul>
              {!isSignedIn ? (
                <SignUpButton mode="modal" forceRedirectUrl="/dashboard/subscription">
                  <Button variant="outline" className="w-full mt-auto">Subscribe</Button>
                </SignUpButton>
              ) : (
                <Button variant="outline" className="w-full mt-auto" onClick={() => navigate('/dashboard/subscription')}>Subscribe</Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <img src="/studioflowlogo.svg" alt="StudioFlow" className="h-6 w-auto hidden dark:block" />
              <img src="/studioflow-black.svg" alt="StudioFlow" className="h-6 w-auto block dark:hidden" />
            </div>
            <span className="text-sm text-muted-foreground">© 2024 StudioFlow. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms-conditions" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/contact-us" className="hover:text-foreground transition-colors">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
