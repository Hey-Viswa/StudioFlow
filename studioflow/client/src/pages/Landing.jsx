import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut, useAuth } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { FolderKanban, Users, Receipt, Play, Check, Sparkles, ArrowRight, Zap, Shield, Globe, Move, Layers, MousePointer2, MessageSquare, FileText, Download, CheckCircle2, ListTodo, Clock, Eye, Lock, BarChart3, Bell, RefreshCw, History, Layout, Folder, FileVideo } from 'lucide-react';
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
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isGatedLocked, setIsGatedLocked] = useState(true);
  const [activeRole, setActiveRole] = useState('editor');
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'client', text: 'Client approved cut', time: 'Just now', color: 'bg-rose-500' },
    { id: 2, type: 'system', text: 'Upload complete', time: '2m ago', color: 'bg-blue-500' }
  ]);
  const [storyboardOrder, setStoryboardOrder] = useState([1, 2, 3, 4]);
  const [invoiceStatus, setInvoiceStatus] = useState('pending');
  const [activityLogs, setActivityLogs] = useState([
     { id: 2, text: 'Invoice #1024 Paid', time: '2h ago', color: 'bg-green-500' }
  ]);
  
  // Feature Mockup States
  const [activeWorkspaceFile, setActiveWorkspaceFile] = useState(0);
  const [reviewStatus, setReviewStatus] = useState('pending');
  const [mainInvoiceStatus, setMainInvoiceStatus] = useState('pending');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Color Grade', time: 'Tomorrow', done: false, color: 'border-pink-500/50' },
    { id: 2, text: 'Rough Cut', time: 'Done', done: true, color: 'bg-pink-500' }
  ]);
  const [teamCount, setTeamCount] = useState(2);
  
  // Workflow Mockup States
  const [workflowActiveFile, setWorkflowActiveFile] = useState(0);
  const [workflowVideoPlaying, setWorkflowVideoPlaying] = useState(false);
  const [workflowPaymentStatus, setWorkflowPaymentStatus] = useState('processing'); // processing, paid

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
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
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
            StudioFlow <br className="hidden sm:block" />
            <span className="text-3xl sm:text-5xl lg:text-6xl block mt-2">Manage Projects. Master Your Flow.</span>
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
                    {[0, 1, 2, 3].map(i => (
                      <div 
                        key={i} 
                        className={`flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer transition-colors ${activeWorkspaceFile === i ? 'bg-primary/10' : 'hover:bg-muted/20'}`}
                        onClick={() => setActiveWorkspaceFile(i)}
                      >
                        <div className={`w-4 h-4 rounded ${activeWorkspaceFile === i ? 'bg-primary/40' : 'bg-muted-foreground/20'}`} />
                        <div className={`h-3 w-16 rounded ${activeWorkspaceFile === i ? 'bg-primary/20' : 'bg-muted-foreground/10'}`} />
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
                      <div className="h-6 sm:h-8 w-16 sm:w-24 bg-primary rounded shadow-lg shadow-primary/20 hover:scale-105 transition-transform cursor-pointer" />
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
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
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
                    Keep every cut, asset, and version organized. Never lose a file again.
                  </p>
                </div>

            {/* Card 1: Centralized Workspace (Wide) */}
            <div className="feature-card feature-card-1 md:col-span-2 lg:col-span-2 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 group overflow-hidden relative h-full">
              <div className="grid md:grid-cols-2 gap-8 h-full items-center">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-500">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 tracking-tight">Centralized Workspace</h3>
                  <p className="text-muted-foreground text-lg">
                    Keep every cut, asset, and version organized. Never lose a file again.
                  </p>
                </div>

                {/* Mockup: File Manager UI */}
                <div className="bg-background/80 rounded-xl border border-border/50 backdrop-blur-sm shadow-inner overflow-hidden w-full min-h-[240px] flex flex-col relative">
                  {/* Mock Window Header */}
                  <div className="p-3 border-b border-border/50 flex items-center justify-between bg-muted/30">
                     <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                     </div>
                     <div className="text-[10px] items-center gap-1.5 flex text-muted-foreground bg-background/50 px-2 py-0.5 rounded-md border border-border/20 shadow-sm">
                        <Folder className="w-3 h-3" />
                        <span>/ Project / Assets</span>
                     </div>
                     <div className="w-4" /> {/* Spacer */}
                  </div>

                  <div className="flex flex-1 overflow-hidden">
                     {/* Mock Sidebar */}
                     <div className="w-16 border-r border-border/50 bg-muted/10 hidden sm:flex flex-col items-center py-4 gap-4">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><Folder className="w-4 h-4" /></div>
                        <div className="p-2 rounded-lg text-muted-foreground hover:bg-muted"><Clock className="w-4 h-4" /></div>
                        <div className="p-2 rounded-lg text-muted-foreground hover:bg-muted"><Users className="w-4 h-4" /></div>
                     </div>

                     {/* Main Content */}
                     <div className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
                        {[
                           { name: 'Final_Cut_v2.mp4', size: '2.4 GB', date: 'Just now', type: 'video' },
                           { name: 'Rough_Cut_v1.mp4', size: '1.8 GB', date: '2h ago', type: 'video' },
                           { name: 'B-Roll_Assets.zip', size: '450 MB', date: 'Yesterday', type: 'zip' },
                           { name: 'Audio_Mix_Master.wav', size: '120 MB', date: '2d ago', type: 'audio' },
                        ].map((file, i) => (
                           <div 
                              key={i}
                              className={`group/file flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 cursor-pointer ${activeWorkspaceFile === i ? 'bg-blue-500/5 border-blue-500/30 shadow-sm' : 'bg-card/50 border-border/40 hover:bg-muted/50 hover:border-border/80'}`}
                              onClick={() => setActiveWorkspaceFile(i)}
                           >
                              <div className="flex items-center gap-3 overflow-hidden">
                                 <div className={`p-2 rounded-lg ${activeWorkspaceFile === i ? 'bg-blue-500/20 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                                    {file.type === 'video' ? <FileVideo className="w-4 h-4" /> : file.type === 'zip' ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                 </div>
                                 <div className="min-w-0">
                                    <div className={`text-xs font-medium truncate ${activeWorkspaceFile === i ? 'text-blue-600' : 'text-foreground'}`}>{file.name}</div>
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                                       <span>{file.size}</span>
                                       <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
                                       <span>{file.date}</span>
                                    </div>
                                 </div>
                              </div>
                              {activeWorkspaceFile === i && (
                                 <div className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] text-blue-600 font-medium whitespace-nowrap animate-in fade-in zoom-in duration-300">
                                    Selected
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Streamlined Reviews (Tall) */}
            <div className="feature-card feature-card-2 md:col-span-1 lg:col-span-1 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group overflow-hidden relative flex flex-col justify-between h-full min-h-[400px]">
              <div className="relative z-10 flex-1 flex flex-col h-full">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-500">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Streamlined Reviews</h3>
                <p className="text-muted-foreground text-lg mb-8">
                  Share secure links. Clients can view progress and approve cuts.
                </p>

                {/* Mockup: Comment/Approve */}
                <div className="bg-background/50 rounded-xl border border-border/50 backdrop-blur-sm shadow-inner p-4 mt-auto">
                  <div className="mockup-comment flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0" />
                    <div className="flex-1 bg-background rounded-lg p-3 text-xs border border-border/50 shadow-sm relative">
                      <div className="flex justify-between items-start mb-1">
                         <p className="font-medium">Client</p>
                         <span className="text-[9px] text-muted-foreground">10:42 AM</span>
                      </div>
                      <p className="text-muted-foreground">{reviewStatus === 'approved' ? 'Looks perfect! Approved.' : 'Make the logo pop?'}</p>
                      {reviewStatus === 'approved' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button 
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg transition-all duration-300 ${reviewStatus === 'approved' ? 'bg-green-500 text-white cursor-default' : 'bg-background border border-green-500 text-green-500 hover:bg-green-500 hover:text-white'}`}
                      onClick={() => setReviewStatus('approved')}
                    >
                      {reviewStatus === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                      {reviewStatus === 'approved' ? 'Approved' : 'Approve'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Integrated Invoicing (Tall) */}
            <div className="feature-card feature-card-3 md:col-span-1 lg:col-span-1 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group overflow-hidden relative flex flex-col justify-between h-full min-h-[400px]">
              <div className="relative z-10 flex-1 flex flex-col h-full">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6 text-green-500">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Integrated Invoicing</h3>
                <p className="text-muted-foreground text-lg mb-8">
                  Create professional invoices. Track payments and get paid faster.
                </p>

                {/* Mockup: Invoice Row */}
                <div className="bg-background/50 rounded-xl border border-border/50 backdrop-blur-sm shadow-inner p-2 space-y-2 mt-auto">
                  <div 
                    className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/50 shadow-sm cursor-pointer hover:border-green-500/50 transition-colors"
                    onClick={() => setMainInvoiceStatus(mainInvoiceStatus === 'paid' ? 'pending' : 'paid')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-500 ${mainInvoiceStatus === 'paid' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>₹</div>
                      <div>
                        <div className="text-xs font-bold">#1024</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold">₹45k</div>
                      <div className={`mockup-invoice-badge text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mt-1 transition-colors duration-300 ${mainInvoiceStatus === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        {mainInvoiceStatus === 'paid' ? 'Paid' : 'Pending'}
                      </div>
                    </div>
                  </div>
                  {/* Decorative row */}
                   <div className="flex items-center justify-between p-3 rounded-lg bg-card/60 border border-border/40 opacity-70">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">₹</div>
                        <div className="text-xs font-bold">#1023</div>
                     </div>
                     <div className="text-right">
                       <div className="text-xs font-bold">₹12k</div>
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
                <div className="bg-background/50 rounded-xl border border-border/50 backdrop-blur-sm shadow-inner p-6 flex flex-col justify-center w-full relative overflow-hidden h-full min-h-[160px]">
                   <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-orange-500/10 text-orange-500">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Final_Deliverables.zip</div>
                        <div className="text-xs text-muted-foreground">2.4 GB • Ready</div>
                      </div>
                    </div>
                    <button 
                      className={`mockup-download-btn p-3 rounded-full shadow-lg transition-all duration-300 ${downloadProgress === 100 ? 'bg-green-500 text-white hover:scale-105' : 'bg-primary text-primary-foreground hover:scale-110'}`}
                      onClick={(e) => {
                         e.stopPropagation();
                         if (downloadProgress === 100 || downloadProgress > 0) return;
                         let p = 0;
                         const int = setInterval(() => {
                            p += 5;
                            setDownloadProgress(p);
                            if (p >= 100) clearInterval(int);
                         }, 50);
                      }}
                    >
                      {downloadProgress === 100 ? <Check className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                    </button>
                  </div>
                  {/* Progress Bar */}
                  {downloadProgress > 0 && (
                     <div className="w-full h-1.5 bg-muted rounded-full mt-6 overflow-hidden relative">
                        <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-75" style={{ width: `${downloadProgress}%` }} />
                     </div>
                  )}
                  {downloadProgress === 100 && (
                      <div className="absolute inset-0 bg-green-500/5 flex items-center justify-center pointer-events-none animate-in fade-in">
                          <div className="text-green-600 font-bold text-lg bg-background/90 px-5 py-3 rounded-full shadow-lg border border-green-200/50">Downloaded!</div>
                      </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 5: Task Management (Tall) */}
            <div className="feature-card feature-card-5 md:col-span-2 lg:col-span-1 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group overflow-hidden relative flex flex-col justify-between h-full min-h-[400px]">
              <div className="relative z-10 flex-1 flex flex-col h-full">
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-6 text-pink-500">
                  <ListTodo className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Task Management</h3>
                <p className="text-muted-foreground text-lg mb-8">
                  Stay on track. Assign tasks and monitor project progress.
                </p>

                {/* Mockup: Interactive Task List */}
                <div className="bg-background/80 rounded-xl border border-border/50 backdrop-blur-sm shadow-inner p-4 flex flex-col gap-3 mt-auto">
                  {tasks.map((task) => (
                    <div 
                      key={task.id}
                      className={`group/task flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 cursor-pointer ${task.done ? 'bg-muted/30 border-border/40' : 'bg-card border-border/60 hover:border-pink-500/50 hover:shadow-sm'}`}
                      onClick={() => setTasks(tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t))}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${task.done ? 'bg-pink-500 border-pink-500' : 'border-pink-500/50 bg-background'}`}>
                         {task.done && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium transition-all truncate ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.text}</div>
                        {!task.done && (
                           <div className="flex items-center gap-2 mt-1">
                             <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${task.id === 1 ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {task.id === 1 ? 'High' : 'Medium'}
                             </span>
                             <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                               <Clock className="w-3 h-3" /> {task.time}
                             </div>
                           </div>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-[8px] text-white flex items-center justify-center border-2 border-background shadow-sm ${task.done ? 'opacity-50' : ''}`}>
                         {task.id === 1 ? 'JD' : 'AL'}
                      </div>
                    </div>
                  ))}
                  
                  {/* Simulated Input */}
                   <div className="relative mt-2">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                         <span className="text-muted-foreground text-md">+</span>
                      </div>
                      <div className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-dashed border-border text-muted-foreground bg-muted/20 hover:bg-muted/40 transition-colors cursor-text">
                         Add a new task...
                      </div>
                      <div className="absolute inset-y-0 right-2 flex items-center">
                         <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground border border-border">↵</div>
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
                <div className="bg-background/50 rounded-xl border border-border/50 backdrop-blur-sm shadow-inner p-4 flex flex-col items-center justify-center gap-4 w-full">
                  <div 
                     className="flex -space-x-3 cursor-pointer hover:scale-105 transition-transform"
                     onClick={() => setTeamCount(c => c + 1)}
                  >
                    <div className="mockup-avatar w-10 h-10 rounded-full bg-red-500 border-2 border-background shadow-sm" />
                    <div className="mockup-avatar w-10 h-10 rounded-full bg-blue-500 border-2 border-background shadow-sm" />
                    <div className="mockup-avatar w-10 h-10 rounded-full bg-green-500 border-2 border-background shadow-sm" />
                    <div className="mockup-avatar w-10 h-10 rounded-full bg-indigo-500 border-2 border-background flex items-center justify-center text-xs font-bold text-white shadow-sm hover:overflow-visible overflow-hidden relative group/avatar">
                        +{teamCount}
                        <div className="absolute -top-8 bg-indigo-500 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity whitespace-nowrap">
                           Add Member
                        </div>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-medium animate-pulse">
                    {teamCount + 3} Active Members
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Micro Features Grid */}

              {/* Micro Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 auto-rows-[320px] mt-6">
                
                {/* 1. Instant Previews (Large, Span 2) */}
                <div 
                  className="col-span-1 md:col-span-2 rounded-3xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between cursor-pointer"
                  onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                >
                  <div className="p-6 relative z-10 w-full h-full pointer-events-none">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform duration-300">
                        <Eye className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-lg">Instant Previews</h4>
                    </div>
                    <p className="text-sm text-muted-foreground w-2/3">Play 4K video & audio instantly. No downloads required.</p>
                  </div>
                  
                  {/* Flush Mockup */}
                  <div className="relative w-full h-[180px] mt-auto bg-background/50 border-t border-border/50 group-hover:bg-background/80 transition-colors duration-500">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`w-16 h-16 rounded-full bg-blue-500/90 text-white flex items-center justify-center shadow-2xl transition-all duration-300 z-20 ${isPreviewPlaying ? 'scale-90 bg-blue-600' : 'group-hover:scale-110'}`}>
                        {isPreviewPlaying ? <div className="w-5 h-5 bg-white rounded-sm" /> : <Play className="w-6 h-6 ml-1 fill-current" />}
                      </div>
                      {/* Video Progress Bar Animation */}
                      <div className="absolute bottom-0 left-0 h-1 bg-blue-500/20 w-full">
                        <div className={`h-full bg-blue-500 transition-all duration-[2000ms] ease-linear rounded-r-full ${isPreviewPlaying ? 'w-full' : 'w-[30%] group-hover:w-[40%]'}`} />
                      </div>
                    </div>
                    {/* Background Pattern or Frame */}
                    {!isPreviewPlaying && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent opacity-50" />}
                    {isPreviewPlaying && <div className="absolute inset-0 bg-blue-950/10 animate-pulse" />}
                  </div>
                </div>

                {/* 2. Gated Delivery (Small) */}
                <div 
                   className="col-span-1 rounded-3xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-500 group relative overflow-hidden flex flex-col cursor-pointer"
                   onClick={() => setIsGatedLocked(!isGatedLocked)}
                >
                  <div className="p-6 z-10 pointer-events-none">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:rotate-12 transition-transform duration-300">
                        <Lock className={`w-5 h-5 transition-all ${!isGatedLocked ? 'text-green-500' : ''}`} />
                      </div>
                      <h4 className="font-semibold">Gated Delivery</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Lock files until payment.</p>
                  </div>
                  
                  <div className="flex-1 relative flex items-center justify-center p-4 pt-0">
                    <div className={`bg-background border px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shadow-lg transition-all duration-300 ${isGatedLocked ? 'border-amber-500/20 text-amber-500' : 'border-green-500/20 text-green-500 scale-110'}`}>
                      {isGatedLocked ? <Lock className="w-3 h-3 group-hover:animate-pulse" /> : <div className="w-3 h-3 rounded-full bg-green-500" />}
                      <span>{isGatedLocked ? 'Payment Locked' : 'Unlocked'}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Smart Notifications (Small) */}
                <div 
                   className="col-span-1 rounded-3xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-500 group relative overflow-hidden flex flex-col cursor-pointer"
                   onClick={() => {
                      const newNotif = { id: Date.now(), type: 'system', text: 'New comment added', time: 'Just now', color: 'bg-indigo-500' };
                      setNotifications(prev => [newNotif, ...prev].slice(0, 3));
                   }}
                >
                  <div className="p-6 z-10 pointer-events-none">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 group-hover:animate-swing origin-top">
                        <Bell className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold">Smart Alerts</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Filter the noise.</p>
                  </div>
                  
                  <div className="flex-1 relative p-4 pt-0 flex flex-col gap-2 justify-end mask-linear-fade overflow-hidden">
                    {notifications.map((notif, i) => (
                      <div key={notif.id} className="bg-background border border-border/50 p-3 rounded-xl shadow-sm animate-in slide-in-from-bottom-2 fade-in duration-300" style={{ opacity: 1 - (i * 0.3), transform: `scale(${1 - (i * 0.05)}) translateY(${i * 4}px)` }}>
                           <div className="flex items-center gap-2 text-xs">
                            <div className={`w-2 h-2 rounded-full ${notif.color} animate-pulse`} />
                            <span className="truncate">{notif.text}</span>
                           </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Revenue Analytics (Large, Span 2) */}
                <div className="col-span-1 md:col-span-2 rounded-3xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-500 group relative overflow-hidden flex flex-col order-first lg:order-none cursor-crosshair">
                   <div className="p-6 relative z-10 pointer-events-none">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-lg">Revenue Analytics</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Visualize your income and project growth in real-time.</p>
                  </div>

                  <div className="mt-auto px-6 h-[140px] flex items-end justify-between gap-2 pb-6">
                    {[30, 50, 40, 70, 50, 90, 80, 40, 60].map((h, i) => (
                      <div key={i} className="w-full bg-green-500/20 rounded-t-sm h-full relative group-hover:bg-green-500/30 transition-colors overflow-hidden group/bar">
                        <div 
                          className="absolute bottom-0 left-0 w-full bg-green-500 rounded-t-sm transition-all duration-[1000ms] ease-out group-hover:opacity-100 group-hover/bar:bg-green-400"
                          style={{ height: `${h}%`, transitionDelay: `${i * 50}ms` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Role Access (Small) */}
                <div 
                   className="col-span-1 rounded-3xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-500 group relative overflow-hidden flex flex-col cursor-pointer"
                   onClick={() => setActiveRole(activeRole === 'editor' ? 'viewer' : 'editor')}
                >
                  <div className="p-6 z-10 pointer-events-none">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                        <Shield className="w-5 h-5" />
                      </div>
                       <h4 className="font-semibold">Role Access</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Control who sees what.</p>
                  </div>
                  
                  <div className="flex-1 px-6 pb-6 pt-2 space-y-3">
                     <div className={`flex items-center justify-between p-2 rounded-lg border transition-colors duration-300 ${activeRole === 'editor' ? 'bg-background border-purple-500 shadow-sm' : 'bg-background/50 border-border/50 opacity-60'}`}>
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] text-purple-500 font-bold">ED</div>
                           <span className="text-xs font-medium">Editor</span>
                        </div>
                        <div className="w-8 h-4 rounded-full bg-green-500/20 relative">
                           <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-green-500 shadow-sm transition-all duration-300 ${activeRole === 'editor' ? 'right-0.5' : 'left-0.5 bg-muted-foreground'}`} />
                        </div>
                     </div>
                     <div className={`flex items-center justify-between p-2 rounded-lg border transition-colors duration-300 ${activeRole === 'viewer' ? 'bg-background border-orange-500 shadow-sm' : 'bg-background/50 border-border/50 opacity-60'}`}>
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] text-orange-500 font-bold">CL</div>
                           <span className="text-xs font-medium">Client</span>
                        </div>
                        <div className="w-8 h-4 rounded-full bg-green-500/20 relative">
                           <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-green-500 shadow-sm transition-all duration-300 ${activeRole === 'viewer' ? 'right-0.5' : 'left-0.5 bg-muted-foreground'}`} />
                        </div>
                     </div>
                  </div>
                </div>

                {/* 6. Storyboards (Small) */}
                <div 
                   className="col-span-1 rounded-3xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-500 group relative overflow-hidden flex flex-col cursor-pointer"
                   onClick={() => setStoryboardOrder([...storyboardOrder.sort(() => Math.random() - 0.5)])}
                >
                  <div className="p-6 z-10 pointer-events-none">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500 group-hover:rotate-90 transition-transform duration-500">
                        <Layout className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold">Storyboards</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Plan before you cut.</p>
                  </div>
                  
                  <div className="flex-1 p-4 pt-0 grid grid-cols-2 gap-2 opacity-90 group-hover:opacity-100 transition-opacity duration-300">
                     {storyboardOrder.slice(0, 4).map((id, i) => (
                       <div 
                         key={id} 
                         className={`rounded-lg border border-border/50 bg-background/50 flex flex-col items-center justify-center p-2 relative overflow-hidden transition-all duration-500 hover:scale-105 ${i === 0 ? 'border-cyan-500/50 bg-cyan-500/5' : ''}`}
                         style={{ transitionDelay: `${i * 50}ms` }}
                       >
                          <div className={`w-full aspect-video rounded-sm mb-1 ${i === 0 ? 'bg-cyan-500/20' : 'bg-muted/50'}`} />
                          <div className="w-1/2 h-1 bg-muted rounded-full" />
                       </div>
                     ))}
                  </div>
                </div>
                
                 {/* 7. Activity Logs (Large, Span 2) */}
                <div 
                   className="col-span-1 md:col-span-2 rounded-3xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-500 group relative overflow-hidden flex flex-col cursor-pointer"
                   onClick={() => {
                      const actions = ['Project Created', 'File Uploaded', 'Comment Added', 'Invoice Paid', 'User Invited'];
                      const newLog = { id: Date.now(), text: actions[Math.floor(Math.random() * actions.length)], time: 'Just now', color: 'bg-indigo-500' };
                      setActivityLogs(prev => [newLog, ...prev].slice(0, 3));
                   }}
                >
                  <div className="p-6 z-10 pointer-events-none">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-slate-500/10 text-slate-500 group-hover:rotate-[360deg] transition-transform duration-700 ease-in-out">
                         <History className="w-5 h-5" />
                      </div>
                       <h4 className="font-semibold text-lg">Activity Logs</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Track every action, update, and deletion in real-time.</p>
                  </div>
                   
                   <div className="mt-auto p-6 pt-0 space-y-3">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 animate-in slide-in-from-left-4 fade-in duration-300">
                           <div className={`mt-1 w-2 h-2 rounded-full ${log.color} ring-4 ring-white/5`} />
                           <div className="flex-1">
                              <div className="text-xs font-medium">{log.text}</div>
                              <div className="text-[10px] text-muted-foreground">{log.time}</div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                 {/* 8. Auto-Invoicing (Large, Span 2) */}
                 <div 
                    className="col-span-1 md:col-span-2 rounded-3xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-500 group relative overflow-hidden flex flex-col cursor-pointer"
                    onClick={() => setInvoiceStatus(invoiceStatus === 'pending' ? 'paid' : 'pending')}
                 >
                    <div className="flex h-full">
                       <div className="p-6 flex-1 z-10 pointer-events-none">
                          <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:animate-spin-slow">
                                <RefreshCw className="w-5 h-5" />
                              </div>
                              <h4 className="font-semibold text-lg">Auto-Invoicing</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">Recurring billing on autopilot.</p>
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300 ${invoiceStatus === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                              {invoiceStatus === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />} 
                              {invoiceStatus === 'paid' ? 'Paid Successfully' : 'Recurring Monthly'}
                          </div>
                       </div>
                       
                       <div className="w-1/3 bg-background/50 border-l border-border/50 flex flex-col items-center justify-center gap-2 p-4 group-hover:w-1/2 transition-all duration-500 relative overflow-hidden">
                          {invoiceStatus === 'paid' && <div className="absolute inset-0 bg-green-500/10 animate-pulse" />}
                          <div className="text-2xl font-bold">₹40k</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Next Payout</div>
                          <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-2">
                             <div className={`h-full transition-all duration-1000 ${invoiceStatus === 'paid' ? 'bg-green-500 w-full' : 'bg-indigo-500 w-3/4'}`} />
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
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How StudioFlow Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From raw footage to final payment, we've streamlined every step of your journey.
            </p>
          </div>

          <div className="relative pt-10">
            {/* Minimal Timeline Workflow */}
            <div className="relative max-w-4xl mx-auto">
              {/* Central Timeline Line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-green-500/50 md:-translate-x-1/2" />

              <div className="space-y-24">
                {/* Step 1: Organize */}
                <div className="relative grid md:grid-cols-2 gap-8 md:gap-16 items-center group">
                  <div className="md:text-right order-2 md:order-1 relative z-10 pl-12 md:pl-0">
                    <h3 className="text-2xl font-bold mb-3 flex items-center md:justify-end gap-3 text-blue-500">
                      <span className="md:hidden w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-500/20">1</span>
                      Organize
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm ml-auto">
                      Dedicated workspaces for every project. Keep files, versions, and assets in perfect order.
                    </p>
                    
                    {/* Minimal Interactive File List */}
                    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm inline-block w-full max-w-sm text-left">
                       <div className="p-2 space-y-1">
                          {['Raw_Footage', 'Audio_Assets', 'Graphics', 'Exports'].map((folder, i) => (
                             <div 
                                key={i} 
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 ${workflowActiveFile === i ? 'bg-blue-500/10 text-blue-600' : 'hover:bg-muted/50'}`}
                                onClick={() => setWorkflowActiveFile(i)}
                             >
                                <Folder className={`w-4 h-4 ${workflowActiveFile === i ? 'fill-current' : 'text-muted-foreground'}`} />
                                <span className="text-xs font-medium flex-1">{folder}</span>
                                {workflowActiveFile === i && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                             </div>
                          ))}
                       </div>
                    </div>
                  </div>
                  
                  {/* Center Dot */}
                  <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-background border-2 border-blue-500 z-20 shadow-[0_0_0_4px_rgba(59,130,246,0.1)] hidden md:block">
                     <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20" />
                  </div>

                  <div className="order-1 md:order-2 pl-12 md:pl-0 hidden md:block opacity-20 pointer-events-none grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
                     <div className="aspect-[4/3] bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl border border-blue-500/20 p-4 transform rotate-3 group-hover:rotate-0 transition-transform">
                        <div className="w-full h-full bg-background/50 backdrop-blur rounded-xl border border-white/10 shadow-inner flex items-center justify-center">
                           <FolderKanban className="w-16 h-16 text-blue-500/50" />
                        </div>
                     </div>
                  </div>
                </div>

                {/* Step 2: Review */}
                <div className="relative grid md:grid-cols-2 gap-8 md:gap-16 items-center group">
                   <div className="md:order-1 relative hidden md:block opacity-20 pointer-events-none grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
                      <div className="aspect-[4/3] bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20 p-4 transform -rotate-3 group-hover:rotate-0 transition-transform">
                        <div className="w-full h-full bg-background/50 backdrop-blur rounded-xl border border-white/10 shadow-inner flex items-center justify-center">
                           <Play className="w-16 h-16 text-purple-500/50" />
                        </div>
                     </div>
                   </div>

                  {/* Center Dot */}
                  <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-background border-2 border-purple-500 z-20 shadow-[0_0_0_4px_rgba(168,85,247,0.1)] hidden md:block">
                     <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-20" />
                  </div>

                  <div className="md:order-2 relative z-10 pl-12 md:pl-0">
                    <h3 className="text-2xl font-bold mb-3 flex items-center gap-3 text-purple-500">
                      <span className="md:hidden w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-purple-500/20">2</span>
                      Review
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm">
                       Share secure links. Clients leave time-stamped comments directly on the video.
                    </p>

                    {/* Minimal Video Player */}
                    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm w-full max-w-sm cursor-pointer group/player" onClick={() => setWorkflowVideoPlaying(!workflowVideoPlaying)}>
                       <div className="aspect-video bg-muted relative flex items-center justify-center overflow-hidden">
                          {workflowVideoPlaying ? (
                             <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
                                <div className="w-full h-0.5 bg-purple-500/30 w-3/4 max-w-[200px] overflow-hidden rounded-full">
                                   <div className="h-full bg-purple-500 w-1/3 animate-[loading_2s_linear_infinite]" />
                                </div>
                             </div>
                          ) : (
                             <>
                                <div className="p-3 rounded-full bg-white/10 backdrop-blur group-hover/player:scale-110 transition-transform">
                                   <Play className="w-6 h-6 text-white fill-current ml-0.5" />
                                </div>
                                <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] text-white">4k • 24fps</div>
                             </>
                          )}
                       </div>
                       <div className="p-3 bg-card flex items-center gap-3 border-t border-border/50">
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] text-purple-500 font-bold">CL</div>
                          <div className="text-xs text-muted-foreground">"Can we cut this 2 frames earlier?"</div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Pay */}
                <div className="relative grid md:grid-cols-2 gap-8 md:gap-16 items-center group">
                  <div className="md:text-right order-2 md:order-1 relative z-10 pl-12 md:pl-0">
                    <h3 className="text-2xl font-bold mb-3 flex items-center md:justify-end gap-3 text-green-500">
                      <span className="md:hidden w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-green-500/20">3</span>
                      Get Paid
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm ml-auto">
                      Automated invoicing with Razorpay integration. Get paid instantly upon approval.
                    </p>

                    {/* Minimal Invoice */}
                    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm inline-block w-full max-w-sm text-left relative">
                       <div className="p-4">
                          <div className="flex justify-between items-center mb-4">
                             <div className="text-sm font-medium">Invoice #1024</div>
                             <div className="text-sm font-bold text-green-600">₹45,000</div>
                          </div>
                          <button 
                             className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${workflowPaymentStatus === 'paid' ? 'bg-green-100 text-green-700 cursor-default' : 'bg-primary text-primary-foreground hover:opacity-90'}`}
                             onClick={() => setWorkflowPaymentStatus('paid')}
                             disabled={workflowPaymentStatus === 'paid'}
                          >
                             {workflowPaymentStatus === 'paid' ? 'Paid via Razorpay' : 'Pay Now'}
                          </button>
                       </div>
                       {workflowPaymentStatus === 'paid' && (
                          <div className="absolute inset-0 bg-green-500/5 flex items-center justify-center animate-in fade-in">
                             <CheckCircle2 className="w-8 h-8 text-green-600 drop-shadow-sm" />
                          </div>
                       )}
                       <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded w-fit mt-3 mx-auto md:mx-0">
                          <Shield className="w-3 h-3" />
                          <span className="font-medium">Secured by Razorpay</span>
                       </div>
                    </div>
                  </div>

                  {/* Center Dot */}
                  <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-background border-2 border-green-500 z-20 shadow-[0_0_0_4px_rgba(34,197,94,0.1)] hidden md:block">
                     <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20" />
                  </div>

                  <div className="order-1 md:order-2 pl-12 md:pl-0 hidden md:block opacity-20 pointer-events-none grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
                     <div className="aspect-[4/3] bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl border border-green-500/20 p-4 transform rotate-3 group-hover:rotate-0 transition-transform">
                        <div className="w-full h-full bg-background/50 backdrop-blur rounded-xl border border-white/10 shadow-inner flex items-center justify-center">
                           <Receipt className="w-16 h-16 text-green-500/50" />
                        </div>
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

        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
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
