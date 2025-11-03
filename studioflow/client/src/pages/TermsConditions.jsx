import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsConditions() {
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

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using StudioFlow, you accept and agree to be bound by the terms and provisions 
              of this agreement. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
            <p className="text-muted-foreground">
              StudioFlow is a video editing project management platform that allows editors and clients to 
              collaborate on video projects. We provide tools for project management, file sharing, and 
              client communication.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Subscription Plans</h2>
            <div className="text-muted-foreground space-y-2">
              <p><strong>Starter Plan:</strong> Free plan with up to 2 active projects</p>
              <p><strong>Pro Plan:</strong> ₹10/month - Unlimited projects with client collaboration</p>
              <p><strong>Studio Plan:</strong> ₹25/month - Everything in Pro plus team permissions and advanced features</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Payment Terms</h2>
            <p className="text-muted-foreground">
              All payments are processed securely through Razorpay. Subscriptions are billed monthly and 
              automatically renew unless cancelled. You can cancel your subscription at any time from your 
              account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. User Responsibilities</h2>
            <p className="text-muted-foreground mb-2">You agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account</li>
              <li>Not share your account credentials</li>
              <li>Use the service lawfully and ethically</li>
              <li>Not upload malicious content or copyrighted material without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
            <p className="text-muted-foreground">
              You retain all rights to the content you upload to StudioFlow. We claim no intellectual property 
              rights over the material you provide. The StudioFlow platform, including its design, features, 
              and code, are protected by copyright and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              StudioFlow shall not be liable for any indirect, incidental, special, consequential, or punitive 
              damages resulting from your use or inability to use the service. We do not guarantee uninterrupted 
              or error-free service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Termination</h2>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate your account if you violate these terms. Upon 
              termination, your right to use the service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. We will notify users of any material 
              changes via email or through the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
            <p className="text-muted-foreground">
              For questions about these Terms and Conditions, please contact us at:{' '}
              <a href="mailto:support@studioflow.com" className="text-primary hover:underline">
                support@studioflow.com
              </a>
            </p>
          </section>

          <section>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
