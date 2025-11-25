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
  Loader2,
  Calendar as CalendarIcon
} from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceRowActions({
  invoice,
  onView,
  onDownload,
  onSend,
  onPay,
  onEdit,
  onEditDueDate,
  onEditAmount,
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
    pendingAction?.invoiceId === invoice._id && pendingAction?.type !== 'view' && pendingAction?.type !== 'edit';
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
      await onDelete();
      setShowDeleteDialog(false);
      toast.success('Invoice deleted successfully');
    } catch (error) {
      // Error already handled in parent component, just keep dialog open
      console.error('Delete action failed:', error);
      toast.error('Failed to delete invoice', {
        description: error.message || 'Please try again'
      });
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            disabled={isDeleting}
            aria-label="Invoice actions"
          >
            <MoreVertical className="w-4 h-4" />
            <span className="sr-only">Open invoice actions menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={() => handleAction(() => onView?.())}
            className="cursor-pointer"
          >
            <Eye className="w-4 h-4 mr-2" />
            <span>View Details</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => handleAction(() => onEdit?.())}
            className="cursor-pointer"
          >
            <Edit className="w-4 h-4 mr-2" />
            <span>Edit</span>
          </DropdownMenuItem>

          {onEditDueDate && (
            <DropdownMenuItem
              onSelect={() => {
                closeMenu();
                onEditDueDate();
              }}
              className="cursor-pointer"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              <span>Edit Due Date</span>
            </DropdownMenuItem>
          )}

          {onEditAmount && (
            <DropdownMenuItem
              onSelect={() => {
                closeMenu();
                onEditAmount();
              }}
              className="cursor-pointer"
            >
              <Edit className="w-4 h-4 mr-2" />
              <span>Edit Amount</span>
            </DropdownMenuItem>
          )}

          {canDownload && (
            <DropdownMenuItem
              onSelect={() => handleAction(() => onDownload?.())}
              className="cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" />
              <span>Download PDF</span>
            </DropdownMenuItem>
          )}

          {canSend && (
            <DropdownMenuItem
              onSelect={() => handleAction(() => onSend?.())}
              className="cursor-pointer"
            >
              <Send className="w-4 h-4 mr-2" />
              <span>Send to Client</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onSelect={async (e) => {
              if (isResending || !onResend) return;
              e.preventDefault();
              closeMenu();
              try {
                await onResend();
                toast.success('Invoice resent successfully');
              } catch (error) {
                console.error('Resend action failed:', error);
                toast.error('Failed to resend invoice', {
                  description: error.message || 'Please try again'
                });
              }
            }}
            disabled={isResending}
            className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            <span>{isResending ? 'Resending...' : 'Resend'}</span>
          </DropdownMenuItem>

          {canPay && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => handleAction(() => onPay?.())}
                className="cursor-pointer"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                <span>Pay Invoice</span>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              closeMenu();
              setShowDeleteDialog(true);
            }}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            <span>Delete</span>
          </DropdownMenuItem>

          {!canDownload && (
            <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
              <X className="w-4 h-4 mr-2" />
              <span className="text-xs">Local invoice</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The invoice {invoice.invoiceNumber} and its history will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
