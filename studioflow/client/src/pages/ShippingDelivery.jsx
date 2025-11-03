import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ShippingDelivery() {
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
        <h1 className="text-4xl font-bold mb-8">Shipping and Delivery Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Digital Service</h2>
            <p className="text-muted-foreground">
              StudioFlow is a digital SaaS platform. There is no physical shipping. All services are provided electronically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Service Activation</h2>
            <p className="text-muted-foreground">
              Upon successful payment, your subscription is activated immediately with instant access to all features.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
