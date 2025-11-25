import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';
import { formatINR } from '../../utils/currency';
import { cn } from '../../lib/utils';

/**
 * Individual invoice item row component
 * Handles title, description, quantity, rate, and computed amount
 */
export default function InvoiceItemRow({
  item,
  index,
  onChange,
  onRemove,
  canRemove,
  errors,
}) {
  const amount = (item.quantity || 0) * (item.rate || 0);
  const titleError = errors?.title?.message;
  const quantityError = errors?.quantity?.message;
  const rateError = errors?.rate?.message;

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-3">
      {/* Title and Remove Button */}
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <Input
            placeholder="Item title *"
            value={item.title}
            onChange={(e) => onChange(index, 'title', e.target.value)}
            className={cn(titleError && 'border-destructive focus-visible:ring-destructive/50')}
            aria-invalid={Boolean(titleError)}
          />
          {titleError && (
            <p className="text-xs text-destructive">{titleError}</p>
          )}
        </div>
        {canRemove && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => onRemove(index)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Textarea
          placeholder="Description (optional)"
          value={item.description || ''}
          onChange={(e) => onChange(index, 'description', e.target.value)}
          className="resize-none"
          rows={2}
        />
      </div>

      {/* Quantity, Rate, Amount */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Quantity</Label>
          <Input
            type="number"
            min="1"
            step="1"
            value={item.quantity}
            onChange={(e) => onChange(index, 'quantity', parseFloat(e.target.value) || 1)}
            className={cn(quantityError && 'border-destructive focus-visible:ring-destructive/50')}
            aria-invalid={Boolean(quantityError)}
          />
          {quantityError && (
            <p className="text-xs text-destructive">{quantityError}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Rate (₹)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.rate}
            onChange={(e) => onChange(index, 'rate', parseFloat(e.target.value) || 0)}
            className={cn(rateError && 'border-destructive focus-visible:ring-destructive/50')}
            aria-invalid={Boolean(rateError)}
          />
          {rateError && (
            <p className="text-xs text-destructive">{rateError}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Amount</Label>
          <Input
            type="text"
            value={formatINR(amount)}
            disabled
            className="bg-muted/50 text-muted-foreground"
          />
        </div>
      </div>
    </div>
  );
}
