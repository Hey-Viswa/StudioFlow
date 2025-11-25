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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { DatePicker } from '../ui/date-picker';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Plus, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import api from '../../lib/api';
import { formatINR, calculateInvoiceTotal } from '../../utils/currency';
import { newInvoiceSchema, defaultInvoiceValues } from '../../lib/validations/invoice';
import InvoiceItemRow from './InvoiceItemRow';
import { cn } from '../../lib/utils';

export default function NewInvoiceModal({ isOpen, onClose, onSuccess }) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const form = useForm({
    resolver: zodResolver(newInvoiceSchema),
    defaultValues: defaultInvoiceValues(),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');
  const watchedTax = form.watch('tax.percentage') || 0;
  const watchedDiscount = form.watch('discount.percentage') || 0;

  // Calculate totals with useMemo for performance
  const totals = useMemo(() => {
    return calculateInvoiceTotal(watchedItems, watchedTax, watchedDiscount);
  }, [watchedItems, watchedTax, watchedDiscount]);

  // Fetch projects when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset(defaultInvoiceValues());
      setSelectedProject(null);
    }
  }, [isOpen, form]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await api.get('/projects', { getToken });
      setProjects(response.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  // Handle project selection and auto-populate
  const handleProjectSelect = (projectId) => {
    const project = projects.find((p) => p._id === projectId);
    setSelectedProject(project);

    if (project) {
      const client = project.members?.find((m) => m.role === 'client');
      const items = [];

      // Add project price as line item if available
      if (project.agreedPrice || project.budget) {
        items.push({
          title: `${project.title} - Final Payment`,
          description: `Completion payment for project: ${project.brief || ''}`,
          quantity: 1,
          rate: project.agreedPrice || project.budget || 0,
        });
      }

      // Add deliverables as line items
      if (project.deliverables && project.deliverables.length > 0) {
        project.deliverables.forEach((deliverable) => {
          if (deliverable.title) {
            items.push({
              title: deliverable.title,
              description: deliverable.description || '',
              quantity: 1,
              rate: 0,
            });
          }
        });
      }

      // If no items added, keep default empty item
      if (items.length === 0) {
        items.push({ title: '', description: '', quantity: 1, rate: 0 });
      }

      form.setValue('items', items);
      form.setValue(
        'notes',
        project.status === 'delivered' || project.status === 'completed'
          ? `Payment for completed project: ${project.title}`
          : ''
      );
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Prepare invoice data with proper formatting
      // Note: API expects integer percentages (0-100), not fractions
      const invoiceData = {
        projectId: data.projectId,
        dueDate: data.dueDate ? data.dueDate.toISOString() : null,
        items: data.items.map((item) => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
          rate: parseFloat(item.rate) || 0,
        })),
        tax: {
          percentage: Math.round(parseInt(data.tax.percentage, 10) || 0),
        },
        discount: {
          percentage: Math.round(parseInt(data.discount.percentage, 10) || 0),
        },
        notes: data.notes || '',
      };

      await onSuccess(data.projectId, invoiceData);

      // Reset form and close
      form.reset(defaultInvoiceValues());
      setSelectedProject(null);
      onClose();
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error('Failed to create invoice', {
        description: error.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-card border border-border text-card-foreground">
        <DialogHeader className="px-6 pt-6 border-b border-border">
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Generate an invoice for a project. Select a project to auto-populate details.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
              {/* Project Selection */}
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleProjectSelect(value);
                      }}
                      value={field.value}
                      disabled={loadingProjects}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingProjects ? (
                          <div className="flex items-center gap-2 p-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading projects...</span>
                          </div>
                        ) : (
                          projects.map((project) => (
                            <SelectItem key={project._id} value={project._id}>
                              <div className="flex items-center gap-2">
                                <span>{project.title}</span>
                                {(project.status === 'completed' || project.status === 'delivered') && (
                                  <Badge variant="outline" className="text-xs">
                                    {project.status}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedProject && (
                      <p className="text-xs text-muted-foreground">
                        Client: {(() => {
                          const client = selectedProject.members?.find((m) => m.role === 'client');
                          return client?.name || client?.email || 'Not assigned';
                        })()}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    <Plus className="w-4 h-4 mr-1" />
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
                            // Clamp between 0 and 100
                            val = Math.max(0, Math.min(100, Math.round(val)));
                            field.onChange(val);
                            field.onBlur();
                          }}
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
                            // Clamp between 0 and 100
                            val = Math.max(0, Math.min(100, Math.round(val)));
                            field.onChange(val);
                            field.onBlur();
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Due Date */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          id="invoice-due-date"
                          type="date"
                          value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const dateValue = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                            field.onChange(dateValue);
                          }}
                          min={new Date().toISOString().split('T')[0]}
                          className="pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0"
                        />
                        <CalendarIcon 
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer z-10" 
                          onClick={() => {
                            const input = document.getElementById('invoice-due-date');
                            if (input) input.showPicker();
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes or payment terms..."
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
        </ScrollArea>

        <DialogFooter className="px-6 pb-6 border-t border-border flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} onClick={form.handleSubmit(onSubmit)}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
