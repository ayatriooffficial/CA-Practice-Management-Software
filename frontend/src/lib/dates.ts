export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function today(base = new Date()): string {
  return toDateString(base);
}

export function todayIso(base = new Date()): string {
  const d = new Date(base.getTime());
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function daysAgo(n: number, base = new Date()): string {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

export function daysAgoIso(n: number, base = new Date()): string {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function daysFromNow(n: number, base = new Date()): string {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + n);
  return toDateString(d);
}

export function daysFromNowIso(n: number, base = new Date()): string {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function isOverdue(dueDate?: string | null, base = new Date()): boolean {
  if (!dueDate) return false;
  return dueDate < today(base);
}

export function getOverdueDays(dueDate?: string | null, base = new Date()): number {
  if (!dueDate) return 0;
  const current = new Date(today(base));
  const due = new Date(dueDate);
  const diffMs = current.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function getFinancialYear(offsetYears = 0, base = new Date()): string {
  const d = new Date(base.getTime());
  const month = d.getMonth(); // 0-indexed, 3 = April
  const startYear = (month >= 3 ? d.getFullYear() : d.getFullYear() - 1) + offsetYears;
  const endYearShort = String(startYear + 1).slice(-2);
  return `${startYear}-${endYearShort}`;
}

export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}
