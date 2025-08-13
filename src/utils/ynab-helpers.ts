/**
 * Convert YNAB milliunits to regular currency units
 * YNAB stores amounts as milliunits (1/1000 of a unit)
 * e.g., $1.23 is stored as 1230 milliunits
 */
export function milliUnitsToUnits(milliUnits: number): number {
  return milliUnits / 1000;
}

/**
 * Convert regular currency units to YNAB milliunits
 * e.g., $1.23 becomes 1230 milliunits
 */
export function unitsToMilliUnits(units: number): number {
  return Math.round(units * 1000);
}

/**
 * Format a date for YNAB API (YYYY-MM-DD format)
 * Accepts Date object, string, or undefined (defaults to today)
 */
export function formatDateForYnab(date?: string | Date): string {
  if (!date) {
    date = new Date();
  }
  
  if (typeof date === 'string') {
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    date = new Date(date);
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Sanitize string inputs for YNAB API
 * Trims whitespace and handles empty strings
 */
export function sanitizeString(input?: string | null): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }
  
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Format currency amount for display
 * Takes milliunits and returns a formatted string
 */
export function formatCurrency(milliUnits: number, currencySymbol = '$'): string {
  const units = milliUnitsToUnits(milliUnits);
  const isNegative = units < 0;
  const absUnits = Math.abs(units);
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(absUnits);
  
  if (isNegative) {
    return `-${currencySymbol}${formatted}`;
  }
  
  return `${currencySymbol}${formatted}`;
}

/**
 * Parse date range for transaction filtering
 * Returns start and end dates in YNAB format
 */
export function parseDateRange(sinceDate?: string, untilDate?: string): { since?: string; until?: string } {
  const result: { since?: string; until?: string } = {};
  
  if (sinceDate) {
    result.since = formatDateForYnab(sinceDate);
  }
  
  if (untilDate) {
    result.until = formatDateForYnab(untilDate);
  }
  
  return result;
}

/**
 * Validate transaction amount
 * Ensures amount is a valid number and within reasonable bounds
 */
export function validateTransactionAmount(amount: any): number {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Transaction amount must be a valid number');
  }
  
  // YNAB has practical limits on transaction amounts
  const maxAmount = 999999999; // ~$1B
  const minAmount = -999999999;
  
  if (amount > maxAmount || amount < minAmount) {
    throw new Error(`Transaction amount must be between ${minAmount} and ${maxAmount}`);
  }
  
  return amount;
}
