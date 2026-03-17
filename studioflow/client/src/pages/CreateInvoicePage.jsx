import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Plus, Loader2, Calendar as CalendarIcon, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import api from '../lib/api';
import { formatINR, calculateInvoiceTotal } from '../utils/currency';
import { newInvoiceSchema, defaultInvoiceValues } from '../lib/validations/invoice';
import InvoiceItemRow from '../components/invoices/InvoiceItemRow';
import { cn } from '../lib/utils';
import { useInvoices } from '../hooks/useInvoices';

const toLatestVersionFiles = (files = []) => {
  const byBase = new Map();

  files.forEach((file) => {
    const baseKey = file.baseFileId || file._id;
    const current = byBase.get(baseKey);
    const currentVersion = current?.version || 1;
    const fileVersion = file?.version || 1;

    if (!current || fileVersion > currentVersion) {
      byBase.set(baseKey, file);
    }
  });

  return Array.from(byBase.values());
};

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { createInvoice } = useInvoices();
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

  const totals = useMemo(() => {
    return calculateInvoiceTotal(watchedItems, watchedTax, watchedDiscount);
  }, [watchedItems, watchedTax, watchedDiscount]);

  useEffect(() => {
    fetchProjects();
  }, []);

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

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        projectId: data.projectId,
        items: data.items.map((item) => ({
          title: item.title,
          description: item.description || '',
          quantity: parseFloat(item.quantity) || 1,
          rate: parseFloat(item.rate) || 0,
        })),
        dueDate: data.dueDate ? data.dueDate.toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tax: {
          percentage: Math.round(parseInt(data.tax?.percentage, 10) || 0),
        },
        discount: {
          percentage: Math.round(parseInt(data.discount?.percentage, 10) || 0),
        },
        notes: data.notes || '',
      };

const fetchProjectFiles = async (projectId) => {
  try {
    setLoadingFiles(true);
    const response = await api.get(`/projects/${projectId}/files`, { getToken });
    setProjectFiles(toLatestVersionFiles(response.files || []));
  } catch (error) {
    console.error('Failed to fetch project files:', error);
  } finally {
    setLoadingFiles(false);
  }
};

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/dashboard')} className="cursor-pointer">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/dashboard/invoices')} className="cursor-pointer">
                Invoices
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Create Invoice</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/invoices')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Invoice</h1>
            <p className="text-muted-foreground">Generate an invoice for your project</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>Select the project for this invoice</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          const project = projects.find((p) => p._id === value);
                          setSelectedProject(project);
                        }}
                        value={field.value}
                        disabled={loadingProjects}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingProjects ? 'Loading projects...' : 'Select a project'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project._id} value={project._id}>
                              {project.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedProject && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Client: {selectedProject.clientName || 'N/A'}</p>
                    {selectedProject.clientEmail && (
                      <p className="text-xs text-muted-foreground">{selectedProject.clientEmail}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Invoice Items</CardTitle>
                    <CardDescription>Add items to include in the invoice</CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => append({ title: '', description: '', quantity: 1, rate: 0 })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>

            {/* Tax, Discount & Due Date */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tax.percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link Files</FormLabel>
                        <div className="border rounded-md p-2 max-h-60 overflow-y-auto bg-background space-y-2">
                          {loadingFiles ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Loading files...
                            </div>
                          ) : projectFiles.length === 0 ? (
                            <p className="text-sm text-muted-foreground p-2">No files found in this project.</p>
                          ) : (
                            projectFiles.map((file) => (
                              <div key={file._id} className="flex items-center space-x-2 p-1 hover:bg-muted/50 rounded">
                                <input
                                  type="checkbox"
                                  id={`file-${file._id}`}
                                  checked={field.value?.includes(file._id)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, file._id]);
                                    } else {
                                      field.onChange(current.filter((id) => id !== file._id));
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label
                                  htmlFor={`file-${file._id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 truncate"
                                >
                                  {file.originalFilename}{file.version > 1 ? ` (v${file.version})` : ''}
                                </label>
                              </div>
                            ))
                          )}
                        </div>
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

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </CardContent>
            </Card>

            {/* Totals Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard/invoices')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Create Invoice
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
