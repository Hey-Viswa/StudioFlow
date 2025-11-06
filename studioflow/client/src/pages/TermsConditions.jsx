import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Scale, CreditCard, Ban, AlertTriangle, Shield, Users, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';

export default function TermsConditions() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Terms & Conditions</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container max-w-4xl py-12 space-y-8">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Agreement to Terms
            </CardTitle>
            <CardDescription>
              Last updated: November 6, 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please read these Terms and Conditions carefully before using StudioFlow. By accessing or using our service, 
                you agree to be bound by these terms.
              </AlertDescription>
            </Alert>
            <p className="text-muted-foreground leading-relaxed">
              These Terms and Conditions ("Terms") govern your use of the StudioFlow platform and services operated by StudioFlow ("we", "us", or "our"). 
              If you do not agree with any part of these terms, you may not access the service.
            </p>
          </CardContent>
        </Card>

        {/* Service Description */}
        <Card>
          <CardHeader>
            <CardTitle>1. Service Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              StudioFlow is a project management and collaboration platform that enables users to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Create and manage creative projects</li>
              <li>Collaborate with team members and clients</li>
              <li>Track project progress with tasks and comments</li>
              <li>Generate and share project invite links</li>
              <li>Access invoicing and subscription features</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify, suspend, or discontinue any aspect of the service at any time, with or without notice.
            </p>
          </CardContent>
        </Card>

        {/* Account Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              2. Account Registration and Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="font-semibold">Account Creation</h3>
            <ul className="space-y-2 text-muted-foreground ml-4">
              <li>• You must provide accurate and complete information during registration</li>
              <li>• You must be at least 18 years old to use StudioFlow</li>
              <li>• One person or entity may not maintain more than one free account</li>
              <li>• You are responsible for maintaining the security of your account credentials</li>
            </ul>

            <Separator />

            <h3 className="font-semibold">Account Responsibilities</h3>
            <p className="text-muted-foreground">
              You are responsible for all activities that occur under your account. You must immediately notify us of any unauthorized 
              use of your account or any other security breach. We cannot and will not be liable for any loss or damage arising from your 
              failure to comply with this security obligation.
            </p>
          </CardContent>
        </Card>

        {/* Subscription Plans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              3. Subscription Plans and Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Available Plans</h3>
              <ul className="space-y-3 text-muted-foreground ml-4">
                <li><strong className="text-foreground">Free Plan:</strong> 5 projects, basic features, community support</li>
                <li><strong className="text-foreground">Pro Plan:</strong> 50 projects, advanced features, priority support</li>
                <li><strong className="text-foreground">Studio Plan:</strong> Unlimited projects, all features, dedicated support</li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold">Billing Terms</h3>
              <ul className="space-y-2 text-muted-foreground ml-4">
                <li>• All payments are processed securely through Razorpay</li>
                <li>• Subscriptions are billed monthly on the date you subscribed</li>
                <li>• You will be charged automatically unless you cancel before the next billing cycle</li>
                <li>• All fees are in INR (Indian Rupees) unless otherwise stated</li>
                <li>• Prices are subject to change with 30 days notice</li>
                <li>• No refunds for partial months when you cancel</li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold">Payment Methods</h3>
              <p className="text-muted-foreground">
                We accept credit cards, debit cards, UPI, net banking, and digital wallets through Razorpay. 
                You authorize us to charge your payment method for all fees incurred under your account.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cancellation and Refunds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-primary" />
              4. Cancellation and Refund Policy
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              5. Acceptable Use Policy
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
        <Card>
          <CardHeader>
            <CardTitle>6. Intellectual Property and Content Ownership</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              7. Termination
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
        <Card>
          <CardHeader>
            <CardTitle>8. Limitation of Liability</CardTitle>
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

        {/* Service Availability */}
        <Card>
          <CardHeader>
            <CardTitle>9. Service Availability and Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We strive for 99.9% uptime but do not guarantee uninterrupted access to the service. We may:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Perform scheduled maintenance with advance notice</li>
              <li>Experience unexpected downtime due to technical issues</li>
              <li>Temporarily suspend service for security reasons</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Support response times vary by plan: Free (community support), Pro (48-hour response), Studio (24-hour priority response).
            </p>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>10. Privacy and Data Protection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Your use of StudioFlow is also governed by our Privacy Policy. By using our service, you consent to the 
              collection and use of your information as described in the Privacy Policy.
            </p>
            <Button variant="outline" onClick={() => navigate('/privacy-policy')}>
              Read Privacy Policy
            </Button>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card>
          <CardHeader>
            <CardTitle>11. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of material changes via email or 
              through a notice on the service. Your continued use of StudioFlow after changes take effect constitutes your 
              acceptance of the revised Terms.
            </p>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card>
          <CardHeader>
            <CardTitle>12. Governing Law and Dispute Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to its 
              conflict of law provisions. Any disputes arising from these Terms or the service shall be resolved through 
              binding arbitration in accordance with Indian arbitration laws.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>13. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              If you have questions about these Terms and Conditions, please contact us:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">Email:</strong> legal@studioflow.studio</p>
              <p><strong className="text-foreground">Contact Form:</strong> <a href="/contact-us" className="text-primary hover:underline">www.studioflow.studio/contact-us</a></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
