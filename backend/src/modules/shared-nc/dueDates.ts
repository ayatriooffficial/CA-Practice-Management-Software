/**
 * Calculates due date for statutory compliance returns based on formCode and periodKey.
 * Period format: "YYYY-MM" (e.g. "2025-04"), "Q1", "H1", "Annual", etc.
 */
export function getDueDate(formCode: string, periodKey: string): string {
  const code = formCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Monthly GST returns
  // GSTR-3B: 20th of the following month (e.g. 2025-04 -> 2025-05-20)
  if (code === 'GSTR3B') {
    if (periodKey.match(/^\d{4}-\d{2}$/)) {
      const [yearStr, monthStr] = periodKey.split('-');
      let year = parseInt(yearStr, 10);
      let nextMonth = parseInt(monthStr, 10) + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        year += 1;
      }
      const mm = String(nextMonth).padStart(2, '0');
      return `${year}-${mm}-20`;
    }
    return `${periodKey}-20`;
  }

  // GSTR-1: 11th of the following month
  if (code === 'GSTR1') {
    if (periodKey.match(/^\d{4}-\d{2}$/)) {
      const [yearStr, monthStr] = periodKey.split('-');
      let year = parseInt(yearStr, 10);
      let nextMonth = parseInt(monthStr, 10) + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        year += 1;
      }
      const mm = String(nextMonth).padStart(2, '0');
      return `${year}-${mm}-11`;
    }
    return `${periodKey}-11`;
  }

  // GSTR-5: 20th of following month
  if (code === 'GSTR5') {
    if (periodKey.match(/^\d{4}-\d{2}$/)) {
      const [yearStr, monthStr] = periodKey.split('-');
      let year = parseInt(yearStr, 10);
      let nextMonth = parseInt(monthStr, 10) + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        year += 1;
      }
      const mm = String(nextMonth).padStart(2, '0');
      return `${year}-${mm}-20`;
    }
  }

  // TDS Monthly Payment: 7th of the following month
  if (code === 'PAYMENT' || code.includes('TDSPAYMENT')) {
    if (periodKey.match(/^\d{4}-\d{2}$/)) {
      const [yearStr, monthStr] = periodKey.split('-');
      let year = parseInt(yearStr, 10);
      let nextMonth = parseInt(monthStr, 10) + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        year += 1;
      }
      const mm = String(nextMonth).padStart(2, '0');
      return `${year}-${mm}-07`;
    }
  }

  // Fallback default
  if (periodKey.match(/^\d{4}-\d{2}$/)) {
    return `${periodKey}-20`;
  }

  return periodKey;
}
