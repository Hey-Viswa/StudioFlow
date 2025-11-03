import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CancellationRefund() {
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
        <h1 className="text-4xl font-bold mb-8">Cancellation and Refund Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Subscription Cancellation</h2>
            <p className="text-muted-foreground">
              You can cancel your StudioFlow subscription at any time from your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Refund Policy</h2>
            <p className="text-muted-foreground">
              We offer a 7-day money-back guarantee for first-time subscribers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Contact</h2>
            <p className="text-muted-foreground">
              Email: <a href="mailto:support@studioflow.com" className="text-primary hover:underline">support@studioflow.com</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
