import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Plus, FileText, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { getProjectInvoices } from '../lib/projectInvoiceApi';
import GenerateInvoiceModal from './GenerateInvoiceModal';

export default function ProjectInvoiceList({ projectId, clients }) {
  const { getToken } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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
    draft: { icon: FileText, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    paid: { icon: CheckCircle2, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    failed: { icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    cancelled: { icon: XCircle, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
  };

  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return <div className="text-slate-400">Loading invoices...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Invoices</h3>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card className="bg-card border-slate-800 p-6 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 mb-4">No invoices yet</p>
          <Button onClick={() => setShowModal(true)}>
            Create First Invoice
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => {
            const StatusIcon = statusConfig[invoice.status]?.icon || FileText;
            
            return (
              <Card key={invoice._id} className="bg-card border-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-md bg-slate-800 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white font-mono text-sm">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-slate-400">
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

                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <GenerateInvoiceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        projectId={projectId}
        clients={clients}
        onSuccess={fetchInvoices}
      />
    </div>
  );
}
