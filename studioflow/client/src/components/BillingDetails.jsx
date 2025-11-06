import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CreditCard, 
  Calendar, 
  Download, 
  AlertCircle,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function BillingDetails({ subscription, onCancel, onReactivate, loading }) {
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const response = await api.get('/subscriptions/invoices');
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

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
  
  // For active subscriptions, this is the next billing/renewal date
  // For cancelled subscriptions, this is when access ends
  const nextBillingDate = subData.subscriptionEndDate 
    ? new Date(subData.subscriptionEndDate).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : 'N/A';
  
  // Determine the label based on subscription status
  const billingDateLabel = isActive 
    ? 'Next Billing Date' 
    : isCancelled 
    ? 'Access Until' 
    : 'Subscription End Date';

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
                <span className="text-sm">{billingDateLabel}</span>
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
          {/* Active Subscription - Show Cancel */}
          {isActive && plan.price > 0 && (
            <>
              <Button 
                variant="destructive" 
                className="w-full justify-start gap-2"
                onClick={onCancel}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Cancel Subscription
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                You'll continue to have access until {nextBillingDate}
              </p>
            </>
          )}

          {/* Cancelled Subscription - Show Reactivate */}
          {isCancelled && plan.price > 0 && (
            <>
              <Button 
                className="w-full justify-start gap-2 bg-primary hover:bg-primary/90"
                onClick={onReactivate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Reactivate Subscription
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Resume your {plan.name} plan subscription
              </p>
            </>
          )}

          {/* Free Plan - Show Upgrade Option */}
          {plan.id === 'free' && (
            <>
              <Button 
                className="w-full justify-start gap-2 bg-primary hover:bg-primary/90"
                onClick={() => window.location.href = '/dashboard/subscription'}
              >
                <CheckCircle className="w-4 h-4" />
                Upgrade to Pro or Studio
              </Button>
              <p className="text-xs text-muted-foreground">
                Get more projects, team members, and premium features
              </p>
            </>
          )}

          {/* Pro Plan - Show Studio Upgrade Option */}
          {isActive && plan.id === 'pro' && (
            <>
              <Button 
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => window.location.href = '/dashboard/subscription'}
              >
                <CheckCircle className="w-4 h-4" />
                Upgrade to Studio Plan
              </Button>
              <p className="text-xs text-muted-foreground">
                100 projects, unlimited team members, custom workflows
              </p>
            </>
          )}
        </div>
      </Card>

      {/* Invoice History */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Invoice History
        </h3>
        
        {loadingInvoices ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 animate-spin" />
            <p className="text-sm">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No invoices available yet. Invoices will appear here after your first payment.
          </p>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div 
                key={invoice.invoiceNumber}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                    <Badge 
                      variant={
                        invoice.status === 'paid' || invoice.status === 'refunded' 
                          ? 'default' 
                          : invoice.status === 'failed' 
                          ? 'destructive' 
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {invoice.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {invoice.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{invoice.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(invoice.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className={`font-semibold ${invoice.amount < 0 ? 'text-green-600' : ''}`}>
                    {invoice.amount < 0 ? '+' : ''}₹{Math.abs(invoice.amount)}
                  </p>
                  {invoice.metadata?.prorated && (
                    <p className="text-xs text-muted-foreground">
                      {invoice.metadata.unusedDays}/{invoice.metadata.totalDays} days
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
