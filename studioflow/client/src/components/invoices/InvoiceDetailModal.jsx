import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  FileText, 
  Calendar, 
  User, 
  DollarSign,
  Download,
  Send,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building
} from 'lucide-react';
import { formatINR } from '../../utils/currency';

export default function InvoiceDetailModal({ invoice, isOpen, onClose, onDownload, onSend, onPay }) {
  if (!invoice) return null;

  const getStatusConfig = (status, dueDate) => {
    const isOverdue = status === 'pending' && new Date(dueDate) < new Date();
    
    if (isOverdue) {
      return {
        label: 'Overdue',
        icon: AlertCircle,
        className: 'bg-red-500/20 text-red-400 border-red-500/30'
      };
    }

    const statusMap = {
      paid: { label: 'Paid', icon: CheckCircle2, className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      pending: { label: 'Pending', icon: Clock, className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      draft: { label: 'Draft', icon: FileText, className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
      failed: { label: 'Failed', icon: AlertCircle, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      cancelled: { label: 'Cancelled', icon: AlertCircle, className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
    };

    return statusMap[status] || statusMap.draft;
  };

  const statusConfig = getStatusConfig(invoice.status, invoice.dueDate);
  const StatusIcon = statusConfig.icon;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const canPay = invoice.status === 'pending' && !invoice.isLocal;
  const canDownload = !invoice.isLocal;
  const canSend = !invoice.isLocal && invoice.status !== 'draft';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold mb-1">
                {invoice.invoiceNumber}
              </DialogTitle>
              <p className="text-sm text-slate-400">
                Invoice Details
              </p>
            </div>
            <Badge variant="outline" className={`${statusConfig.className} gap-1.5`}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  PROJECT
                </p>
                <p className="text-white font-medium">
                  {invoice.projectId?.title || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  CLIENT
                </p>
                <p className="text-white font-medium">
                  {invoice.client?.name || 'N/A'}
                </p>
                {invoice.client?.email && (
                  <p className="text-sm text-slate-400">
                    {invoice.client.email}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  ISSUE DATE
                </p>
                <p className="text-white font-medium">
                  {formatDate(invoice.issueDate || invoice.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  DUE DATE
                </p>
                <p className="text-white font-medium">
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Invoice Items</h3>
            </div>
            <div className="divide-y divide-slate-800">
              {invoice.items?.map((item, index) => (
                <div key={index} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <p className="text-white font-medium">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                      )}
                    </div>
                    <p className="text-white font-semibold">
                      {formatINR(item.amount || (item.quantity * item.rate))}
                    </p>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500 mt-2">
                    <span>Qty: {item.quantity}</span>
                    <span>×</span>
                    <span>Rate: {formatINR(item.rate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-white">{formatINR(invoice.subtotal)}</span>
              </div>
              
              {invoice.tax?.amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    Tax ({invoice.tax.percentage}%)
                  </span>
                  <span className="text-white">{formatINR(invoice.tax.amount)}</span>
                </div>
              )}
              
              {invoice.discount?.amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    Discount ({invoice.discount.percentage}%)
                  </span>
                  <span className="text-white">-{formatINR(invoice.discount.amount)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-700">
                <span className="text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Total
                </span>
                <span className="text-white">{formatINR(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-2">NOTES</p>
              <p className="text-sm text-slate-300">{invoice.notes}</p>
            </div>
          )}

          {/* Payment Info */}
          {invoice.status === 'paid' && invoice.paidAt && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <p className="text-green-400 font-semibold mb-1">Payment Received</p>
                  <p className="text-sm text-slate-300">
                    Paid on {formatDate(invoice.paidAt)}
                  </p>
                  {invoice.razorpayPaymentId && (
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Payment ID: {invoice.razorpayPaymentId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
            {canDownload && (
              <Button
                onClick={() => {
                  onDownload?.();
                  onClose();
                }}
                variant="outline"
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            )}
            
            {canSend && (
              <Button
                onClick={() => {
                  onSend?.();
                  onClose();
                }}
                variant="outline"
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Send to Client
              </Button>
            )}
            
            {canPay && (
              <Button
                onClick={() => {
                  onPay?.();
                  onClose();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            )}
            
            <Button
              onClick={onClose}
              variant="ghost"
              className="ml-auto text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
