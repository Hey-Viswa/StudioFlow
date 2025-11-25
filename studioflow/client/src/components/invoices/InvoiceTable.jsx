import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Calendar } from '../ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Calendar as CalendarIcon,
  Check,
  X,
  Edit2,
  MoreVertical,
  Trash2,
  Download
} from 'lucide-react';
import InvoiceRowActions from './InvoiceRowActions';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import { formatINR } from '../../utils/currency';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' }
];

const INLINE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' }
];

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function InvoiceTable({
  invoices,
  pagination,
  loading,
  statusFilter,
  onStatusFilterChange,
  onSearchChange,
  onPageChange,
  onViewInvoice,
  onDownloadInvoice,
  onSendInvoice,
  onPayInvoice,
  onEditInvoice,
  onInlineUpdate,
  onDeleteInvoice,
  onResendInvoice,
  onStatusUpdate,
  onRefresh
}) {
  const { getToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [editingField, setEditingField] = useState(null); // { invoiceId, field: 'dueDate'|'amount' }
  const [editValue, setEditValue] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      onSearchChange?.(searchTerm);
    }, 400);

    return () => clearTimeout(handle);
  }, [searchTerm, onSearchChange]);

  const totalPages = pagination?.totalPages || 1;
  const currentPage = pagination?.page || 1;
  const totalCount = pagination?.total || invoices.length;
  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * (pagination?.limit || invoices.length) + 1;
  const pageEnd = Math.min(currentPage * (pagination?.limit || invoices.length), totalCount);

  const handleRowAction = async (invoice, type, callback) => {
    if (!callback) return;
    setPendingAction({ invoiceId: invoice._id, type });
    try {
      await callback();
    } finally {
      setPendingAction(null);
    }
  };

  const handleStatusChange = async (invoiceId, nextStatus) => {
    const invoice = invoices.find(inv => inv._id === invoiceId);
    if (!invoice || !onStatusUpdate || invoice.status === nextStatus) return;
    setStatusUpdating(invoiceId);
    try {
      await onStatusUpdate(invoiceId, nextStatus);
    } finally {
      setStatusUpdating(null);
    }
  };

  const startEditing = (invoice, field) => {
    setEditingField({ invoiceId: invoice._id, field });
    if (field === 'dueDate') {
      setEditValue(invoice.dueDate ? format(new Date(invoice.dueDate), 'yyyy-MM-dd') : '');
    } else if (field === 'amount') {
      setEditValue(invoice.total?.toString() || '0');
    }
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async (invoice) => {
    if (!editingField || !onInlineUpdate) return;
    
    const { field } = editingField;
    const updates = { _id: invoice._id }; // Only include the ID
    
    if (field === 'dueDate') {
      updates.dueDate = new Date(editValue);
    } else if (field === 'amount') {
      const newTotal = parseFloat(editValue);
      if (isNaN(newTotal) || newTotal < 0) {
        toast.error('Invalid amount');
        return;
      }
      updates.total = newTotal;
    }
    
    try {
      // Pass only the updates object with _id and the changed field
      await onInlineUpdate(updates);
      cancelEditing();
    } catch (error) {
      console.error('Failed to save edit:', error);
    }
  };

  const handleDeleteClick = (invoice) => {
    setShowDeleteDialog(invoice);
  };

  const confirmDelete = async () => {
    if (!showDeleteDialog || !onDeleteInvoice) return;
    try {
      await onDeleteInvoice(showDeleteDialog._id);
      setShowDeleteDialog(null);
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };



  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 border-b space-y-4">
        <div className="flex flex-col gap-3">
          <Tabs value={statusFilter} onValueChange={onStatusFilterChange}>
            <TabsList>
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Input
              type="text"
              placeholder="Search invoices, clients, projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground">Invoice</TableHead>
              <TableHead className="text-muted-foreground">Project</TableHead>
              <TableHead className="text-muted-foreground">Client</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Due Date</TableHead>
              <TableHead className="text-right text-muted-foreground">Amount</TableHead>
              <TableHead className="text-right text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-1">No invoices found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first invoice to get started'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow
                  key={invoice._id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-muted rounded">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-mono font-medium">
                          {invoice.invoiceNumber}
                        </p>
                        {invoice.resendCount > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            Resent {invoice.resendCount}x
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm truncate max-w-[200px]">
                      {invoice.projectId?.title || 'N/A'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {invoice.client?.name || 'N/A'}
                    </p>
                    {invoice.client?.email && (
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {invoice.client.email}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge
                      status={invoice.status === 'pending' && new Date(invoice.dueDate) < new Date() ? 'overdue' : invoice.status}
                      invoiceId={invoice._id}
                      onStatusChange={handleStatusChange}
                      loading={statusUpdating === invoice._id}
                      allowEdit={true}
                    />
                  </TableCell>
                  <TableCell>
                    {editingField?.invoiceId === invoice._id && editingField?.field === 'dueDate' ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 w-36 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => saveEdit(invoice)}
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={cancelEditing}
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 group"
                        onClick={() => startEditing(invoice, 'dueDate')}
                      >
                        <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                        <span>{formatDate(invoice.dueDate)}</span>
                        <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingField?.invoiceId === invoice._id && editingField?.field === 'amount' ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 w-28 text-sm text-right"
                          autoFocus
                          step="0.01"
                          min="0"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => saveEdit(invoice)}
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={cancelEditing}
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="font-medium cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 inline-flex items-center gap-2 group"
                        onClick={() => startEditing(invoice, 'amount')}
                      >
                        <span>{formatINR(invoice.total)}</span>
                        <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
                        onClick={() => onDownloadInvoice?.(invoice)}
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => onEditInvoice?.(invoice)}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDeleteClick(invoice)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {pageStart} - {pageEnd} of {totalCount} invoices
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      
      <DeleteConfirmDialog
        invoice={showDeleteDialog}
        open={!!showDeleteDialog}
        onOpenChange={(open) => !open && setShowDeleteDialog(null)}
        onConfirm={confirmDelete}
      />
    </Card>
  );
}

// Delete confirmation dialog component
function DeleteConfirmDialog({ invoice, open, onOpenChange, onConfirm }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete invoice{' '}
            <span className="font-mono font-medium">{invoice?.invoiceNumber}</span>?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
