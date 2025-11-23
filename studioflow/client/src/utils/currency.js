/**
 * Currency formatting utilities
 */

/**
 * Format amount as Indian Rupees
 */
export const formatINR = (amount, options = {}) => {
  const { 
    showSymbol = true, 
    decimals = 2,
    compact = false 
  } = options;

  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? '₹0.00' : '0.00';
  }

  const numAmount = parseFloat(amount);

  // Compact format for large numbers
  if (compact && numAmount >= 100000) {
    const lakhs = numAmount / 100000;
    return `${showSymbol ? '₹' : ''}${lakhs.toFixed(2)}L`;
  }

  if (compact && numAmount >= 1000) {
    const thousands = numAmount / 1000;
    return `${showSymbol ? '₹' : ''}${thousands.toFixed(1)}K`;
  }

  // Standard format
  const formatted = numAmount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return showSymbol ? `₹${formatted}` : formatted;
};

/**
 * Format amount in any currency
 */
export const formatCurrency = (amount, currency = 'INR', options = {}) => {
  const currencyMap = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };

  const symbol = currencyMap[currency] || currency;
  const { decimals = 2 } = options;

  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${symbol}0.00`;
  }

  const numAmount = parseFloat(amount);
  const formatted = numAmount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return `${symbol}${formatted}`;
};

/**
 * Parse currency string to number
 */
export const parseCurrency = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Remove currency symbols and commas
  const cleaned = value.toString().replace(/[₹$€£,\s]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return (value / total) * 100;
};

/**
 * Calculate tax amount
 */
export const calculateTax = (subtotal, taxPercentage) => {
  return (subtotal * taxPercentage) / 100;
};

/**
 * Calculate discount amount
 */
export const calculateDiscount = (subtotal, discountPercentage) => {
  return (subtotal * discountPercentage) / 100;
};

/**
 * Calculate invoice total
 */
export const calculateInvoiceTotal = (items, tax = 0, discount = 0) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.rate);
  }, 0);

  const taxAmount = calculateTax(subtotal, tax);
  const discountAmount = calculateDiscount(subtotal, discount);

  return {
    subtotal,
    taxAmount,
    discountAmount,
    total: subtotal + taxAmount - discountAmount
  };
};

/**
 * Format number with abbreviation (K, L, Cr)
 */
export const formatCompactNumber = (num) => {
  if (num >= 10000000) { // 1 Crore
    return `${(num / 10000000).toFixed(2)}Cr`;
  }
  if (num >= 100000) { // 1 Lakh
    return `${(num / 100000).toFixed(2)}L`;
  }
  if (num >= 1000) { // 1 Thousand
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toFixed(0);
};
