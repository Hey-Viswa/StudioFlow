import { useState } from 'react';
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
} from "../ui/table";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Filter
} from 'lucide-react';
import InvoiceRowActions from './InvoiceRowActions';
import { formatINR } from '../../utils/currency';

export default function InvoiceTable({ 
  invoices, 
  loading, 
  onViewInvoice,
  onDownloadInvoice,
  onSendInvoice,
  onPayInvoice 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.projectId?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

  // Status badge config
  const getStatusBadge = (status, dueDate) => {
    // Check if overdue
    const isOverdue = status === 'pending' && new Date(dueDate) < new Date();
    
    if (isOverdue) {
      return (
        <Badge variant="destructive" className="gap-1.5">
          Overdue
        </Badge>
      );
    }

    const statusConfig = {
      paid: { variant: 'default', label: 'Paid', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      pending: { variant: 'secondary', label: 'Pending', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      draft: { variant: 'outline', label: 'Draft', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
      failed: { variant: 'destructive', label: 'Failed', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      cancelled: { variant: 'outline', label: 'Cancelled', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className={`gap-1.5 ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
      {/* Header with Search and Filters */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search invoices, clients, projects..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 bg-slate-900 border-slate-700 text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
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
            {paginatedInvoices.length === 0 ? (
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
              paginatedInvoices.map((invoice) => (
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
                        {invoice.isLocal && (
                          <p className="text-xs text-amber-500">Local</p>
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
                    {getStatusBadge(invoice.status, invoice.dueDate)}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-white">
                      {formatDate(invoice.dueDate)}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {formatINR(invoice.total)}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <InvoiceRowActions
                      invoice={invoice}
                      onView={() => onViewInvoice(invoice)}
                      onDownload={() => onDownloadInvoice(invoice)}
                      onSend={() => onSendInvoice(invoice)}
                      onPay={() => onPayInvoice(invoice)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
