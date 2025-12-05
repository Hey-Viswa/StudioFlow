import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Loader2, Send, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function SendInvoiceModal({ invoice, isOpen, onClose, onSend }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: invoice?.client?.email || '',
    subject: `Invoice ${invoice?.invoiceNumber} from StudioFlow`,
    message: `Hi ${invoice?.client?.name || 'there'},\n\nPlease find attached the invoice ${invoice?.invoiceNumber} for your review.\n\nThank you for your business!`
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      toast.error('Email address is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      await onSend(formData);
      onClose();
      
      // Reset form
      setFormData({
        email: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Failed to send invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Send Invoice
          </DialogTitle>
          <DialogDescription>
            Send invoice {invoice?.invoiceNumber} to your client via email
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Email */}
          <div>
            <Label className="mb-2 block flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Client Email *
            </Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="client@example.com"
              required
            />
          </div>

          {/* Subject */}
          <div>
            <Label className="mb-2 block">Email Subject *</Label>
            <Input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Invoice subject line"
              required
            />
          </div>

          {/* Message */}
          <div>
            <Label className="mb-2 block">Message</Label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Optional message to include in the email..."
              className="resize-none"
              rows={6}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The invoice PDF will be automatically attached to this email
            </p>
          </div>

          {/* Invoice Preview */}
          <div className="p-4 bg-muted border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">INVOICE DETAILS</p>
            <div className="space-y-1">
              <p className="text-sm font-mono">{invoice?.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">
                Amount: <span className="text-foreground font-semibold">
                  ₹{invoice?.total?.toFixed(2)}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Due: {invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose} 
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
