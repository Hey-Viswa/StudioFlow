import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Plus, FileText, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { getProjectInvoices, resendInvoice } from '../lib/projectInvoiceApi';
import InvoiceStatusBadge from './invoices/InvoiceStatusBadge';
import { formatINR } from '../utils/currency';

export default function ProjectInvoiceList({ projectId, clients, userRole }) {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const isClient = userRole === 'client';

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

  const handleResend = async (invoiceId) => {
    try {
      await resendInvoice(invoiceId, getToken);
      toast.success('Invoice resent successfully');
    } catch (error) {
      console.error('Failed to resend invoice:', error);
      toast.error(error.message || 'Failed to resend invoice');
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [projectId]);

  if (loading) {
    return <div className="text-slate-400">Loading invoices...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Invoices</h3>
        {!isClient && (
          <Button onClick={() => navigate('/dashboard/invoices/new')} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New Invoice
          </Button>
        )}
      </div>

      {invoices.length === 0 ? (
        <Card className="bg-card border-border p-6 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No invoices yet</p>
          {!isClient && (
            <Button onClick={() => navigate('/dashboard/invoices/new')}>
              Create First Invoice
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => {
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
                        {formatINR(invoice.total)}
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <InvoiceStatusBadge
                          status={invoice.status}
                          isOverdue={invoice.isOverdue}
                          allowEdit={false}
                        />
                        {!isClient && ['pending', 'sent', 'paid', 'overdue'].includes(invoice.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => handleResend(invoice._id)}
                            title="Resend Invoice"
                          >
                            <Send className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
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
