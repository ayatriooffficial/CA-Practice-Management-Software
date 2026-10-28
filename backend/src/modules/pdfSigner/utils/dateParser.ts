export interface DscExpiryEvaluation {
  raw: string;
  parsedDate: Date | null;
  isValidDate: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysLeft: number | null;
  error?: string;
}

/**
 * Robust date parser supporting DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, and ISO timestamps.
 * Standardizes evaluation of expiry status and 30-day proximity warnings.
 */
export function parseDscExpiryDate(dateStr?: string | null, statusStr?: string | null): DscExpiryEvaluation {
  if (!dateStr || dateStr.trim() === '' || dateStr.trim() === '-') {
    const isManualExpired = statusStr?.trim().toLowerCase() === 'expired';
    return {
      raw: dateStr || '-',
      parsedDate: null,
      isValidDate: false,
      isExpired: isManualExpired,
      isExpiringSoon: false,
      daysLeft: null,
      error: 'Expiry date is missing or unrecorded',
    };
  }

  const clean = dateStr.trim();
  let parsedDate: Date | null = null;

  // 1. Try DD-MM-YYYY or DD/MM/YYYY pattern
  const ddmmyyyyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1; // 0-indexed month
    const year = parseInt(ddmmyyyyMatch[3], 10);
    parsedDate = new Date(year, month, day, 23, 59, 59, 999);
  } else {
    // 2. Try standard ISO or new Date()
    const fallback = new Date(clean);
    if (!isNaN(fallback.getTime())) {
      parsedDate = fallback;
    }
  }

  const isManualExpired = statusStr?.trim().toLowerCase() === 'expired';

  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return {
      raw: clean,
      parsedDate: null,
      isValidDate: false,
      isExpired: isManualExpired,
      isExpiringSoon: false,
      daysLeft: null,
      error: `Invalid date format: "${clean}". Expected DD-MM-YYYY or ISO date.`,
    };
  }

  const now = new Date();
  const diffMs = parsedDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const isExpiredByDate = diffDays < 0;
  const isExpired = isManualExpired || isExpiredByDate;
  const isExpiringSoon = !isExpired && diffDays >= 0 && diffDays <= 30;

  return {
    raw: clean,
    parsedDate,
    isValidDate: true,
    isExpired,
    isExpiringSoon,
    daysLeft: diffDays,
  };
}
