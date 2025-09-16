// Date utilities for the dashboard

import { format, formatDistanceToNow, isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns';

/**
 * Format date for display in tables
 */
export function formatDate(date: string | Date | null): string {
  if (!date) return '-';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'MMM dd, yyyy');
  } catch {
    return '-';
  }
}

/**
 * Format date with time for detailed views
 */
export function formatDateTime(date: string | Date | null): string {
  if (!date) return '-';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'MMM dd, yyyy HH:mm');
  } catch {
    return '-';
  }
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 days")
 */
export function formatRelativeTime(date: string | Date | null): string {
  if (!date) return '-';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return '-';
  }
}

/**
 * Calculate age in days from creation date
 */
export function calculateAgeDays(createdDate: string | Date, closedDate?: string | Date | null): number {
  try {
    const created = typeof createdDate === 'string' ? new Date(createdDate) : createdDate;
    const end = closedDate 
      ? (typeof closedDate === 'string' ? new Date(closedDate) : closedDate)
      : new Date();
    
    const diffTime = end.getTime() - created.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}

/**
 * Check if date is within horizon (for supply/demand filtering)
 */
export function isWithinHorizon(date: string | Date | null, horizonDays: number): boolean {
  if (!date) return false;
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const horizonEnd = new Date(today.getTime() + horizonDays * 24 * 60 * 60 * 1000);
    
    return isWithinInterval(d, { start: today, end: horizonEnd });
  } catch {
    return false;
  }
}

/**
 * Get date range for filtering (last N days)
 */
export function getDateRange(days: number): { from: string; to: string } {
  const to = endOfDay(new Date());
  const from = startOfDay(subDays(new Date(), days));
  
  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
}

/**
 * Format date for ISO input fields
 */
export function formatForInput(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parse ISO date string safely
 */
export function parseISODate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Get default date range for dashboard (last 30 days to +30 days)
 */
export function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date();
  const from = startOfDay(subDays(today, 30));
  const to = endOfDay(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));
  
  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
}

/**
 * Format last updated timestamp
 */
export function formatLastUpdated(timestamp?: Date): string {
  if (!timestamp) timestamp = new Date();
  return format(timestamp, 'HH:mm:ss');
}