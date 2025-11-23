import { useState } from 'react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { 
  MoreVertical, 
  Eye, 
  Download, 
  Send, 
  CreditCard,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceRowActions({ 
  invoice, 
  onView, 
  onDownload, 
  onSend, 
  onPay 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const canPay = invoice.status === 'pending';
  const canDownload = true;
  const canSend = invoice.status !== 'draft';

  const handleView = () => {
    setIsOpen(false);
    onView?.();
  };

  const handleDownload = async () => {
    setIsOpen(false);
    onDownload?.();
  };

  const handleSend = async () => {
    setIsOpen(false);
    if (!canSend) {
      toast.error('Cannot send draft invoices');
      return;
    }
    onSend?.();
  };

  const handlePay = async () => {
    setIsOpen(false);
    if (!canPay) {
      toast.error('Payment not available for this invoice');
      return;
    }
    onPay?.();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 w-8 p-0 hover:bg-slate-800"
        >
          <MoreVertical className="w-4 h-4 text-slate-400" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 bg-slate-900 border-slate-800"
      >
        <DropdownMenuItem 
          onClick={handleView}
          className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
        >
          <Eye className="w-4 h-4 mr-2 text-blue-400" />
          <span>View Details</span>
        </DropdownMenuItem>

        {canDownload && (
          <DropdownMenuItem 
            onClick={handleDownload}
            className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
          >
            <Download className="w-4 h-4 mr-2 text-green-400" />
            <span>Download PDF</span>
          </DropdownMenuItem>
        )}

        {canSend && (
          <DropdownMenuItem 
            onClick={handleSend}
            className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
          >
            <Send className="w-4 h-4 mr-2 text-purple-400" />
            <span>Send to Client</span>
          </DropdownMenuItem>
        )}

        {canPay && (
          <>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem 
              onClick={handlePay}
              className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
            >
              <CreditCard className="w-4 h-4 mr-2 text-amber-400" />
              <span>Pay Invoice</span>
            </DropdownMenuItem>
          </>
        )}

        {!canDownload && (
          <DropdownMenuItem 
            disabled
            className="opacity-50 cursor-not-allowed"
          >
            <X className="w-4 h-4 mr-2 text-slate-500" />
            <span className="text-xs">Local invoice</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
