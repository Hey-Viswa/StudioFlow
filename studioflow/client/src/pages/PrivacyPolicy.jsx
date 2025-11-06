import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, Shield, Lock, Eye, UserCheck, Database, Globe, FileText, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  // Update page title and meta for SEO
  useEffect(() => {
    document.title = 'Privacy Policy - StudioFlow';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'StudioFlow Privacy Policy - Learn how we collect, use, and protect your personal data. GDPR compliant.');
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
        <div className="container flex h-16 items-center justify-between">
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
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Privacy Policy</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/terms-conditions')}>
              Terms
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/contact-us')}>
              Contact
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-7xl py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-1">
              <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">On This Page</h3>
              <nav className="space-y-1">
                {[
                  { id: 'introduction', label: 'Introduction' },
                  { id: 'information-collected', label: 'Information We Collect' },
                  { id: 'how-we-use', label: 'How We Use Data' },
                  { id: 'data-security', label: 'Data Security' },
                  { id: 'data-sharing', label: 'Information Sharing' },
                  { id: 'your-rights', label: 'Your Rights' },
                  { id: 'data-retention', label: 'Data Retention' },
                  { id: 'contact', label: 'Contact Us' }
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
            {/* Introduction */}
            <Card id="introduction">
              <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Introduction
            </CardTitle>
            <CardDescription>
              Last updated: November 6, 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Welcome to StudioFlow. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              By using StudioFlow, you agree to the collection and use of information in accordance with this policy.
            </p>
          </CardContent>
        </Card>

            {/* Information We Collect */}
            <Card id="information-collected">
              <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">1. Personal Information</h3>
              <p className="text-muted-foreground">
                When you create an account and use StudioFlow, we collect:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Name and email address (via Clerk authentication)</li>
                <li>Profile information and preferences</li>
                <li>Project data including titles, descriptions, and due dates</li>
                <li>Task assignments and comments</li>
                <li>Team member invitations and collaborations</li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">2. Payment Information</h3>
              <p className="text-muted-foreground">
                Payment data is processed securely through Razorpay. We do not store your complete credit card information on our servers. 
                We only store:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Subscription plan details</li>
                <li>Transaction IDs and payment status</li>
                <li>Billing history</li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">3. Usage Data</h3>
              <p className="text-muted-foreground">
                We automatically collect certain information when you use our service:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>IP address and browser type</li>
                <li>Pages visited and features used</li>
                <li>Time spent on different sections</li>
                <li>Device information and operating system</li>
              </ul>
            </div>
          </CardContent>
        </Card>

            {/* How We Use Your Information */}
            <Card id="how-we-use">
              <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-foreground">Service Delivery:</strong> To provide, maintain, and improve StudioFlow's features and functionality</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-foreground">Communication:</strong> To send you technical notices, updates, security alerts, and support messages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-foreground">Payments:</strong> To process transactions and manage your subscription</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-foreground">Analytics:</strong> To understand how users interact with our service and improve user experience</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-foreground">Security:</strong> To detect, prevent, and address technical issues, fraud, or security threats</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-foreground">Compliance:</strong> To comply with legal obligations and enforce our terms</span>
              </li>
            </ul>
          </CardContent>
        </Card>

            {/* Data Security */}
            <Card id="data-security">
              <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your personal information:
            </p>
            <ul className="space-y-2 text-muted-foreground ml-4">
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Encryption in transit (HTTPS/TLS) and at rest for sensitive data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Secure authentication via Clerk with JWT tokens</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Regular security audits and updates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Access controls and permission-based data access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Secure payment processing through PCI-compliant Razorpay</span>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              However, no method of transmission over the internet is 100% secure. While we strive to protect your data, 
              we cannot guarantee absolute security.
            </p>
          </CardContent>
        </Card>

            {/* Data Sharing */}
            <Card id="data-sharing">
              <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Information Sharing and Disclosure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We do not sell your personal information. We may share your data only in the following circumstances:
            </p>
            <ul className="space-y-3 text-muted-foreground ml-4">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong className="text-foreground">Service Providers:</strong> With Clerk (authentication), Razorpay (payments), and MongoDB Atlas (database hosting) to operate our service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong className="text-foreground">Team Members:</strong> Project data is shared with team members you invite to collaborate</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong className="text-foreground">Legal Requirements:</strong> When required by law or to protect our rights</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong className="text-foreground">Business Transfers:</strong> In connection with a merger, sale, or asset transfer</span>
              </li>
            </ul>
          </CardContent>
        </Card>

            {/* Your Rights */}
            <Card id="your-rights">
              <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Your Rights and Choices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You have the following rights regarding your personal data:
            </p>
            <ul className="space-y-3 text-muted-foreground ml-4">
              <li><strong className="text-foreground">Access:</strong> Request a copy of your personal data</li>
              <li><strong className="text-foreground">Correction:</strong> Update or correct inaccurate information</li>
              <li><strong className="text-foreground">Deletion:</strong> Request deletion of your account and data</li>
              <li><strong className="text-foreground">Export:</strong> Download your project data at any time</li>
              <li><strong className="text-foreground">Opt-out:</strong> Unsubscribe from marketing emails</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, visit your Settings page or contact us at the email below.
            </p>
          </CardContent>
        </Card>

            {/* Data Retention */}
            <Card id="data-retention">
              <CardHeader>
            <CardTitle>Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide services. 
              When you delete your account:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Projects are moved to trash and retained for 30 days</li>
              <li>After 30 days, projects are permanently deleted</li>
              <li>Account data is deleted within 90 days after account closure</li>
              <li>Some data may be retained for legal or security purposes</li>
            </ul>
          </CardContent>
        </Card>

            {/* Contact */}
            <Card id="contact">
              <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">Email:</strong> privacy@studioflow.studio</p>
              <p><strong className="text-foreground">Contact Form:</strong> <a href="/contact-us" className="text-primary hover:underline">www.studioflow.studio/contact-us</a></p>
            </div>
          </CardContent>
        </Card>

            {/* Changes to Policy */}
            <Card>
              <CardHeader>
            <CardTitle>Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy 
              on this page and updating the "Last updated" date. You are advised to review this policy periodically for any changes.
            </p>
          </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
