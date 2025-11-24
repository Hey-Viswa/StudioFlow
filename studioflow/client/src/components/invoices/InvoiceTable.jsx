import { useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
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
  Loader2
} from 'lucide-react';
import InvoiceRowActions from './InvoiceRowActions';
import { formatINR } from '../../utils/currency';

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
  { value: 'pending', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
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

const getStatusBadge = (status, dueDate) => {
  const isOverdue = status === 'pending' && new Date(dueDate) < new Date();
  if (isOverdue) {
    return <Badge variant="destructive">Overdue</Badge>;
  }

  const statusConfig = {
    paid: { label: 'Paid', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    pending: { label: 'Sent', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    draft: { label: 'Draft', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    failed: { label: 'Failed', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    cancelled: { label: 'Cancelled', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
  };

  const config = statusConfig[status] || statusConfig.draft;
  return (
    <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
      {config.label}
    </Badge>
  );
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
  onDeleteInvoice,
  onResendInvoice,
  onStatusUpdate
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(null);

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
      await callback(invoice);
    } finally {
      setPendingAction(null);
    }
  };

  const handleStatusChange = async (invoice, nextStatus) => {
    if (!onStatusUpdate || invoice.status === nextStatus) return;
    setStatusUpdating(invoice._id);
    try {
      await onStatusUpdate(invoice, nextStatus);
    } finally {
      setStatusUpdating(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-slate-800">
      <div className="p-4 border-b border-slate-800 space-y-4">
        <div className="flex flex-col gap-3">
          <Tabs value={statusFilter} onValueChange={onStatusFilterChange}>
            <TabsList className="bg-slate-900/60 border border-slate-800">
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
          <TableHeader className="bg-slate-900/50">
            <TableRow className="border-b border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Invoice</TableHead>
              <TableHead className="text-slate-400">Project</TableHead>
              <TableHead className="text-slate-400">Client</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Due Date</TableHead>
              <TableHead className="text-right text-slate-400">Amount</TableHead>
              <TableHead className="text-right text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-800">
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400 mb-1">No invoices found</p>
                  <p className="text-sm text-slate-500">
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
                  className="hover:bg-slate-900/50 transition-colors border-slate-800"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-slate-800 rounded">
                        <FileText className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-mono font-medium text-white">
                          {invoice.invoiceNumber}
                        </p>
                        {invoice.resendCount > 0 && (
                          <p className="text-[10px] text-slate-500">
                            Resent {invoice.resendCount}x
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-white truncate max-w-[200px]">
                      {invoice.projectId?.title || 'N/A'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-white">
                      {invoice.client?.name || 'N/A'}
                    </p>
                    {invoice.client?.email && (
                      <p className="text-xs text-slate-500 truncate max-w-[150px]">
                        {invoice.client.email}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-auto px-0">
                          {statusUpdating === invoice._id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          ) : (
                            getStatusBadge(invoice.status, invoice.dueDate)
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 bg-slate-900 border-slate-800">
                        <Select
                          value={invoice.status}
                          onValueChange={(value) => handleStatusChange(invoice, value)}
                        >
                          <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 text-white border-slate-800">
                            {INLINE_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-white">{formatDate(invoice.dueDate)}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {formatINR(invoice.total)}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <InvoiceRowActions
                      invoice={invoice}
                      pendingAction={pendingAction}
                      onView={() => onViewInvoice(invoice)}
                      onEdit={() => onEditInvoice?.(invoice)}
                      onDownload={() => handleRowAction(invoice, 'download', () => onDownloadInvoice?.(invoice))}
                      onSend={() => handleRowAction(invoice, 'send', () => onSendInvoice?.(invoice))}
                      onPay={() => handleRowAction(invoice, 'pay', () => onPayInvoice?.(invoice))}
                      onDelete={(inv) => handleRowAction(inv, 'delete', () => onDeleteInvoice?.(inv))}
                      onResend={(inv) => handleRowAction(inv, 'resend', () => onResendInvoice?.(inv))}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {pageStart} - {pageEnd} of {totalCount} invoices
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
