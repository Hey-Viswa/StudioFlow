import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  AlertCircle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { calculateInvoiceTotal, formatINR } from '../../utils/currency';
import api, { getApiUrl } from '../../lib/api';

const generateItemId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const createDefaultItem = () => ({
  id: generateItemId(),
  title: '',
  description: '',
  quantity: 1,
  rate: 0,
});

const normalizeDateInput = (date) => {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
};

const getClientKey = (client = {}) => client.userId || client.email || client.name || 'client';

const buildStatusConfig = (status, dueDate) => {
  const isOverdue = status === 'pending' && dueDate && new Date(dueDate) < new Date();
  if (isOverdue) {
    return {
      label: 'Overdue',
      icon: AlertCircle,
      className: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
  }

  const statusMap = {
    paid: { label: 'Paid', icon: CheckCircle2, className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    pending: { label: 'Pending', icon: Clock, className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    draft: { label: 'Draft', icon: FileText, className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    failed: { label: 'Failed', icon: AlertCircle, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    cancelled: { label: 'Cancelled', icon: AlertCircle, className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  };

  return statusMap[status] || statusMap.draft;
};

const buildFormState = (invoice) => {
  if (!invoice) {
    return {
      projectId: '',
      client: { name: '', email: '', userId: '', value: '' },
      issueDate: '',
      dueDate: '',
      notes: '',
      taxPercentage: 0,
      discountPercentage: 0,
      items: [createDefaultItem()],
    };
  }

  const items = (invoice.items || []).map((item, index) => {
    const quantity = item.quantity || 1;
    const inferredRate = item.rate ?? (item.amount && quantity ? item.amount / quantity : 0);
    return {
      id: item._id || `${invoice._id}-${index}`,
      title: item.title || '',
      description: item.description || '',
      quantity,
      rate: inferredRate || 0,
    };
  });

  return {
    projectId: typeof invoice.projectId === 'object' ? invoice.projectId?._id || '' : invoice.projectId || '',
    client: {
      ...invoice.client,
      value: getClientKey(invoice.client),
    },
    issueDate: normalizeDateInput(invoice.issueDate || invoice.createdAt),
    dueDate: normalizeDateInput(invoice.dueDate),
    notes: invoice.notes || '',
    taxPercentage: invoice.tax?.percentage ?? 0,
    discountPercentage: invoice.discount?.percentage ?? 0,
    items: items.length ? items : [{ ...createDefaultItem(), id: `${invoice._id}-fallback` }],
  };
};

export default function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
  onSend,
  onPay,
  keepOpenOnSave = false,
  actions = {},
}) {
  const { getToken } = useAuth();
  const [localInvoice, setLocalInvoice] = useState(invoice);
  const [formState, setFormState] = useState(buildFormState(invoice));
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectOptions, setProjectOptions] = useState([]);
  const [clientOptions, setClientOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const {
    updateInvoice,
    deleteInvoice,
    resendInvoice,
    refreshInvoices,
  } = actions;

  useEffect(() => {
    if (invoice && isOpen) {
      setLocalInvoice(invoice);
      setFormState(buildFormState(invoice));
      setIsEditMode(false);
    }
  }, [invoice, isOpen]);

  const fetchProjects = useCallback(async () => {
    if (!isOpen) return;
    try {
      setLoadingOptions(true);
      const response = await api.get('/projects', { getToken });
      const projects = response.projects || response.data?.projects || response || [];
      setProjectOptions(projects);

      const clientMap = new Map();
      projects.forEach((project) => {
        project.members?.forEach((member) => {
          if (member.role === 'client') {
            const key = getClientKey(member);
            if (!clientMap.has(key)) {
              clientMap.set(key, {
                name: member.name || 'Client',
                email: member.email || '',
                userId: member.userId || '',
                value: key,
              });
            }
          }
        });
      });

      if (invoice?.client) {
        const key = getClientKey(invoice.client);
        if (!clientMap.has(key)) {
          clientMap.set(key, {
            ...invoice.client,
            value: key,
          });
        }
      }

      setClientOptions(Array.from(clientMap.values()));
    } catch (error) {
      console.error('Failed to load projects for invoice modal:', error);
      toast.error('Failed to load related projects', {
        description: error.message,
      });
    } finally {
      setLoadingOptions(false);
    }
  }, [
    getToken,
    isOpen,
    invoice?.client?.email,
    invoice?.client?.name,
    invoice?.client?.userId,
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen, fetchProjects]);

  const totals = useMemo(
    () => calculateInvoiceTotal(formState.items, formState.taxPercentage, formState.discountPercentage),
    [formState.items, formState.taxPercentage, formState.discountPercentage],
  );

  if (!invoice) return null;

  const statusConfig = buildStatusConfig(localInvoice?.status, localInvoice?.dueDate);
  const StatusIcon = statusConfig.icon;

  const selectedProject = useMemo(() => {
    if (!formState.projectId) {
      return typeof localInvoice?.projectId === 'object' ? localInvoice.projectId : null;
    }
    return projectOptions.find((project) => project._id === formState.projectId)
      || (typeof localInvoice?.projectId === 'object' ? localInvoice.projectId : null);
  }, [formState.projectId, projectOptions, localInvoice?.projectId]);

  const handleItemChange = (index, field, value) => {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addLineItem = () => {
    setFormState((prev) => ({
      ...prev,
      items: [...prev.items, createDefaultItem()],
    }));
  };

  const removeItem = (index) => {
    setFormState((prev) => {
      if (prev.items.length === 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, idx) => idx !== index),
      };
    });
  };

  const validateForm = () => {
    if (!formState.projectId) {
      toast.error('Project selection is required');
      return false;
    }

    if (!formState.client?.name) {
      toast.error('Customer selection is required');
      return false;
    }

    if (!formState.issueDate || !formState.dueDate) {
      toast.error('Invoice and due dates are required');
      return false;
    }

    if (new Date(formState.dueDate) < new Date(formState.issueDate)) {
      toast.error('Due date cannot be before the invoice date');
      return false;
    }

    if (!formState.items.length) {
      toast.error('Add at least one line item');
      return false;
    }

    const invalidItem = formState.items.some((item) => (
      !item.title?.trim()
      || item.quantity <= 0
      || item.rate <= 0
    ));

    if (invalidItem) {
      toast.error('Each line item needs a title, quantity, and positive rate');
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    projectId: formState.projectId,
    client: {
      name: formState.client?.name,
      email: formState.client?.email,
      userId: formState.client?.userId,
    },
    issueDate: formState.issueDate,
    dueDate: formState.dueDate,
    notes: formState.notes,
    tax: { percentage: parseFloat(formState.taxPercentage) || 0 },
    discount: { percentage: parseFloat(formState.discountPercentage) || 0 },
    items: formState.items.map((item) => ({
      title: item.title,
      description: item.description,
      quantity: Number(item.quantity) || 1,
      rate: Number(item.rate) || 0,
    })),
  });

  const handleSave = async () => {
    if (!updateInvoice || !validateForm()) return;
    setIsSaving(true);
    try {
      const payload = buildPayload();
      const response = await updateInvoice(localInvoice._id, payload);
      const updated = response?.invoice || response?.data?.invoice;

      if (updated) {
        setLocalInvoice(updated);
        setFormState(buildFormState(updated));
      }

      refreshInvoices?.();

      if (keepOpenOnSave) {
        setIsEditMode(false);
      } else {
        onClose?.();
      }
    } catch (error) {
      console.error('Failed to save invoice changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteInvoice) return;
    setIsDeleting(true);
    try {
      await deleteInvoice(localInvoice._id);
      refreshInvoices?.();
      setDeleteDialogOpen(false);
      onClose?.();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!localInvoice) return;
    setIsDownloading(true);
    try {
      const token = await getToken?.();
      const endpoint = getApiUrl(`/invoices/${localInvoice._id || localInvoice.invoiceNumber}/pdf`);
      const response = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error('Unable to download invoice PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `invoice-${localInvoice.invoiceNumber || localInvoice._id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed', { description: error.message });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleResend = async () => {
    if (!resendInvoice) return;
    setIsResending(true);
    try {
      await resendInvoice(localInvoice._id);
      refreshInvoices?.();
    } catch (error) {
      console.error('Failed to resend invoice:', error);
    } finally {
      setIsResending(false);
    }
  };

  const closeModal = () => {
    setIsEditMode(false);
    setDeleteDialogOpen(false);
    onClose?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold mb-1">
                  {localInvoice?.invoiceNumber || 'Invoice'}
                </DialogTitle>
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  {selectedProject?.title || 'Invoice details'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline" className={`${statusConfig.className} gap-1.5`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </Badge>
                <div className="flex items-center gap-2 text-xl font-semibold">
                  <DollarSign className="w-5 h-5" />
                  {formatINR(localInvoice?.total)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="bg-slate-800 border-slate-700 text-white"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download PDF
              </Button>

              {resendInvoice && (
                <Button
                  onClick={handleResend}
                  variant="outline"
                  className="bg-slate-800 border-slate-700 text-white"
                  disabled={isResending}
                >
                  {isResending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Resend
                </Button>
              )}

              {deleteInvoice && (
                <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!isDeleting) setDeleteDialogOpen(open); }}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-900 border border-slate-800 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">
                        This action cannot be undone. The invoice and its payment records will be permanently removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isDeleting}
                      >
                        {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Delete Invoice
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {updateInvoice && (
                <Button
                  onClick={() => {
                    if (isEditMode) {
                      setFormState(buildFormState(localInvoice));
                      setIsEditMode(false);
                    } else {
                      setIsEditMode(true);
                    }
                  }}
                  variant="outline"
                  className="bg-slate-800 border-slate-700 text-white"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Cancel' : 'Edit'}
                </Button>
              )}

              {isEditMode && updateInvoice && (
                <Button
                  onClick={handleSave}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-slate-400 mb-2 block">Project</Label>
                <Select
                  value={formState.projectId}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, projectId: value }))}
                  disabled={!isEditMode || loadingOptions}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectOptions.map((project) => (
                      <SelectItem key={project._id} value={project._id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProject?.brief && (
                  <p className="text-xs text-slate-500 mt-1">{selectedProject.brief}</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-slate-400 mb-2 block">Customer</Label>
                <Select
                  value={formState.client?.value || ''}
                  onValueChange={(value) => {
                    const customer = clientOptions.find((option) => option.value === value);
                    if (customer) {
                      setFormState((prev) => ({
                        ...prev,
                        client: customer,
                      }));
                    }
                  }}
                  disabled={!isEditMode || loadingOptions}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOptions.map((client) => (
                      <SelectItem key={client.value} value={client.value}>
                        {client.name || client.email || 'Client'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formState.client?.email && (
                  <p className="text-xs text-slate-500 mt-1">{formState.client.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-400 mb-2 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Invoice Date
                </Label>
                <Input
                  type="date"
                  value={formState.issueDate}
                  onChange={(event) => setFormState((prev) => ({ ...prev, issueDate: event.target.value }))}
                  className="bg-slate-900 border-slate-700 text-white"
                  disabled={!isEditMode}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-2 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Due Date
                </Label>
                <Input
                  type="date"
                  value={formState.dueDate}
                  onChange={(event) => setFormState((prev) => ({ ...prev, dueDate: event.target.value }))}
                  className="bg-slate-900 border-slate-700 text-white"
                  disabled={!isEditMode}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-slate-300">Line Items</Label>
              {isEditMode && (
                <Button
                  type="button"
                  size="sm"
                  onClick={addLineItem}
                  variant="outline"
                  className="bg-slate-800 border-slate-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {formState.items.map((item, index) => (
                <div key={item.id || index} className="p-4 bg-slate-800 border border-slate-700 rounded-lg space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Item title"
                      value={item.title}
                      onChange={(event) => handleItemChange(index, 'title', event.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                      disabled={!isEditMode}
                    />
                    {isEditMode && formState.items.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <Textarea
                    placeholder="Description"
                    value={item.description}
                    onChange={(event) => handleItemChange(index, 'description', event.target.value)}
                    className="bg-slate-900 border-slate-700 text-white min-h-[70px]"
                    disabled={!isEditMode}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-slate-400 mb-1 block">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) => handleItemChange(index, 'quantity', Number(event.target.value))}
                        className="bg-slate-900 border-slate-700 text-white"
                        disabled={!isEditMode}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400 mb-1 block">Unit Price (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(event) => handleItemChange(index, 'rate', Number(event.target.value))}
                        className="bg-slate-900 border-slate-700 text-white"
                        disabled={!isEditMode}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400 mb-1 block">Amount</Label>
                      <Input
                        type="text"
                        value={formatINR((item.quantity || 0) * (item.rate || 0))}
                        disabled
                        className="bg-slate-900 border-slate-700 text-white opacity-70"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300 mb-2 block">Tax (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formState.taxPercentage}
                  onChange={(event) => setFormState((prev) => ({ ...prev, taxPercentage: event.target.value }))}
                  className="bg-slate-900 border-slate-700 text-white"
                  disabled={!isEditMode}
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Discount (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formState.discountPercentage}
                  onChange={(event) => setFormState((prev) => ({ ...prev, discountPercentage: event.target.value }))}
                  className="bg-slate-900 border-slate-700 text-white"
                  disabled={!isEditMode}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg space-y-2">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Subtotal</span>
                <span>{formatINR(totals.subtotal)}</span>
              </div>
              {formState.taxPercentage > 0 && (
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Tax ({formState.taxPercentage}%)</span>
                  <span>{formatINR(totals.taxAmount)}</span>
                </div>
              )}
              {formState.discountPercentage > 0 && (
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Discount ({formState.discountPercentage}%)</span>
                  <span>-{formatINR(totals.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-slate-700">
                <span>Total</span>
                <span>{formatINR(totals.total)}</span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-slate-300 mb-2 block">Notes</Label>
            <Textarea
              placeholder="Payment terms or any additional notes"
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              className="bg-slate-900 border-slate-700 text-white"
              disabled={!isEditMode}
              rows={3}
            />
          </div>

          {localInvoice?.status === 'paid' && localInvoice?.paidAt && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <p className="text-green-400 font-semibold mb-1">Payment received</p>
                  <p className="text-sm text-slate-300">
                    Paid on {new Date(localInvoice.paidAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {localInvoice.razorpayPaymentId && (
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Payment ID: {localInvoice.razorpayPaymentId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
            {onSend && (
              <Button
                onClick={() => onSend(localInvoice)}
                variant="outline"
                className="bg-slate-800 border-slate-700 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Send to Client
              </Button>
            )}

            {onPay && localInvoice?.status === 'pending' && (
              <Button
                onClick={() => onPay(localInvoice)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            )}

            <Button
              onClick={closeModal}
              variant="ghost"
              className="ml-auto text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
