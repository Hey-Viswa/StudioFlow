import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';

/**
 * Hook to check subscription status and Pro feature access
 * @returns {Object} - { hasProAccess, hasStudioAccess, subscription, loading, refetch }
 */
export function useSubscription() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/subscriptions/current`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      setSubscription(data.subscription);
      setError(null);
    } catch (err) {
      console.error('Subscription fetch error:', err);
      setError(err.message);
      // Default to free plan on error
      setSubscription({ plan: 'free', status: 'active' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  // Check if subscription is active and not cancelled/expired
  const isSubscriptionActive = subscription?.status === 'active' || subscription?.status === 'trial';
  
  // Check for Pro access
  const hasProAccess = isSubscriptionActive && (subscription?.plan === 'pro' || subscription?.plan === 'studio');
  
  // Check for Studio access
  const hasStudioAccess = isSubscriptionActive && subscription?.plan === 'studio';

  return {
    subscription,
    loading,
    error,
    hasProAccess,
    hasStudioAccess,
    isActive: isSubscriptionActive,
    isFree: subscription?.plan === 'free',
    isPro: subscription?.plan === 'pro',
    isStudio: subscription?.plan === 'studio',
    isTrial: subscription?.status === 'trial',
    isCancelled: subscription?.status === 'cancelled',
    isExpired: subscription?.status === 'expired',
    refetch: fetchSubscription
  };
}

/**
 * Component to wrap Pro features
 * Shows upgrade message if user doesn't have access
 */
export function ProFeatureGate({ children, feature = "this feature", showUpgrade = true }) {
  const { hasProAccess, loading, subscription } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasProAccess) {
    if (!showUpgrade) return null;

    return (
      <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Pro Feature</h3>
        <p className="text-slate-400 mb-4">
          {feature.charAt(0).toUpperCase() + feature.slice(1)} is available on Pro and Studio plans
        </p>
        <a href="/pricing" className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Upgrade to Pro
        </a>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Component to wrap Studio features
 */
export function StudioFeatureGate({ children, feature = "this feature", showUpgrade = true }) {
  const { hasStudioAccess, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasStudioAccess) {
    if (!showUpgrade) return null;

    return (
      <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Studio Feature</h3>
        <p className="text-slate-400 mb-4">
          {feature.charAt(0).toUpperCase() + feature.slice(1)} is available on Studio plan only
        </p>
        <a href="/pricing" className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Upgrade to Studio
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
