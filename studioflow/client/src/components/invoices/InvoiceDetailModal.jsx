import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@clerk/clerk-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
  Download,
  Edit,
  Loader2,
  Send,
  Trash2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import api from '../../lib/api';
import { formatINR, calculateInvoiceTotal } from '../../utils/currency';
import { newInvoiceSchema } from '../../lib/validations/invoice';
import InvoiceItemRow from './InvoiceItemRow';
import { cn } from '../../lib/utils';

const STATUS_CONFIG = {
  draft: { label: 'Draft', icon: FileText, variant: 'secondary' },
  pending: { label: 'Sent', icon: Clock, variant: 'default' },
  paid: { label: 'Paid', icon: CheckCircle2, variant: 'default' },
  overdue: { label: 'Overdue', icon: AlertCircle, variant: 'destructive' },
  cancelled: { label: 'Cancelled', icon: AlertCircle, variant: 'secondary' },
};

export default function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
  mode = 'view', // 'view' | 'edit'
  onSave,
  onDelete,
  onResend,
  onDownload,
}) {
  const { getToken } = useAuth();
  const [isEditMode, setIsEditMode] = useState(mode === 'edit');
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(newInvoiceSchema),
    defaultValues: {
      projectId: invoice?.projectId?._id || '',
      items: invoice?.items?.map(item => ({
        title: item.title || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        rate: item.rate || 0,
      })) || [{ title: '', description: '', quantity: 1, rate: 0 }],
      dueDate: invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
      tax: { percentage: invoice?.tax?.percentage || 0 },
      discount: { percentage: invoice?.discount?.percentage || 0 },
      notes: invoice?.notes || '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');
  const watchedTax = form.watch('tax.percentage') || 0;
  const watchedDiscount = form.watch('discount.percentage') || 0;

  // Calculate totals
  const totals = useMemo(() => {
    return calculateInvoiceTotal(watchedItems, watchedTax, watchedDiscount);
  }, [watchedItems, watchedTax, watchedDiscount]);

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice && isOpen) {
      form.reset({
        projectId: invoice.projectId?._id || '',
        items: invoice.items?.map(item => ({
          title: item.title || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          rate: item.rate || 0,
        })) || [{ title: '', description: '', quantity: 1, rate: 0 }],
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        tax: { percentage: invoice.tax?.percentage || 0 },
        discount: { percentage: invoice.discount?.percentage || 0 },
        notes: invoice.notes || '',
      });
      setIsEditMode(mode === 'edit');
    }
  }, [invoice, isOpen, mode, form]);

  const handleSaveClick = async (data) => {
    if (!onSave || !invoice) return;
    
    setLoading(true);
    try {
      const payload = {
        ...data,
        items: data.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
          rate: parseFloat(item.rate) || 0,
        })),
        tax: { percentage: parseFloat(data.tax.percentage) || 0 },
        discount: { percentage: parseFloat(data.discount.percentage) || 0 },
      };

      await onSave(invoice._id, payload);
      toast.success('Invoice updated successfully');
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to update invoice:', error);
      toast.error('Failed to update invoice', {
        description: error.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!onDelete || !invoice) return;
    
    setLoading(true);
    try {
      await onDelete(invoice._id);
      toast.success('Invoice deleted successfully');
      setDeleteDialogOpen(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      toast.error('Failed to delete invoice', {
        description: error.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendClick = async () => {
    if (!onResend || !invoice) return;
    
    setLoading(true);
    try {
      await onResend(invoice._id);
      toast.success('Invoice resent successfully');
    } catch (error) {
      console.error('Failed to resend invoice:', error);
      toast.error('Failed to resend invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadClick = async () => {
    if (!onDownload || !invoice) return;
    
    setLoading(true);
    try {
      await onDownload(invoice.invoiceNumber);
    } catch (error) {
      console.error('Failed to download invoice:', error);
      toast.error('Failed to download invoice');
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl">{invoice.invoiceNumber}</DialogTitle>
                <DialogDescription className="mt-1">
                  {invoice.projectId?.title || 'Project details unavailable'}
                </DialogDescription>
              </div>
              <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </Badge>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-200px)] px-6">
            {/* Client & Date Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{invoice.client?.name || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{invoice.client?.email || ''}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {invoice.dueDate ? format(new Date(invoice.dueDate), 'PPP') : 'Not set'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {isEditMode ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveClick)} className="space-y-6 pb-6">
                  {/* Invoice Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel>Invoice Items *</FormLabel>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => append({ title: '', description: '', quantity: 1, rate: 0 })}
                      >
                        Add Item
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <InvoiceItemRow
                          key={field.id}
                          item={watchedItems[index]}
                          index={index}
                          onChange={(idx, fieldName, value) => {
                            form.setValue(`items.${idx}.${fieldName}`, value);
                          }}
                          onRemove={remove}
                          canRemove={fields.length > 1}
                          errors={form.formState.errors.items?.[index]}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Tax & Discount */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tax.percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="discount.percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Totals Summary */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-medium">{formatINR(totals.subtotal)}</span>
                        </div>
                        {watchedTax > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax ({watchedTax}%):</span>
                            <span className="font-medium">{formatINR(totals.taxAmount)}</span>
                          </div>
                        )}
                        {watchedDiscount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discount ({watchedDiscount}%):</span>
                            <span className="font-medium text-destructive">-{formatINR(totals.discountAmount)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total:</span>
                          <span>{formatINR(totals.total)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </form>
              </Form>
            ) : (
              <div className="space-y-6 pb-6">
                {/* View Mode - Invoice Items */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Invoice Items</h3>
                  {invoice.items?.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-medium">{item.title}</p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                          <p className="font-medium">{formatINR(item.quantity * item.rate)}</p>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Qty: {item.quantity}</span>
                          <span>Rate: {formatINR(item.rate)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* View Mode - Totals */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium">{formatINR(invoice.subtotal || 0)}</span>
                      </div>
                      {invoice.tax?.percentage > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax ({invoice.tax.percentage}%):</span>
                          <span className="font-medium">{formatINR(invoice.tax.amount || 0)}</span>
                        </div>
                      )}
                      {invoice.discount?.percentage > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discount ({invoice.discount.percentage}%):</span>
                          <span className="font-medium text-destructive">-{formatINR(invoice.discount.amount || 0)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>{formatINR(invoice.total || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {invoice.notes && (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{invoice.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="px-6 pb-6 flex-row justify-between">
            <div className="flex gap-2">
              {!isEditMode && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditMode(true)}
                    disabled={loading}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  {onDownload && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadClick}
                      disabled={loading}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  )}
                  {onResend && invoice.status !== 'draft' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendClick}
                      disabled={loading}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Resend
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={loading}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2">
              {isEditMode ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsEditMode(false);
                      form.reset();
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    onClick={form.handleSubmit(handleSaveClick)}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button type="button" variant="ghost" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice {invoice?.invoiceNumber}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClick}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
