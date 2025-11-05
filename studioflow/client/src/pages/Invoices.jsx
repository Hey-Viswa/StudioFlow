import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Search, 
  Plus, 
  FileText, 
  DollarSign, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Download,
  Send,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const invoices = [
    { id: 'INV-1045', project: 'Product Promo Reel', client: 'Nimbus Co.', status: 'Paid', issued: 'Aug 20', due: 'Sep 05', amount: 3200, currency: 'USD' },
    { id: 'INV-1046', project: 'Wedding Highlights', client: 'Carter Family', status: 'Pending', issued: 'Sep 01', due: 'Sep 15', amount: 2850, currency: 'USD' },
    { id: 'INV-1047', project: 'Music Video Cut', client: 'Neon Wave', status: 'Overdue', issued: 'Aug 10', due: 'Aug 25', amount: 1200, currency: 'EUR' },
    { id: 'INV-1048', project: 'Corporate Interviews', client: 'Acme Ltd.', status: 'Pending', issued: 'Sep 06', due: 'Sep 20', amount: 1900, currency: 'GBP' },
    { id: 'INV-1049', project: 'Brand Sizzle Reel', client: 'Nimbus Co.', status: 'Paid', issued: 'Aug 02', due: 'Aug 16', amount: 4150, currency: 'USD' },
    { id: 'INV-1050', project: 'Event Recap', client: 'Harbor Fest', status: 'Pending', issued: 'Sep 10', due: 'Sep 24', amount: 950, currency: 'CAD' },
  ];

  const filteredInvoices = invoices.filter(invoice => 
    invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusConfig = {
    'Paid': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Overdue': 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Paid': return <CheckCircle2 className="w-3 h-3" />;
      case 'Pending': return <Clock className="w-3 h-3" />;
      case 'Overdue': return <AlertCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'INR': '₹',
      'JPY': '¥',
    };
    return symbols[currency] || currency;
  };

  const formatAmount = (amount, currency) => {
    return `${getCurrencySymbol(currency)}${amount.toLocaleString()}`;
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
  const totalPending = invoices.filter(inv => inv.status === 'Pending').reduce((sum, inv) => sum + inv.amount, 0);
  const totalOverdue = invoices.filter(inv => inv.status === 'Overdue').reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Invoices</h2>
          <p className="text-muted-foreground text-slate-400">
            Manage your invoices and payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-slate-800">
          <div className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-400">Total Billed</p>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">${totalBilled.toLocaleString()}</p>
              <p className="text-xs text-slate-500">
                {invoices.length} invoices
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-card border-slate-800">
          <div className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-400">Paid</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">${totalPaid.toLocaleString()}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">+12.5%</span>
                <span className="ml-1">from last month</span>
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-card border-slate-800">
          <div className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-400">Pending</p>
              <Clock className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">${totalPending.toLocaleString()}</p>
              <p className="text-xs text-slate-500">
                {invoices.filter(i => i.status === 'Pending').length} invoices awaiting
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-card border-slate-800">
          <div className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-400">Overdue</p>
              <AlertCircle className="h-4 w-4 text-red-400" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">${totalOverdue.toLocaleString()}</p>
              <p className="text-xs text-slate-500">
                {invoices.filter(i => i.status === 'Overdue').length} need attention
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="bg-card border-slate-800">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Recent Invoices</h3>
              <p className="text-sm text-slate-400">You have {filteredInvoices.length} invoices in total</p>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-400">Invoice</TableHead>
                  <TableHead className="text-slate-400">Project</TableHead>
                  <TableHead className="text-slate-400">Client</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Due Date</TableHead>
                  <TableHead className="text-slate-400 text-right">Amount</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow 
                    key={invoice.id} 
                    className="border-slate-800 hover:bg-slate-800/50"
                  >
                    <TableCell className="font-medium">
                      <span className="text-white font-mono text-sm">{invoice.id}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{invoice.project}</span>
                        <span className="text-xs text-slate-400">Issued {invoice.issued}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {invoice.client}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`${statusConfig[invoice.status]} flex items-center gap-1 w-fit`}
                      >
                        {getStatusIcon(invoice.status)}
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {invoice.due}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-white">
                      {formatAmount(invoice.amount, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {invoice.status !== 'Paid' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}
