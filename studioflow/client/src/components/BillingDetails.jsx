import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CreditCard, 
  Calendar, 
  Download, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

export default function BillingDetails({ subscription, onCancel, onReactivate, loading }) {
  if (!subscription) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertCircle className="w-5 h-5" />
          <p>No subscription information available</p>
        </div>
      </Card>
    );
  }

  const { subscription: subData, plan, usage } = subscription;
  const isActive = subData.status === 'active';
  const isCancelled = subData.status === 'cancelled';
  const nextBillingDate = subData.currentEnd 
    ? new Date(subData.currentEnd * 1000).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : 'N/A';

  const getStatusBadge = (status) => {
    const variants = {
      active: { variant: 'default', icon: CheckCircle, text: 'Active' },
      cancelled: { variant: 'destructive', icon: AlertCircle, text: 'Cancelled' },
      expired: { variant: 'secondary', icon: Clock, text: 'Expired' },
    };

    const config = variants[status] || variants.expired;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1.5">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{plan.name}</p>
              <p className="text-sm text-muted-foreground">
                ₹{plan.price}{plan.price > 0 ? '/month' : ' - Free Forever'}
              </p>
            </div>
            {getStatusBadge(subData.status)}
          </div>

          {/* Usage Stats */}
          {usage && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Projects Used</span>
                <span className="text-sm font-medium">
                  {usage.projectCount} / {usage.maxProjects}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    usage.projectCount >= usage.maxProjects ? 'bg-destructive' : 'bg-primary'
                  }`}
                  style={{ 
                    width: `${Math.min(100, (usage.projectCount / usage.maxProjects) * 100)}%` 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Billing Information Card */}
      {plan.price > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Next Billing Date</span>
              </div>
              <span className="text-sm font-medium">{nextBillingDate}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm">Payment Method</span>
              </div>
              <span className="text-sm font-medium">
                {subData.razorpaySubscriptionId ? 'Razorpay' : 'Not Set'}
              </span>
            </div>

            {subData.razorpaySubscriptionId && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subscription ID</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {subData.razorpaySubscriptionId.substring(0, 20)}...
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Actions Card */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Subscription Actions</h3>
        <div className="space-y-3">
          {isActive && plan.price > 0 && (
            <>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={onCancel}
                disabled={loading}
              >
                <AlertCircle className="w-4 h-4" />
                Cancel Subscription
              </Button>
              <p className="text-xs text-muted-foreground">
                You'll continue to have access until {nextBillingDate}
              </p>
            </>
          )}

          {isCancelled && (
            <>
              <Button 
                className="w-full justify-start gap-2"
                onClick={onReactivate}
                disabled={loading}
              >
                <CheckCircle className="w-4 h-4" />
                Reactivate Subscription
              </Button>
              <p className="text-xs text-muted-foreground">
                Resume your {plan.name} plan subscription
              </p>
            </>
          )}

          {plan.id === 'free' && (
            <Button 
              className="w-full justify-start gap-2"
              onClick={() => window.location.href = '/dashboard/subscription'}
            >
              <CheckCircle className="w-4 h-4" />
              Upgrade to Pro or Studio
            </Button>
          )}
        </div>
      </Card>

      {/* Invoice History (Placeholder) */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Invoice History
        </h3>
        <p className="text-sm text-muted-foreground">
          No invoices available yet. Invoices will appear here after your first payment.
        </p>
      </Card>
    </div>
  );
}
