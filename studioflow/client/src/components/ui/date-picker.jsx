import { useState, useEffect } from 'react';
import { ChevronDownIcon, CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../../lib/utils';
import { format, parse, isValid } from 'date-fns';

/**
 * Controlled Date Picker component with editable text input and calendar
 * Supports manual date entry with formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
 * @param {Object} props
 * @param {Date | undefined} props.value - Selected date
 * @param {(date: Date | undefined) => void} props.onChange - Change handler
 * @param {Date | ((date: Date) => boolean)} props.disabled - Disabled dates
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.className - Additional classes
 */
export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = 'DD/MM/YYYY',
  className,
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  // Update input when value changes externally
  useEffect(() => {
    if (value instanceof Date && isValid(value)) {
      setInputValue(format(value, 'dd/MM/yyyy'));
      setError('');
    } else if (!value) {
      setInputValue('');
      setError('');
    }
  }, [value]);

  // Parse date from text input
  const parseDate = (text) => {
    if (!text || text.trim() === '') return null;

    // Remove extra spaces and normalize
    const normalized = text.trim();

    // Try multiple date formats
    const formats = [
      'dd/MM/yyyy',  // 25/11/2025
      'dd-MM-yyyy',  // 25-11-2025
      'dd.MM.yyyy',  // 25.11.2025
      'dd/M/yyyy',   // 25/1/2025
      'd/MM/yyyy',   // 5/11/2025
      'd/M/yyyy',    // 5/1/2025
    ];

    for (const formatStr of formats) {
      try {
        const parsed = parse(normalized, formatStr, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch (e) {
        // Continue to next format
      }
    }

    return null;
  };

  // Validate date input with regex
  const validateDateInput = (text) => {
    if (!text) return true;

    // Allow partial input while typing
    const partialRegex = /^(\d{0,2})([\/.\\-]?)(\d{0,2})([\/.\\-]?)(\d{0,4})$/;
    return partialRegex.test(text);
  };

  const handleInputChange = (e) => {
    const text = e.target.value;

    // Allow only valid characters
    if (!validateDateInput(text)) {
      return;
    }

    setInputValue(text);
    setError('');

    // Try to parse complete dates
    if (text.length >= 8) {
      const parsed = parseDate(text);
      if (parsed) {
        // Check if date is disabled
        if (typeof disabled === 'function' && disabled(parsed)) {
          setError('Date is not available');
        } else {
          onChange(parsed);
          setError('');
        }
      } else {
        setError('Invalid date format');
      }
    }
  };

  const handleInputBlur = () => {
    if (!inputValue) {
      setError('');
      return;
    }

    const parsed = parseDate(inputValue);
    if (parsed) {
      // Check if date is disabled
      if (typeof disabled === 'function' && disabled(parsed)) {
        setError('Date is not available');
        setInputValue(value instanceof Date ? format(value, 'dd/MM/yyyy') : '');
      } else {
        onChange(parsed);
        setInputValue(format(parsed, 'dd/MM/yyyy'));
        setError('');
      }
    } else if (inputValue.trim() !== '') {
      setError('Invalid date format. Use DD/MM/YYYY');
      // Restore previous valid value
      setInputValue(value instanceof Date ? format(value, 'dd/MM/yyyy') : '');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputBlur();
    }
  };

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                error && 'border-red-500 focus-visible:ring-red-500',
                className
              )}
            />
          </div>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn('shrink-0', error && 'border-red-500')}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-auto overflow-hidden p-0 bg-popover border-border" align="start">
          <Calendar
            mode="single"
            selected={value instanceof Date && isValid(value) ? value : undefined}
            captionLayout="dropdown"
            onSelect={(date) => {
              if (date) {
                onChange(date);
                setInputValue(format(date, 'dd/MM/yyyy'));
                setError('');
              }
              setOpen(false);
            }}
            disabled={disabled}
            initialFocus
            fromYear={2020}
            toYear={2030}
          />
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
