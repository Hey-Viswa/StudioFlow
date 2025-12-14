import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, FileText, Scale, CreditCard, Ban, AlertTriangle, Shield, Users, Clock, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';

export default function TermsConditions() {
  const navigate = useNavigate();

  // Update page title and meta for SEO
  useEffect(() => {
    document.title = 'Terms & Conditions - StudioFlow';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'StudioFlow Terms & Conditions - Read our service agreement, subscription terms, and user responsibilities.');
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
              <Scale className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Terms & Conditions</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadAsPDF}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
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
                  { id: 'cancellation', label: 'Cancellation & Refund' },
                  { id: 'acceptable-use', label: 'Acceptable Use' },
                  { id: 'intellectual-property', label: 'Intellectual Property' },
                  { id: 'termination', label: 'Termination' },
                  { id: 'liability', label: 'Limitation of Liability' },
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
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-4">Terms and Conditions</h1>
              <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            </div>

            {/* Cancellation and Refunds */}
            <Card id="cancellation">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="h-5 w-5 text-primary" />
                  1. Cancellation and Refund Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold">Cancellation</h3>
                <p className="text-muted-foreground">
                  You may cancel your subscription at any time from your account settings. Upon cancellation:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Your subscription remains active until the end of the current billing period</li>
                  <li>You will not be charged for subsequent billing periods</li>
                  <li>Your account will be downgraded to the Free plan</li>
                  <li>Projects exceeding the Free plan limit will be archived</li>
                </ul>

                <Separator />

                <h3 className="font-semibold">Refund Policy</h3>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li>• <strong className="text-foreground">7-Day Money-Back Guarantee:</strong> New subscribers can request a full refund within 7 days of first payment</li>
                  <li>• <strong className="text-foreground">Pro-Rated Refunds:</strong> Not available for mid-cycle cancellations</li>
                  <li>• <strong className="text-foreground">Refund Processing:</strong> Approved refunds are processed within 5-10 business days</li>
                  <li>• Refunds are issued to the original payment method</li>
                </ul>
              </CardContent>
            </Card>

            {/* Acceptable Use */}
            <Card id="acceptable-use">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  2. Acceptable Use Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  You agree not to use StudioFlow to:
                </p>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li>• Violate any laws or regulations</li>
                  <li>• Infringe upon intellectual property rights of others</li>
                  <li>• Upload malicious code, viruses, or harmful content</li>
                  <li>• Harass, abuse, or harm other users</li>
                  <li>• Attempt to gain unauthorized access to our systems</li>
                  <li>• Use automated systems to scrape or collect data</li>
                  <li>• Resell or distribute the service without authorization</li>
                  <li>• Share login credentials with others</li>
                  <li>• Create accounts using false information</li>
                </ul>
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Violation of this policy may result in immediate account suspension or termination without refund.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Content Ownership */}
            <Card id="intellectual-property">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  3. Intellectual Property and Content Ownership
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold">Your Content</h3>
                <p className="text-muted-foreground">
                  You retain all rights to the content you upload to StudioFlow (projects, tasks, comments, files).
                  By uploading content, you grant us a limited license to store, process, and display your content solely for
                  the purpose of providing the service to you.
                </p>

                <Separator />

                <h3 className="font-semibold">Our Platform</h3>
                <p className="text-muted-foreground">
                  StudioFlow and its original content, features, and functionality are owned by us and protected by international
                  copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease
                  any part of our services.
                </p>

                <Separator />

                <h3 className="font-semibold">Data Backup</h3>
                <p className="text-muted-foreground">
                  While we perform regular backups, you are responsible for maintaining your own backup copies of your content.
                  We are not liable for any loss or corruption of your data.
                </p>
              </CardContent>
            </Card>

            {/* Termination */}
            <Card id="termination">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  4. Termination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We may terminate or suspend your account and access to the service immediately, without prior notice or liability,
                  for any reason, including if you breach these Terms.
                </p>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li>• Upon termination, your right to use the service ceases immediately</li>
                  <li>• Deleted projects are moved to trash for 30 days before permanent deletion</li>
                  <li>• You may export your data before account deletion</li>
                  <li>• All provisions of these Terms that should survive termination shall survive</li>
                </ul>
              </CardContent>
            </Card>

            {/* Limitations of Liability */}
            <Card id="liability">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  5. Limitation of Liability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, STUDIOFLOW SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                  CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY,
                  OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:
                </p>
                <ul className="space-y-2 text-muted-foreground ml-4">
                  <li>• Your use or inability to use the service</li>
                  <li>• Unauthorized access to or alteration of your content</li>
                  <li>• Any conduct or content of any third party on the service</li>
                  <li>• Any interruptions or errors in the service</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Our total liability for any claims under these terms is limited to the amount you paid us in the 12 months before the claim.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card id="contact">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  6. Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  If you have questions about these Terms and Conditions, please contact us:
                </p>
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
  );
}
