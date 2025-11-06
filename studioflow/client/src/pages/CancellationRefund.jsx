import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, XCircle, RefreshCw, Clock, CheckCircle, AlertTriangle, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';

export default function CancellationRefund() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Cancellation & Refund Policy - StudioFlow';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'StudioFlow Cancellation and Refund Policy - Learn about subscription cancellation, refund eligibility, and processing timelines.');
    }
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Cancellation & Refund Policy</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/terms-conditions')}>
              Terms
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/privacy-policy')}>
              Privacy
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/contact-us')}>
              Contact
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl py-12 px-4">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-1">
              <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">On This Page</h3>
              <nav className="space-y-1">
                {[
                  { id: 'overview', label: 'Policy Overview' },
                  { id: 'cancellation', label: 'Cancellation Process' },
                  { id: 'what-happens', label: 'After Cancellation' },
                  { id: 'refund-eligibility', label: 'Refund Eligibility' },
                  { id: 'refund-process', label: 'Refund Process' },
                  { id: 'processing-time', label: 'Processing Time' },
                  { id: 'non-refundable', label: 'Non-Refundable Cases' },
                  { id: 'contact', label: 'Need Help?' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="block w-full text-left text-sm py-2 px-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Overview */}
            <Card id="overview">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Policy Overview
                </CardTitle>
                <CardDescription>
                  Last updated: November 6, 2025
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  At StudioFlow, we want you to be completely satisfied with our service. This Cancellation and Refund Policy 
                  explains how to cancel your subscription and when you may be eligible for a refund.
                </p>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> We offer a 7-day money-back guarantee for new subscribers. 
                    You can request a full refund within 7 days of your first payment with no questions asked.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Cancellation Process */}
            <Card id="cancellation">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-primary" />
                  How to Cancel Your Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Cancellation Steps</h3>
                  <ol className="space-y-3 text-muted-foreground ml-4">
                    <li className="flex gap-3">
                      <span className="font-semibold text-foreground min-w-[24px]">1.</span>
                      <span>Log in to your StudioFlow account</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-foreground min-w-[24px]">2.</span>
                      <span>Navigate to <strong className="text-foreground">Settings</strong> → <strong className="text-foreground">Subscription</strong></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-foreground min-w-[24px]">3.</span>
                      <span>Click on <strong className="text-foreground">"Cancel Subscription"</strong> button</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-foreground min-w-[24px]">4.</span>
                      <span>Confirm your cancellation when prompted</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-foreground min-w-[24px]">5.</span>
                      <span>You'll receive a confirmation email within minutes</span>
                    </li>
                  </ol>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Alternative Method</h3>
                  <p className="text-muted-foreground">
                    If you experience any issues canceling through your account, you can contact our support team at{' '}
                    <a href="mailto:support@studioflow.studio" className="text-primary hover:underline">
                      support@studioflow.studio
                    </a>{' '}
                    with your account email and we'll process the cancellation for you within 24 hours.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* What Happens After Cancellation */}
            <Card id="what-happens">
              <CardHeader>
                <CardTitle>What Happens After You Cancel?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-blue-500/10 border-blue-500/50">
                  <AlertDescription className="text-blue-400">
                    <strong>Good News:</strong> Your subscription remains active until the end of your current billing period. 
                    You'll continue to have access to all paid features until then.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="font-semibold">Immediate Effects:</h3>
                  <ul className="space-y-2 text-muted-foreground ml-4">
                    <li>• <strong className="text-foreground">Auto-renewal is disabled</strong> - You won't be charged again</li>
                    <li>• <strong className="text-foreground">Access continues</strong> - You keep all paid features until period ends</li>
                    <li>• <strong className="text-foreground">Confirmation email sent</strong> - You'll receive cancellation confirmation</li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">When Your Billing Period Ends:</h3>
                  <ul className="space-y-2 text-muted-foreground ml-4">
                    <li>• <strong className="text-foreground">Account downgraded to Starter (Free)</strong></li>
                    <li>• <strong className="text-foreground">Project limit reduced to 5</strong> - Additional projects will be archived</li>
                    <li>• <strong className="text-foreground">Premium features disabled:</strong>
                      <ul className="ml-6 mt-2 space-y-1">
                        <li>- Real-time collaboration features</li>
                        <li>- Advanced analytics</li>
                        <li>- Priority support</li>
                        <li>- Additional team member slots</li>
                      </ul>
                    </li>
                    <li>• <strong className="text-foreground">Archived projects preserved</strong> - Your data is safe and can be restored if you upgrade again</li>
                  </ul>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>Note:</strong> You can reactivate your subscription at any time to restore full access to your projects and premium features.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Refund Eligibility */}
            <Card id="refund-eligibility">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Refund Eligibility
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">You Are Eligible for a Refund If:</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <h4 className="font-semibold text-green-400 mb-2">✓ 7-Day Money-Back Guarantee</h4>
                      <p className="text-sm text-muted-foreground">
                        You are a <strong className="text-foreground">new subscriber</strong> and request a refund within <strong className="text-foreground">7 days of your first payment</strong>. 
                        No questions asked, full refund guaranteed.
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <h4 className="font-semibold text-green-400 mb-2">✓ Service Unavailability</h4>
                      <p className="text-sm text-muted-foreground">
                        StudioFlow was unavailable for <strong className="text-foreground">more than 48 consecutive hours</strong> due to technical issues on our end, 
                        and you were unable to access essential features.
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <h4 className="font-semibold text-green-400 mb-2">✓ Billing Error</h4>
                      <p className="text-sm text-muted-foreground">
                        You were <strong className="text-foreground">charged incorrectly</strong> or <strong className="text-foreground">double-charged</strong> due to a system error.
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <h4 className="font-semibold text-green-400 mb-2">✓ Unauthorized Charge</h4>
                      <p className="text-sm text-muted-foreground">
                        You were charged after canceling your subscription, or the charge was unauthorized.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Refund Process */}
            <Card id="refund-process">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  How to Request a Refund
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Refund Request Process</h3>
                  <ol className="space-y-3 text-muted-foreground ml-4">
                    <li className="flex gap-3">
                      <span className="font-semibold text-foreground min-w-[24px]">1.</span>
                      <span>Email us at <a href="mailto:support@studioflow.studio" className="text-primary hover:underline">support@studioflow.studio</a></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-foreground min-w-[24px]">2.</span>
                      <span>Include the subject line: <strong className="text-foreground">"Refund Request"</strong></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-foreground min-w-[24px]">3.</span>
                      <span>Provide the following information:
                        <ul className="ml-6 mt-2 space-y-1">
                          <li>- Your account email address</li>
                          <li>- Subscription plan (Pro or Studio)</li>
                          <li>- Date of payment/charge</li>
                          <li>- Transaction ID (if available)</li>
                          <li>- Reason for refund request</li>
                        </ul>
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-foreground min-w-[24px]">4.</span>
                      <span>Our team will review your request within <strong className="text-foreground">1-2 business days</strong></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-foreground min-w-[24px]">5.</span>
                      <span>You'll receive an email confirming approval or requesting additional information</span>
                    </li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Processing Time */}
            <Card id="processing-time">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Refund Processing Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-20 text-center">
                      <div className="bg-primary/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl font-bold text-primary">1-2</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Days</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Request Review</h4>
                      <p className="text-sm text-muted-foreground">
                        Our support team reviews your refund request and verifies eligibility.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-20 text-center">
                      <div className="bg-primary/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl font-bold text-primary">1-3</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Days</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Razorpay Processing</h4>
                      <p className="text-sm text-muted-foreground">
                        Once approved, the refund is initiated through Razorpay payment gateway.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-20 text-center">
                      <div className="bg-primary/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl font-bold text-primary">5-10</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Days</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Bank/Card Processing</h4>
                      <p className="text-sm text-muted-foreground">
                        Your bank or card issuer processes the refund. The timeline varies by financial institution.
                      </p>
                    </div>
                  </div>
                </div>

                <Alert className="bg-amber-500/10 border-amber-500/30">
                  <AlertDescription className="text-amber-400">
                    <strong>Total Time:</strong> Refunds typically take <strong>7-15 business days</strong> from approval to appear in your account.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Refund Method</h4>
                  <p className="text-sm text-muted-foreground">
                    All refunds are issued to the <strong className="text-foreground">original payment method</strong> used for the subscription. 
                    We cannot process refunds to different cards or accounts.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Non-Refundable Cases */}
            <Card id="non-refundable">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Non-Refundable Situations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  The following situations are <strong className="text-foreground">NOT eligible</strong> for refunds:
                </p>

                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <h4 className="font-semibold text-red-400 mb-2">✗ Mid-Cycle Cancellations</h4>
                    <p className="text-sm text-muted-foreground">
                      Subscriptions canceled after the 7-day guarantee period. You'll retain access until the end of the billing cycle, 
                      but no pro-rated refund will be issued.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <h4 className="font-semibold text-red-400 mb-2">✗ Unused Subscription Time</h4>
                    <p className="text-sm text-muted-foreground">
                      You don't use StudioFlow after subscribing but don't cancel within the 7-day period.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <h4 className="font-semibold text-red-400 mb-2">✗ Terms of Service Violation</h4>
                    <p className="text-sm text-muted-foreground">
                      Your account is terminated for violating our Terms of Service or Acceptable Use Policy.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <h4 className="font-semibold text-red-400 mb-2">✗ Change of Mind After 7 Days</h4>
                    <p className="text-sm text-muted-foreground">
                      You simply change your mind about the service after the 7-day guarantee period has expired.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <h4 className="font-semibold text-red-400 mb-2">✗ Forgotten Cancellation</h4>
                    <p className="text-sm text-muted-foreground">
                      You forgot to cancel before the next billing cycle and the subscription renewed automatically.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card id="contact">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  If you have questions about cancellation or refunds, or need assistance with the process, 
                  our support team is here to help.
                </p>

                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold mb-1">Email Support</p>
                      <a href="mailto:support@studioflow.studio" className="text-primary hover:underline">
                        support@studioflow.studio
                      </a>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-semibold mb-1">Response Time</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Starter Plan: 48-72 hours</li>
                        <li>• Pro Plan: 24-48 hours</li>
                        <li>• Studio Plan: 12-24 hours (priority)</li>
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-semibold mb-1">Business Hours</p>
                      <p className="text-sm text-muted-foreground">
                        Monday - Friday, 9:00 AM - 6:00 PM IST
                      </p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>Tip:</strong> For faster processing, include all relevant details (transaction ID, payment date, account email) 
                    in your initial support email.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
