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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../ui/alert-dialog';
import {
  MoreVertical,
  Eye,
  Download,
  Send,
  CreditCard,
  X,
  Edit,
  RefreshCw,
  Trash2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceRowActions({
  invoice,
  onView,
  onDownload,
  onSend,
  onPay,
  onEdit,
  onDelete,
  onResend,
  pendingAction
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const canPay = invoice.status === 'pending';
  const canDownload = true;
  const canSend = invoice.status !== 'draft';

  const isAnyActionPending =
    pendingAction?.invoiceId === invoice._id && pendingAction?.type !== 'view';
  const isDeleting =
    pendingAction?.invoiceId === invoice._id && pendingAction?.type === 'delete';
  const isResending =
    pendingAction?.invoiceId === invoice._id && pendingAction?.type === 'resend';

  const closeMenu = () => setIsOpen(false);

  const handleAction = async (callback) => {
    closeMenu();
    try {
      await callback?.();
    } catch (error) {
      // Errors are toasted in the calling hooks; keep this silent to avoid duplicates
      console.error('Invoice row action failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    try {
      await onDelete(invoice);
      setShowDeleteDialog(false);
    } catch (error) {
      // Error already handled in parent component, just keep dialog open
      console.error('Delete action failed:', error);
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-800"
            disabled={isAnyActionPending}
            aria-label="Invoice actions"
          >
            <MoreVertical className="w-4 h-4 text-slate-400" />
            <span className="sr-only">Open invoice actions menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 bg-slate-900 border-slate-800"
        >
          <DropdownMenuItem
            onClick={() => handleAction(() => onView?.())}
            className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
          >
            <Eye className="w-4 h-4 mr-2 text-blue-400" />
            <span>View Details</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              closeMenu();
              onEdit?.(invoice);
            }}
            className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
          >
            <Edit className="w-4 h-4 mr-2 text-emerald-400" />
            <span>Edit</span>
          </DropdownMenuItem>

          {canDownload && (
            <DropdownMenuItem
              onClick={() => handleAction(() => onDownload?.())}
              className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
            >
              <Download className="w-4 h-4 mr-2 text-green-400" />
              <span>Download PDF</span>
            </DropdownMenuItem>
          )}

          {canSend && (
            <DropdownMenuItem
              onClick={() => handleAction(() => onSend?.())}
              className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
            >
              <Send className="w-4 h-4 mr-2 text-purple-400" />
              <span>Send to Client</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={async () => {
              if (isResending || !onResend) return;
              closeMenu();
              try {
                await onResend(invoice);
              } catch (error) {
                // Error already handled in parent component
                console.error('Resend action failed:', error);
              }
            }}
            disabled={isResending}
            className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-sky-400" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2 text-sky-400" />
            )}
            <span>{isResending ? 'Resending...' : 'Resend'}</span>
          </DropdownMenuItem>

          {canPay && (
            <>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                onClick={() => handleAction(() => onPay?.())}
                className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
              >
                <CreditCard className="w-4 h-4 mr-2 text-amber-400" />
                <span>Pay Invoice</span>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator className="bg-slate-800" />
          <DropdownMenuItem
            onClick={() => {
              closeMenu();
              setShowDeleteDialog(true);
            }}
            className="cursor-pointer hover:bg-red-950/40 focus:bg-red-950/40 text-red-400"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            <span>Delete</span>
          </DropdownMenuItem>

          {!canDownload && (
            <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
              <X className="w-4 h-4 mr-2 text-slate-500" />
              <span className="text-xs">Local invoice</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. The invoice and its history will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-white border-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
