import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateProjectInvoice } from '../lib/projectInvoiceApi';

export default function GenerateInvoiceModal({ isOpen, onClose, projectId, clients, onSuccess }) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientUserId: '',
    items: [{ title: '', description: '', quantity: 1, rate: 0 }],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    tax: { percentage: 0 },
    discount: { percentage: 0 }
  });

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { title: '', description: '', quantity: 1, rate: 0 }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = (subtotal * (parseFloat(formData.tax.percentage) || 0)) / 100;
    const discountAmount = (subtotal * (parseFloat(formData.discount.percentage) || 0)) / 100;
    return subtotal + taxAmount - discountAmount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate
      if (formData.items.length === 0) {
        toast.error('Add at least one invoice item');
        return;
      }

      const hasEmptyItems = formData.items.some(item => !item.title || item.rate <= 0);
      if (hasEmptyItems) {
        toast.error('All items must have a title and rate');
        return;
      }

      await generateProjectInvoice(projectId, formData, getToken);
      
      toast.success('Invoice generated successfully!');
      onSuccess?.();
      onClose();
      
      // Reset form
      setFormData({
        clientUserId: '',
        items: [{ title: '', description: '', quantity: 1, rate: 0 }],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        tax: { percentage: 0 },
        discount: { percentage: 0 }
      });

    } catch (error) {
      toast.error(error.message || 'Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Generate Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div>
            <Label className="text-slate-300">Client</Label>
            <select
              value={formData.clientUserId}
              onChange={(e) => setFormData(prev => ({ ...prev, clientUserId: e.target.value }))}
              className="w-full px-3 py-2 mt-1 bg-slate-800 border border-slate-700 rounded-md text-white"
            >
              <option value="">Select Client</option>
              {clients?.map(client => (
                <option key={client.userId} value={client.userId}>
                  {client.name} ({client.email})
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-slate-300">Invoice Items</Label>
              <Button type="button" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="p-4 bg-slate-800 border border-slate-700 rounded-md space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Service/Task Title *"
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
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <Textarea
                    placeholder="Description (optional)"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white"
                    rows={2}
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-slate-400">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                        className="bg-slate-900 border-slate-700 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Rate (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value))}
                        className="bg-slate-900 border-slate-700 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Amount</Label>
                      <Input
                        type="text"
                        value={`₹${((item.quantity || 0) * (item.rate || 0)).toFixed(2)}`}
                        disabled
                        className="bg-slate-900 border-slate-700 text-white"
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
              <Label className="text-slate-300">Tax (%)</Label>
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
              <Label className="text-slate-300">Discount (%)</Label>
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
            <Label className="text-slate-300">Due Date</Label>
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
            <Label className="text-slate-300">Notes</Label>
            <Textarea
              placeholder="Additional notes for the client..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white"
              rows={3}
            />
          </div>

          {/* Total Preview */}
          <div className="p-4 bg-slate-800 border border-slate-700 rounded-md">
            <div className="flex justify-between text-sm text-slate-300 mb-1">
              <span>Subtotal:</span>
              <span>₹{calculateSubtotal().toFixed(2)}</span>
            </div>
            {formData.tax.percentage > 0 && (
              <div className="flex justify-between text-sm text-slate-300 mb-1">
                <span>Tax ({formData.tax.percentage}%):</span>
                <span>₹{((calculateSubtotal() * formData.tax.percentage) / 100).toFixed(2)}</span>
              </div>
            )}
            {formData.discount.percentage > 0 && (
              <div className="flex justify-between text-sm text-slate-300 mb-1">
                <span>Discount ({formData.discount.percentage}%):</span>
                <span>-₹{((calculateSubtotal() * formData.discount.percentage) / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-white mt-2 pt-2 border-t border-slate-700">
              <span>Total:</span>
              <span>₹{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
