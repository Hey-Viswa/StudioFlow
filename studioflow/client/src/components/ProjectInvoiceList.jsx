import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Plus, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getProjectInvoices } from '../lib/projectInvoiceApi';

export default function ProjectInvoiceList({ projectId, clients }) {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const result = await getProjectInvoices(projectId, getToken);
      setInvoices(result.invoices || []);
    } catch (error) {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [projectId]);

  const statusConfig = {
    draft: { icon: FileText, color: 'bg-muted text-muted-foreground border-border' },
    pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    paid: { icon: CheckCircle2, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    failed: { icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    cancelled: { icon: XCircle, color: 'bg-muted text-muted-foreground border-border' }
  };

  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return <div className="text-slate-400">Loading invoices...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Invoices</h3>
        <Button onClick={() => navigate('/dashboard/invoices/new')} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card className="bg-card border-border p-6 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No invoices yet</p>
          <Button onClick={() => navigate('/dashboard/invoices/new')}>
            Create First Invoice
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => {
            const StatusIcon = statusConfig[invoice.status]?.icon || FileText;
            
            return (
              <Card key={invoice._id} className="bg-card border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground font-mono text-sm">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white">
                        {formatCurrency(invoice.total)}
                      </p>
                      <Badge variant="outline" className={statusConfig[invoice.status]?.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
