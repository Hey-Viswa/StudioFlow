import React, { useState } from 'react';
import { marketingApi } from '@/lib/marketing';
import { toast } from 'sonner';
import { Mail, Check, Loader2 } from 'lucide-react';

const NewsletterWidget = ({ source = 'footer', variant = 'default' }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await marketingApi.subscribe({ 
        email, 
        source,
        marketingConsent: true 
      });
      setSuccess(true);
      toast.success('Check your email to confirm subscription!');
      setEmail('');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'minimal') {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading || success}
          className="bg-background border border-input px-3 py-1 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-primary w-full"
          required
        />
        <button 
          type="submit" 
          disabled={loading || success}
          className="bg-primary text-primary-foreground text-sm px-3 py-1 rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <Check className="w-4 h-4" /> : 'Join'}
        </button>
      </form>
    );
  }

  return (
    <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Stay Updated</h3>
      </div>
      <p className="text-muted-foreground text-sm mb-4">
        Get the latest updates, tips, and news from StudioFlow.
      </p>

      {success ? (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md border border-green-100">
          <Check className="w-5 h-5" />
          <p className="text-sm font-medium">Please check your inbox to confirm!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          />
          <div className="flex items-start gap-2 mt-2">
            <input 
              type="checkbox" 
              id="consent" 
              required 
              className="mt-1"
            />
            <label htmlFor="consent" className="text-xs text-muted-foreground leading-tight">
              I agree to receive marketing emails from StudioFlow. I can unsubscribe at any time.
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subscribing...
              </>
            ) : (
              'Subscribe to Newsletter'
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default NewsletterWidget;
