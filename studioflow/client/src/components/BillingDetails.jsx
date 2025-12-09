import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Sparkles,
  AlertTriangle,
  Download
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import api from '../lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export default function BillingDetails({ subscription, onCancel, onReactivate, loading }) {
  const { getToken } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [changingPlan, setChangingPlan] = useState(false);
  const [showPlanChangeDialog, setShowPlanChangeDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const response = await api.get('/subscriptions/invoices', { getToken });
      setInvoices(Array.isArray(response) ? response : response.invoices || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleChangePlan = (newPlan) => {
    setSelectedPlanId(newPlan);
    setShowPlanChangeDialog(true);
  };

  const loadScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const executePlanChange = async () => {
    setShowPlanChangeDialog(false);
    setChangingPlan(true);
    try {
      const response = await api.post('/subscriptions/change-plan', { newPlan: selectedPlanId }, { getToken });

      if (response.requiresPayment && response.orderId) {
        const scriptLoaded = await loadScript();
        if (!scriptLoaded) {
          throw new Error('Failed to load payment gateway');
        }

        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!razorpayKey) throw new Error('Payment gateway not configured');

        const options = {
          key: razorpayKey,
          amount: response.amount * 100, // Ensure amount is in paise if needed, but order_id usually handles it
          currency: response.currency,
          name: 'StudioFlow',
          description: response.description,
          order_id: response.orderId,
          handler: async function (paymentResponse) {
            try {
              await api.post('/subscriptions/verify-upgrade', {
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_signature: paymentResponse.razorpay_signature
              }, { getToken });

              toast.success('Plan upgraded successfully!');
              window.location.reload();
            } catch (verifyError) {
              console.error('Verification error:', verifyError);
              toast.error('Payment verification failed');
            }
          },
          theme: { color: '#6366f1' }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }

      if (response.redirectUrl) {
        // Redirect to Razorpay payment page for new subscription
        window.location.href = response.redirectUrl;
      } else {
        toast.success(response.message || 'Plan change successful!');
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to change plan:', error);
      toast.error(error.response?.data?.error || 'Failed to change plan. Please try again.');
    } finally {
      setChangingPlan(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) {
      return null;
    }
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Invoice download temporarily disabled - viewing only
  const viewInvoiceDetails = (invoice) => {
    toast.info('Invoice details', {
      description: `Invoice ${invoice.invoiceNumber} - ₹${Math.abs(invoice.amount)} - ${invoice.status}`
    });
  };

  const SUBSCRIPTION_PLANS = {
    free: { id: 'free', name: 'Starter', price: 0 },
    pro: { id: 'pro', name: 'Pro', price: 1 },
    studio: { id: 'studio', name: 'Studio', price: 2 }
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
  const isCancelled = ['cancelled', 'expired'].includes(subData.status);
  const autoRenewEnabled = subData.autoRenew ?? true;

  // For active subscriptions, this is the next billing/renewal date
  // For cancelled subscriptions, this is when access ends
  const nextBillingDate = formatDate(
    subData.subscriptionEndDate
  );

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
      pending: { variant: 'outline', icon: Clock, text: 'Pending' },
      created: { variant: 'outline', icon: Clock, text: 'Awaiting Payment' },
      scheduled_downgrade: { variant: 'secondary', icon: Clock, text: 'Downgrade Scheduled' }
    };

    const config = variants[status] || { variant: 'secondary', icon: Clock, text: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1.5 capitalize">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const getPlanChangeDescription = () => {
    if (!selectedPlanId) return '';
    const newPlan = SUBSCRIPTION_PLANS[selectedPlanId];
    const isUpgrade = plan.id === 'free' || plan.price < newPlan.price;

    if (isUpgrade) {
      return `You are upgrading to the ${newPlan.name} plan. You will be redirected to complete the payment of ₹${newPlan.price}.`;
    } else {
      return `You are downgrading to the ${newPlan.name} plan. This change will take effect at the end of your current billing period on ${nextBillingDate}.`;
    }
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
                  className={`h-2 rounded-full transition-all ${usage.projectCount >= usage.maxProjects ? 'bg-destructive' : 'bg-primary'}`}
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
              <span className="text-sm font-medium">{nextBillingDate || 'Not available yet'}</span>
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

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Renewal Status</span>
              <Badge variant={autoRenewEnabled ? 'default' : 'outline'}>
                {autoRenewEnabled ? 'Auto-renew ON' : 'Auto-renew OFF'}
              </Badge>
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
        <div className="space-y-4">

          {/* Auto-Renew Toggle */}
          {isActive && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Auto-renew</span>
                  <Badge variant={subData.autoRenew ? "default" : "secondary"} className={subData.autoRenew ? "bg-green-500/15 text-green-500 hover:bg-green-500/25" : ""}>
                    {subData.autoRenew ? "On" : "Off"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {subData.autoRenew
                    ? "Your subscription will automatically renew"
                    : "Subscription will end after current period"}
                </p>
              </div>
              <Switch
                checked={subData.autoRenew}
                onCheckedChange={async (checked) => {
                  try {
                    const token = await getToken();
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

                    const response = await fetch(`${apiUrl}/subscriptions/auto-renew`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ autoRenew: checked })
                    });

                    if (response.ok) {
                      toast.success(`Auto-renew ${checked ? 'enabled' : 'disabled'}`);
                      // Refresh page to show updated status
                      window.location.reload();
                    } else {
                      throw new Error('Failed to update auto-renew settings');
                    }
                  } catch (error) {
                    toast.error(error.message);
                  }
                }}
              />
            </div>
          )}

          {/* Upgrade/Downgrade Options */}
          {isActive && plan.id === 'pro' && (
            <>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => handleChangePlan('studio')}
                disabled={changingPlan || loading}
              >
                <CheckCircle className="w-4 h-4" />
                {changingPlan ? 'Processing...' : 'Upgrade to Studio Plan'}
              </Button>
              <p className="text-xs text-muted-foreground">
                100 projects, unlimited team members, custom workflows
              </p>
            </>
          )}

          {isActive && plan.id === 'studio' && (
            <>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => handleChangePlan('pro')}
                disabled={changingPlan || loading}
              >
                <CheckCircle className="w-4 h-4" />
                {changingPlan ? 'Processing...' : 'Downgrade to Pro Plan'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Change will take effect at end of current billing period
              </p>
            </>
          )}

          {/* Active Subscription - Show Cancel */}
          {isActive && plan.price > 0 && (
            <>
              <Button
                variant="destructive"
                className="w-full justify-start gap-2 font-bold text-base py-6 bg-red-600 hover:bg-red-700 shadow-xl"
                onClick={onCancel}
                disabled={loading || changingPlan}
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
                className="w-full justify-start gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-base py-6 shadow-2xl shadow-green-500/50 border-2 border-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onReactivate}
                disabled={loading || changingPlan || (subData.subscriptionEndDate && new Date(subData.subscriptionEndDate) > new Date())}
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (subData.subscriptionEndDate && new Date(subData.subscriptionEndDate) > new Date()) ? (
                  <>
                    <Clock className="w-4 h-4" />
                    Plan Ends on {new Date(subData.subscriptionEndDate).toLocaleDateString()}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Reactivate Subscription
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {(subData.subscriptionEndDate && new Date(subData.subscriptionEndDate) > new Date())
                  ? 'You cannot reactivate until your current billing period ends'
                  : `Resume your ${plan.name} plan subscription`}
              </p>
            </>
          )}

          {/* Free Plan - Show Upgrade Option */}
          {plan.id === 'free' && (
            <>
              <Button
                className="w-full justify-start gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-base py-6 shadow-2xl shadow-purple-500/50 border-2 border-purple-400"
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

          {/* Expired Subscription - Show Reactivate */}
          {!isActive && !isCancelled && plan.price > 0 && (
            <>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                    <p className="font-medium mb-1">Subscription {subData.status}</p>
                    <p>Your subscription has expired. Click below to reactivate and restore features.</p>
                  </div>
                </div>
              </div>
              <Button
                className="w-full justify-start gap-2 bg-primary hover:bg-primary/90"
                onClick={onReactivate}
                disabled={loading || changingPlan}
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Reactivate {plan.name} Plan
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Opens payment gateway to resume your subscription
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
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`font-semibold ${invoice.amount < 0 ? 'text-green-600' : ''}`}>
                      {invoice.amount !== undefined && invoice.amount !== null ? (invoice.amount < 0 ? '+' : '') + '₹' + Math.abs(invoice.amount) : '₹0.00'}
                    </p>
                    {invoice.metadata?.prorated && (
                      <p className="text-xs text-muted-foreground">
                        {invoice.metadata.unusedDays}/{invoice.metadata.totalDays} days
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {invoice.razorpayPaymentId && (
                      <p>Pay ID: {invoice.razorpayPaymentId.substring(0, 12)}...</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AlertDialog open={showPlanChangeDialog} onOpenChange={setShowPlanChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Plan Change</AlertDialogTitle>
            <AlertDialogDescription>
              {getPlanChangeDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executePlanChange}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
