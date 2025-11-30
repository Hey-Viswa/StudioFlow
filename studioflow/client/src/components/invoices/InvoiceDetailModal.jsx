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
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { DatePicker } from '../ui/date-picker';
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
  Plus,
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
      status: invoice?.status || 'draft',
      items: invoice?.items?.map(item => ({
        title: item.title || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        rate: item.rate || 0,
      })) || [{ title: '', description: '', quantity: 1, rate: 0 }],
      dueDate: invoice?.dueDate ? new Date(invoice.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tax: { percentage: invoice?.tax?.percentage || 0 },
      discount: { percentage: invoice?.discount?.percentage || 0 },
      discount: { percentage: invoice?.discount?.percentage || 0 },
      notes: invoice?.notes || '',
      gstin: invoice?.gstin || '',
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
        status: invoice.status || 'draft',
        items: invoice.items?.map(item => ({
          title: item.title || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          rate: item.rate || 0,
        })) || [{ title: '', description: '', quantity: 1, rate: 0 }],
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        tax: { percentage: invoice.tax?.percentage || 0 },
        discount: { percentage: invoice.discount?.percentage || 0 },
        discount: { percentage: invoice.discount?.percentage || 0 },
        notes: invoice.notes || '',
        gstin: invoice.gstin || '',
      });
      setIsEditMode(mode === 'edit');
    }
  }, [invoice, isOpen, mode, form]);

  const handleSaveClick = async (data) => {
    if (!onSave || !invoice) return;

    setLoading(true);
    try {
      // Note: API expects integer percentages (0-100), not fractions
      const payload = {
        projectId: data.projectId,
        status: data.status || invoice.status,
        dueDate: data.dueDate ? data.dueDate.toISOString() : invoice.dueDate,
        items: data.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
          rate: parseFloat(item.rate) || 0,
        })),
        tax: { percentage: Math.round(parseInt(data.tax.percentage, 10) || 0) },
        discount: { percentage: Math.round(parseInt(data.discount.percentage, 10) || 0) },
        discount: { percentage: Math.round(parseInt(data.discount.percentage, 10) || 0) },
        notes: data.notes || '',
        gstin: data.gstin || '',
      };

      await onSave(invoice._id, payload);
      setIsEditMode(false);
      // Don't show toast here - parent handles it
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
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-card border-border text-card-foreground">
          <DialogHeader className="px-6 pt-6 pb-6 border-b border-border bg-card">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl text-card-foreground">{invoice.invoiceNumber}</DialogTitle>
                <DialogDescription className="mt-1 text-muted-foreground">
                  {invoice.projectId?.title || invoice.projectTitle || 'Project details unavailable'}
                </DialogDescription>
              </div>
              <Badge
                variant={invoice.isOverdue ? 'destructive' : statusConfig.variant}
                className="flex items-center gap-1"
                style={invoice.isOverdue ? { borderColor: 'rgb(239 68 68 / 0.5)', color: 'rgb(239 68 68)', backgroundColor: 'rgb(239 68 68 / 0.1)' } : {}}
              >
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
                {invoice.isOverdue && <span className="ml-1 text-[10px] font-bold">!</span>}
              </Badge>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-200px)] px-8 py-8 bg-card">
            {/* Client & Date Info */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <Card className="bg-muted/30 border-border shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">Client</p>
                  <p className="font-semibold text-lg">{invoice.client?.name || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{invoice.client?.email || ''}</p>
                  {invoice.gstin && (
                    <p className="text-sm text-muted-foreground mt-2">GSTIN: {invoice.gstin}</p>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-muted/30 border-border shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">Due Date</p>
                  <p className="font-semibold text-lg flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    {invoice.dueDate ? format(new Date(invoice.dueDate), 'PPP') : 'Not set'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Access & Linked Files */}
            {(invoice.accessType === 'specific_files' || invoice.linkedFileIds?.length > 0) && (
              <Card className="bg-muted/30 border-border mb-8 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">Access Type</p>
                    <Badge variant="outline" className="px-3 py-1">
                      {invoice.accessType === 'specific_files' ? 'Milestone (Specific Files)' : 'Full Project Access'}
                    </Badge>
                  </div>
                  {invoice.linkedFileIds?.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <p className="text-sm font-medium">Linked Files ({invoice.linkedFileIds.length})</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {invoice.linkedFileIds.map((fileId, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-background rounded-md border text-sm shadow-sm">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate font-mono text-xs">
                              {typeof fileId === 'object' ? fileId.originalFilename || 'File' : 'File ID: ' + fileId}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isEditMode ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveClick)} className="space-y-8 pb-6">
                  {/* Status Selection */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="pending">Sent</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Invoice Items */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-base">Invoice Items *</FormLabel>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => append({ title: '', description: '', quantity: 1, rate: 0 })}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Item
                      </Button>
                    </div>

                    <div className="space-y-4">
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

                  {/* Due Date */}
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-base">Due Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              id="invoice-detail-due-date"
                              type="date"
                              value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                              onChange={(e) => {
                                const dateValue = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                                field.onChange(dateValue);
                              }}
                              min={new Date().toISOString().split('T')[0]}
                              className="pr-10 h-11 [&::-webkit-calendar-picker-indicator]:opacity-0"
                            />
                            <CalendarIcon
                              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-pointer z-10"
                              onClick={() => {
                                const input = document.getElementById('invoice-detail-due-date');
                                if (input) input.showPicker();
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* GSTIN */}
                  <FormField
                    control={form.control}
                    name="gstin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">GSTIN (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 29ABCDE1234F1Z5" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tax & Discount */}
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="tax.percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Tax (%)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                placeholder="0"
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                  field.onChange(isNaN(val) ? 0 : val);
                                }}
                                onBlur={(e) => {
                                  let val = parseInt(e.target.value, 10);
                                  if (isNaN(val)) val = 0;
                                  val = Math.max(0, Math.min(100, Math.round(val)));
                                  field.onChange(val);
                                  field.onBlur();
                                }}
                                className="h-11 pr-8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
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
                          <FormLabel className="text-base">Discount (%)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                placeholder="0"
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                  field.onChange(isNaN(val) ? 0 : val);
                                }}
                                onBlur={(e) => {
                                  let val = parseInt(e.target.value, 10);
                                  if (isNaN(val)) val = 0;
                                  val = Math.max(0, Math.min(100, Math.round(val)));
                                  field.onChange(val);
                                  field.onBlur();
                                }}
                                className="h-11 pr-8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
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
                        <FormLabel className="text-base">Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes..."
                            className="resize-none min-h-[100px]"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Totals Summary */}
                  <Card className="bg-muted/30 border-border shadow-sm">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-medium font-mono">{formatINR(totals.subtotal)}</span>
                        </div>
                        {watchedTax > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax ({watchedTax}%):</span>
                            <span className="font-medium font-mono">{formatINR(totals.taxAmount)}</span>
                          </div>
                        )}
                        {watchedDiscount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discount ({watchedDiscount}%):</span>
                            <span className="font-medium text-destructive font-mono">-{formatINR(totals.discountAmount)}</span>
                          </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between text-xl font-bold">
                          <span>Total:</span>
                          <span className="font-mono">{formatINR(totals.total)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </form>
              </Form>
            ) : (
              <div className="space-y-8 pb-6">
                {/* View Mode - Invoice Items */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Invoice Items</h3>
                  {invoice.items?.map((item, index) => (
                    <Card key={index} className="bg-muted/30 border-border shadow-sm">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="font-medium text-base">{item.title}</p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            )}
                          </div>
                          <p className="font-bold font-mono text-lg">{formatINR(item.quantity * item.rate)}</p>
                        </div>
                        <div className="flex gap-6 text-sm text-muted-foreground border-t pt-3 mt-3">
                          <span>Qty: <span className="font-medium text-foreground">{item.quantity}</span></span>
                          <span>Rate: <span className="font-medium text-foreground">{formatINR(item.rate)}</span></span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* View Mode - Totals */}
                <Card className="bg-muted/30 border-border shadow-sm">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium font-mono">{formatINR(invoice.subtotal || 0)}</span>
                      </div>
                      {invoice.tax?.percentage > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax ({invoice.tax.percentage}%):</span>
                          <span className="font-medium font-mono">{formatINR(invoice.tax.amount || 0)}</span>
                        </div>
                      )}
                      {invoice.discount?.percentage > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discount ({invoice.discount.percentage}%):</span>
                          <span className="font-medium text-destructive font-mono">-{formatINR(invoice.discount.amount || 0)}</span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total:</span>
                        <span className="font-mono">{formatINR(invoice.total || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {invoice.notes && (
                  <Card className="bg-muted/30 border-border shadow-sm">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground mb-2 font-medium">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 flex-row justify-between">
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
