import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Calendar, 
  CreditCard, 
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Download
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import api from '../lib/api';

export default function BillingHistory() {
  const { getToken } = useAuth();
  const [billingData, setBillingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  const fetchBillingHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subscriptions/billing-history', { getToken });
      setBillingData(response);
    } catch (error) {
      console.error('Failed to fetch billing history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-5 h-5 animate-spin" />
          <p>Loading billing history...</p>
        </div>
      </Card>
    );
  }

  if (!billingData) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="w-5 h-5" />
          <p>No billing information available</p>
        </div>
      </Card>
    );
  }

  const { currentSubscription, nextPayment, paymentHistory, subscriptionCount, totalSpent } = billingData;

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { variant: 'default', icon: CheckCircle, text: 'Active', color: 'text-green-600' },
      cancelled: { variant: 'destructive', icon: AlertCircle, text: 'Cancelled', color: 'text-red-600' },
      completed: { variant: 'secondary', icon: CheckCircle, text: 'Completed', color: 'text-gray-600' },
      captured: { variant: 'default', icon: CheckCircle, text: 'Paid', color: 'text-green-600' },
      failed: { variant: 'destructive', icon: AlertCircle, text: 'Failed', color: 'text-red-600' },
      pending: { variant: 'secondary', icon: Clock, text: 'Pending', color: 'text-yellow-600' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1.5">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription Overview */}
      {currentSubscription && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Current Subscription</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Plan</p>
              <p className="text-xl font-bold">{currentSubscription.plan}</p>
              <p className="text-sm text-muted-foreground">₹{currentSubscription.amount}/month</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <div className="mt-1">
                {getStatusBadge(currentSubscription.status)}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Renewals Completed</p>
              <p className="text-xl font-bold">{subscriptionCount}</p>
              <p className="text-sm text-muted-foreground">
                {currentSubscription.remainingCount > 0 
                  ? `${currentSubscription.remainingCount} remaining` 
                  : 'Monthly billing'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Next Payment */}
      {nextPayment && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Upcoming Billing</h3>
                <p className="text-sm text-muted-foreground">
                  Your next payment is scheduled for <span className="font-medium text-foreground">{formatDate(nextPayment.date)}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Amount: <span className="font-semibold text-foreground">₹{nextPayment.amount}</span> for {nextPayment.plan}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">₹{nextPayment.amount}</p>
              <p className="text-xs text-muted-foreground">Next charge</p>
            </div>
          </div>
        </Card>
      )}

      {/* Billing Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-xl font-bold">₹{totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Payments</p>
              <p className="text-xl font-bold">{paymentHistory.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Successful</p>
              <p className="text-xl font-bold">
                {paymentHistory.filter(p => p.status === 'captured').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Payment History
        </h3>

        {paymentHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payment history available yet.
          </p>
        ) : (
          <div className="space-y-3">
            {paymentHistory.map((payment) => (
              <div 
                key={payment.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{payment.description}</p>
                    {getStatusBadge(payment.status)}
                    {payment.refunded && (
                      <Badge variant="outline" className="text-xs">
                        Refunded
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatDate(payment.createdAt)}</span>
                    <span className="capitalize">{payment.method}</span>
                    <span className="font-mono text-xs">ID: {payment.id.substring(0, 20)}...</span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className={`text-lg font-semibold ${payment.refunded ? 'text-red-600' : ''}`}>
                    {payment.refunded ? '-' : ''}₹{payment.amount.toFixed(2)}
                  </p>
                  {payment.invoiceId && (
                    <button className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                      <Download className="w-3 h-3" />
                      Invoice
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Billing Period Details */}
      {currentSubscription && currentSubscription.currentPeriodStart && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Current Billing Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Period Start</p>
              <p className="font-medium">{formatDate(currentSubscription.currentPeriodStart)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Period End</p>
              <p className="font-medium">{formatDate(currentSubscription.currentPeriodEnd)}</p>
            </div>
          </div>
          
          {currentSubscription.status === 'active' && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your subscription will automatically renew on <span className="font-medium text-foreground">{formatDate(currentSubscription.currentPeriodEnd)}</span> unless cancelled before that date.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
