/**
 * Asia/Kolkata (IST) Server Time Utility
 * All attendance, daily status, and punch boundaries must use server IST time.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

export function getNowIST(): Date {
  return new Date();
}

/**
 * Returns date in 'YYYY-MM-DD' format according to Asia/Kolkata timezone.
 */
export function toISTDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns time in 'HH:mm:ss' format according to Asia/Kolkata timezone (24-hour).
 */
export function toISTTimeString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}

/**
 * Returns time in 'hh:mm A' or 'HH:mm' for display.
 */
export function formatISTTimeDisplay(date?: Date | null): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return formatter.format(d);
}

/**
 * Calculates minutes since midnight IST for a given Date.
 */
export function getISTMinutesSinceMidnight(date: Date): number {
  const timeStr = toISTTimeString(date);
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Parses a time string like "09:30" or "09:30 AM" into minutes since midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 9 * 60 + 30; // default 9:30 AM
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const numPart = clean.replace(/[APM\s]/g, '');
  const [hoursStr, minsStr] = numPart.split(':');
  let h = parseInt(hoursStr, 10) || 0;
  const m = parseInt(minsStr, 10) || 0;

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return h * 60 + m;
}

/**
 * Get day of week in IST (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function getISTDayOfWeek(date: Date): number {
  const dateStr = toISTDateString(date);
  const [y, m, d] = dateStr.split('-').map(Number);
  // Construct UTC midnight corresponding to the IST date
  const temp = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return temp.getUTCDay();
}

/**
 * Returns date offset by N days in 'YYYY-MM-DD'
 */
export function offsetISTDate(dateStr: string, offsetDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const temp = new Date(Date.UTC(y, m - 1, d + offsetDays, 12, 0, 0));
  const year = temp.getUTCFullYear();
  const month = String(temp.getUTCMonth() + 1).padStart(2, '0');
  const day = String(temp.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
