/**
 * Date utilities for Turia To-Do Module in Asia/Kolkata timezone
 */

export function getTodayKolkataYMD(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getTomorrowKolkataYMD(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function parseDateToYMD(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const s = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(s);
  if (isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

export function formatFriendlyDate(ymd: string): string {
  try {
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return ymd;
  }
}

export type DateGroupCategory = "today" | "tomorrow" | "upcoming" | "overdue" | "no_date";

export function categorizeTaskByDate(
  dueDateStr: string | null | undefined,
  isCompleted: boolean
): DateGroupCategory {
  const dueYMD = parseDateToYMD(dueDateStr);
  if (!dueYMD) return "no_date";

  const todayYMD = getTodayKolkataYMD();
  const tomorrowYMD = getTomorrowKolkataYMD();

  if (dueYMD === todayYMD) return "today";
  if (dueYMD === tomorrowYMD) return "tomorrow";
  if (dueYMD > tomorrowYMD) return "upcoming";

  // Due date is in the past
  if (!isCompleted && dueYMD < todayYMD) {
    return "overdue";
  }

  return "upcoming";
}
