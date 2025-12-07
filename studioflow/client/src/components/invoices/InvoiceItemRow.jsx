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
  if (!item) return null;
  const amount = (item.quantity || 0) * (item.rate || 0);
  const titleError = errors?.title?.message;
  const quantityError = errors?.quantity?.message;
  const rateError = errors?.rate?.message;

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-4 shadow-sm">
      {/* Title and Remove Button */}
      <div className="flex gap-3">
        <div className="flex-1 space-y-1.5">
          <Input
            placeholder="Item title *"
            value={item.title}
            onChange={(e) => onChange(index, 'title', e.target.value)}
            className={cn("font-medium", titleError && 'border-destructive focus-visible:ring-destructive/50')}
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
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 w-10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Textarea
          placeholder="Description (optional)"
          value={item.description || ''}
          onChange={(e) => onChange(index, 'description', e.target.value)}
          className="resize-none min-h-[60px]"
          rows={2}
        />
      </div>

      {/* Quantity, Rate, Amount */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Quantity</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={item.quantity || ''}
            onChange={(e) => {
              const value = e.target.value;
              // Allow empty or valid numbers
              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                const num = value === '' ? 1 : parseFloat(value);
                onChange(index, 'quantity', isNaN(num) ? 1 : num);
              }
            }}
            onBlur={(e) => {
              // Ensure minimum value of 1 on blur
              const num = parseFloat(e.target.value);
              if (isNaN(num) || num < 1) {
                onChange(index, 'quantity', 1);
              }
            }}
            className={cn(quantityError && 'border-destructive focus-visible:ring-destructive/50')}
            aria-invalid={Boolean(quantityError)}
          />
          {quantityError && (
            <p className="text-xs text-destructive">{quantityError}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Rate</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
            <Input
              type="text"
              inputMode="decimal"
              value={item.rate || ''}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty or valid decimal numbers
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  const num = value === '' ? 0 : parseFloat(value);
                  onChange(index, 'rate', isNaN(num) ? 0 : num);
                }
              }}
              onBlur={(e) => {
                // Ensure minimum value of 0 on blur
                const num = parseFloat(e.target.value);
                if (isNaN(num) || num < 0) {
                  onChange(index, 'rate', 0);
                }
              }}
              className={cn("pl-7", rateError && 'border-destructive focus-visible:ring-destructive/50')}
              aria-invalid={Boolean(rateError)}
            />
          </div>
          {rateError && (
            <p className="text-xs text-destructive">{rateError}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Amount</Label>
          <Input
            type="text"
            value={formatINR(amount)}
            disabled
            className="bg-muted/50 text-muted-foreground font-mono font-medium"
          />
        </div>
      </div>
    </div>
  );
}
