import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Plus, Trash2, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { calculateInvoiceTotal, formatINR } from '../../utils/currency';

export default function NewInvoiceModal({ isOpen, onClose, onSuccess }) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  const [formData, setFormData] = useState({
    projectId: '',
    clientUserId: '',
    items: [{ title: '', description: '', quantity: 1, rate: '' }],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    tax: { percentage: '' },
    discount: { percentage: '' }
  });

  const [selectedProject, setSelectedProject] = useState(null);

  // Fetch projects
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await api.get('/projects', { getToken });
      
      // Filter to show only completed or delivered projects
      const activeProjects = response.projects || [];
      setProjects(activeProjects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  // Handle project selection
  const handleProjectSelect = (projectId) => {
    const project = projects.find(p => p._id === projectId);
    setSelectedProject(project);
    
    if (project) {
      // Find client from project members
      const client = project.members?.find(m => m.role === 'client');
      
      // Auto-populate fields
      const items = [];
      
      // If project has budget/agreed price, add as line item
      if (project.agreedPrice || project.budget) {
        items.push({
          title: `${project.title} - Final Payment`,
          description: `Completion payment for project: ${project.brief || ''}`,
          quantity: 1,
          rate: project.agreedPrice || project.budget || 0
        });
      }
      
      // If project has deliverables, add them as line items
      if (project.deliverables && project.deliverables.length > 0) {
        project.deliverables.forEach(deliverable => {
          if (deliverable.title) {
            items.push({
              title: deliverable.title,
              description: deliverable.description || '',
              quantity: 1,
              rate: 0
            });
          }
        });
      }
      
      // If no items added, keep default empty item
      if (items.length === 0) {
        items.push({ title: '', description: '', quantity: 1, rate: 0 });
      }
      
      setFormData(prev => ({
        ...prev,
        projectId,
        clientUserId: client?.userId || '',
        items,
        notes: project.status === 'delivered' || project.status === 'completed' 
          ? `Payment for completed project: ${project.title}` 
          : ''
      }));
    }
  };

  // Add new item
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { title: '', description: '', quantity: 1, rate: '' }]
    }));
  };

  // Remove item
  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Update item
  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Calculate totals
  const { subtotal, taxAmount, discountAmount, total } = calculateInvoiceTotal(
    formData.items,
    formData.tax.percentage,
    formData.discount.percentage
  );

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.projectId) {
      toast.error('Please select a project');
      return;
    }
    
    if (formData.items.length === 0) {
      toast.error('Add at least one invoice item');
      return;
    }
    
    const hasEmptyItems = formData.items.some(item => !item.title || !item.rate || parseFloat(item.rate) <= 0);
    if (hasEmptyItems) {
      toast.error('All items must have a title and rate greater than 0');
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare data with proper number conversion
      const invoiceData = {
        ...formData,
        items: formData.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
          rate: parseFloat(item.rate) || 0
        })),
        tax: {
          percentage: parseFloat(formData.tax.percentage) || 0
        },
        discount: {
          percentage: parseFloat(formData.discount.percentage) || 0
        }
      };
      
      await onSuccess(formData.projectId, invoiceData);
      
      // Reset form
      setFormData({
        projectId: '',
        clientUserId: '',
        items: [{ title: '', description: '', quantity: 1, rate: '' }],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        tax: { percentage: '' },
        discount: { percentage: '' }
      });
      setSelectedProject(null);
      onClose();
    } catch (error) {
      console.error('Failed to create invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create New Invoice</DialogTitle>
          <DialogDescription className="text-slate-400">
            Generate an invoice for a project. Select a project to auto-populate details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Project Selection */}
          <div>
            <Label className="text-slate-300 mb-2 block">Project *</Label>
            {loadingProjects ? (
              <div className="flex items-center gap-2 text-slate-400 p-3 bg-slate-800 rounded-md">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading projects...</span>
              </div>
            ) : (
              <select
                value={formData.projectId}
                onChange={(e) => handleProjectSelect(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select a project</option>
                {projects.map(project => (
                  <option key={project._id} value={project._id}>
                    {project.title} 
                    {project.status === 'completed' && ' ✓ Completed'}
                    {project.status === 'delivered' && ' ✓ Delivered'}
                  </option>
                ))}
              </select>
            )}
            {selectedProject && (
              <p className="text-xs text-slate-500 mt-1">
                Client: {selectedProject.members?.find(m => m.role === 'client')?.name || 'Not assigned'}
              </p>
            )}
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-slate-300">Invoice Items *</Label>
              <Button 
                type="button" 
                size="sm" 
                onClick={addItem}
                variant="outline"
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div 
                  key={index} 
                  className="p-4 bg-slate-800 border border-slate-700 rounded-lg space-y-3"
                >
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Item title *"
                        value={item.title}
                        onChange={(e) => updateItem(index, 'title', e.target.value)}
                        className="bg-slate-900 border-slate-700 text-white"
                        required
                      />
                    </div>
                    {formData.items.length > 1 && (
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
                    placeholder="Description (optional)"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white resize-none"
                    rows={2}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-slate-400 mb-1 block">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                        className="bg-slate-900 border-slate-700 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400 mb-1 block">Rate (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="bg-slate-900 border-slate-700 text-white"
                        required
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

          {/* Tax & Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 mb-2 block">Tax (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.tax.percentage}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  tax: { percentage: parseFloat(e.target.value) || 0 }
                }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">Discount (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.discount.percentage}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  discount: { percentage: parseFloat(e.target.value) || 0 }
                }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <Label className="text-slate-300 mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Due Date *
            </Label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-slate-300 mb-2 block">Notes</Label>
            <Textarea
              placeholder="Additional notes or payment terms..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white resize-none"
              rows={3}
            />
          </div>

          {/* Total Preview */}
          <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Subtotal:</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              {formData.tax.percentage > 0 && (
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Tax ({formData.tax.percentage}%):</span>
                  <span>{formatINR(taxAmount)}</span>
                </div>
              )}
              {formData.discount.percentage > 0 && (
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Discount ({formData.discount.percentage}%):</span>
                  <span>-{formatINR(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-slate-700">
                <span>Total:</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose} 
              disabled={loading}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
