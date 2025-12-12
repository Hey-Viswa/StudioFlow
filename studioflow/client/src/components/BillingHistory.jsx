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
import { Button } from './ui/button';
import { toast } from 'sonner';
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
      // console.log('🔄 Fetching billing history...');
      const response = await api.get('/subscriptions/billing-history', { getToken });
      // console.log('📥 Billing history response:', response);

      // Show warning if payment gateway is not configured
      if (response.warnings && response.warnings.length > 0) {
        console.warn('⚠️ Billing history warnings:', response.warnings);
        response.warnings.forEach(warning => toast.warning(warning, { duration: 5000 }));
      }

      setBillingData(response);
    } catch (error) {
      console.error('❌ Failed to fetch billing history:', error);
      toast.error('Failed to load billing history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      toast.loading('Generating invoice...');
      const token = await getToken();
      // Use direct fetch since we need to handle the blob/redirect manually or just get the URL
      // The controller returns { url: string }
      const response = await api.get(`/subscriptions/invoices/${invoiceId}/download`, { getToken });

      if (response.url) {
        window.open(response.url, '_blank');
        toast.dismiss();
        toast.success('Invoice opened in new tab');
      } else {
        throw new Error('No download URL returned');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.dismiss();
      toast.error('Failed to download invoice');
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

  const { currentSubscription, nextPayment, paymentHistory, subscriptionCount, totalSpent, successfulPayments, localInvoices } = billingData;

  // Show local invoices even when payment history is empty
  const hasAnyData = currentSubscription ||
    (localInvoices && localInvoices.length > 0) ||
    (paymentHistory && paymentHistory.length > 0);

  if (!hasAnyData) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <div className="p-4 bg-muted rounded-full">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">No Billing History Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Your payment and invoice history will appear here once you subscribe to a paid plan.
            </p>
          </div>
        </div>
      </Card>
    );
  }

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
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return 'N/A';
    return d.toLocaleDateString('en-US', {
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
                {successfulPayments || paymentHistory.filter(p => p.status === 'captured').length}
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

        {paymentHistory.length === 0 && (!localInvoices || localInvoices.length === 0) ? (
          <div className="text-center py-8">
            <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-3">
              <CreditCard className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No payment transactions yet. Your payment history will appear here.
            </p>
          </div>
        ) : paymentHistory.length > 0 ? (
          <div className="space-y-3">
            {paymentHistory.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="font-medium truncate">{payment.description}</p>
                    {getStatusBadge(payment.status)}
                    {payment.refunded && (
                      <Badge variant="outline" className="text-xs">
                        Refunded
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(payment.createdAt)}</span>
                    <span className="capitalize">{payment.method || 'Card'}</span>
                    <span className="font-mono text-xs hidden sm:inline">ID: {payment.id ? payment.id.substring(0, 20) : 'N/A'}...</span>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:ml-4 sm:text-right w-full sm:w-auto mt-2 sm:mt-0">
                  <p className={`text-lg font-semibold ${payment.refunded ? 'text-red-600' : ''}`}>
                    {payment.refunded ? '-' : ''}₹{payment.amount ? payment.amount.toFixed(2) : '0.00'}</p>

                  {payment.invoiceId && (
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownloadInvoice(payment.invoiceId)}
                        title="Download Invoice"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Show Local Invoices when payment history is empty */}
        {paymentHistory.length === 0 && localInvoices && localInvoices.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Invoice Records</h4>
            {localInvoices.map((invoice) => (
              <div
                key={invoice.invoiceNumber}
                className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium text-sm">{invoice.description || invoice.type}</p>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(invoice.createdAt)}</span>
                    <span className="font-mono">#{invoice.invoiceNumber}</span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-base font-semibold">₹{invoice.amount ? invoice.amount.toFixed(2) : '0.00'}</p>
                  {invoice.razorpayPaymentId && (
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {invoice.razorpayPaymentId}
                    </p>
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
