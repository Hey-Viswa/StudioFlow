import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, Shield, Lock, Eye, UserCheck, Database, Globe, FileText, Mail, Download } from 'lucide-react';
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

  const downloadAsPDF = () => {
    window.print();
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
            <Button variant="outline" size="sm" onClick={downloadAsPDF}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/terms-conditions')}>
              Terms
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
            <Card id="introduction">
              <CardHeader>
                <CardTitle>Introduction</CardTitle>
                <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>
                  At StudioFlow ("we," "our," or "us"), we respect your privacy and are committed to protecting your personal data.
                  This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from)
                  and tell you about your privacy rights and how the law protects you.
                </p>
                <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20 text-primary">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Your data security is our top priority.</span>
                </div>
              </CardContent>
            </Card>

            <div id="information-collected">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                1. Information We Collect
              </h2>
              <Card>
                <CardContent className="p-6 space-y-4 text-sm text-muted-foreground">
                  <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                    <li><strong>Contact Data:</strong> includes billing address, delivery address, email address and telephone numbers.</li>
                    <li><strong>Financial Data:</strong> includes bank account and payment card details (processed securely by our payment providers).</li>
                    <li><strong>Transaction Data:</strong> includes details about payments to and from you and other details of products and services you have purchased from us.</li>
                    <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div id="how-we-use">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                2. How We Use Your Data
              </h2>
              <Card>
                <CardContent className="p-6 space-y-4 text-sm text-muted-foreground">
                  <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <h4 className="font-medium text-foreground mb-2">Contract Performance</h4>
                      <p className="text-xs">Where we need to perform the contract we are about to enter into or have entered into with you.</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <h4 className="font-medium text-foreground mb-2">Legitimate Interests</h4>
                      <p className="text-xs">Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <h4 className="font-medium text-foreground mb-2">Legal Compliance</h4>
                      <p className="text-xs">Where we need to comply with a legal obligation.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div id="data-sharing">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                3. Disclosures of Your Data
              </h2>
              <Card>
                <CardContent className="p-6 space-y-4 text-sm text-muted-foreground">
                  <p>We may share your personal data with the parties set out below for the purposes set out in 'How we use your personal data'.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Service providers acting as processors who provide IT and system administration services.</li>
                    <li>Professional advisers acting as processors or joint controllers including lawyers, bankers, auditors and insurers.</li>
                    <li>Regulators and other authorities acting as processors or joint controllers who require reporting of processing activities in certain circumstances.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div id="data-security">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                4. Data Security
              </h2>
              <Card>
                <CardContent className="p-6 space-y-4 text-sm text-muted-foreground">
                  <p>
                    We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed.
                    In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                    They will only process your personal data on our instructions and they are subject to a duty of confidentiality.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div id="your-rights">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                5. Your Legal Rights
              </h2>
              <Card>
                <CardContent className="p-6 space-y-4 text-sm text-muted-foreground">
                  <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data, including:</p>
                  <ul className="grid sm:grid-cols-2 gap-2 mt-2">
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Request access to your personal data.</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Request correction of your personal data.</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Request erasure of your personal data.</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Object to processing of your personal data.</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Request restriction of processing your personal data.</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Request transfer of your personal data.</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Right to withdraw consent.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div id="contact">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                6. Contact Details
              </h2>
              <Card>
                <CardContent className="p-6 space-y-4 text-sm text-muted-foreground">
                  <p>If you have any questions about this privacy policy or our privacy practices, please contact us:</p>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="font-semibold">Email:</span>
                      <a href="mailto:viswaranjan.dev@gmail.com" className="text-primary hover:underline">viswaranjan.dev@gmail.com</a>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="font-semibold">Address:</span>
                      <span>Pen, Raigad, Maharashtra, 402107, India</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
