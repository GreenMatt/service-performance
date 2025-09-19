/**
 * Format numbers in a compact way for better display in KPI cards
 * Examples: 1234 -> 1.2K, 1234567 -> 1.2M, 1234567890 -> 1.2B
 */
export function formatCompactNumber(value: number): string {
  if (isNaN(value)) return '0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue < 1000) {
    return sign + value.toString();
  }

  const units = [
    { threshold: 1e12, suffix: 'T' }, // Trillion
    { threshold: 1e9, suffix: 'B' },  // Billion
    { threshold: 1e6, suffix: 'M' },  // Million
    { threshold: 1e3, suffix: 'K' },  // Thousand
  ];

  for (const unit of units) {
    if (absValue >= unit.threshold) {
      // Always round to whole numbers, no decimals
      const rounded = Math.round(absValue / unit.threshold);
      return sign + rounded + unit.suffix;
    }
  }

  return sign + absValue.toString();
}

/**
 * Format currency values in compact format with currency symbol
 */
export function formatCompactCurrency(value: number, currency: string = 'AUD'): string {
  const symbols: Record<string, string> = {
    AUD: '$',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = symbols[currency] || '$';
  return symbol + formatCompactNumber(value);
}

/**
 * Standard number formatting (with commas) for when we want full precision
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}