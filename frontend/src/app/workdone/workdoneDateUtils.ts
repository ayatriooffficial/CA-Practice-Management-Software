// frontend/src/app/workdone/workdoneDateUtils.ts

import type { WorkDoneFrequency, WorkDonePeriod, WorkDoneService } from "./types";

export interface FinancialYearMonth {
  name: string;      // "Apr", "May", etc.
  fullName: string;  // "April", "May", etc.
  year: number;      // 2026, 2027, etc.
  key: string;       // "04", "05", ..., "12", "01", "02", "03"
  monthIndex: number;// 3, 4, ..., 11, 0, 1, 2 (0-indexed JavaScript month)
}

export interface FinancialYearPeriodConfig {
  name: string;
  start: number;
  span: number;
  label: string;
}

export interface FinancialYearStructure {
  startYear: number;
  endYear: number;
  label: string; // e.g. "FY 2026-2027"
  months: FinancialYearMonth[];
  quarters: FinancialYearPeriodConfig[];
  halves: FinancialYearPeriodConfig[];
  fullYear: FinancialYearPeriodConfig;
}

const MONTH_NAMES = [
  { name: "Apr", fullName: "April", key: "04", monthIndex: 3 },
  { name: "May", fullName: "May", key: "05", monthIndex: 4 },
  { name: "Jun", fullName: "June", key: "06", monthIndex: 5 },
  { name: "Jul", fullName: "July", key: "07", monthIndex: 6 },
  { name: "Aug", fullName: "August", key: "08", monthIndex: 7 },
  { name: "Sep", fullName: "September", key: "09", monthIndex: 8 },
  { name: "Oct", fullName: "October", key: "10", monthIndex: 9 },
  { name: "Nov", fullName: "November", key: "11", monthIndex: 10 },
  { name: "Dec", fullName: "December", key: "12", monthIndex: 11 },
  { name: "Jan", fullName: "January", key: "01", monthIndex: 0 },
  { name: "Feb", fullName: "February", key: "02", monthIndex: 1 },
  { name: "Mar", fullName: "March", key: "03", monthIndex: 2 },
];

/**
 * Returns the 4-digit start year of the current financial year.
 * In India, FY starts on April 1 (month index 3).
 * If current month is Jan-Mar (0, 1, 2), start year is currentYear - 1.
 */
export function getCurrentFinancialYearStart(date: Date = new Date()): number {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const month = d.getMonth(); // 0 is January, 3 is April
  return month >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}

/**
 * Returns a complete structure for a financial year given its start year (e.g. 2026 for FY 2026-2027).
 * Centralizes months, quarters, halves, and year periods in one unified configuration.
 */
export function getFinancialYearStructure(startYearInput?: number): FinancialYearStructure {
  const startYear = typeof startYearInput === "number" && !isNaN(startYearInput) && startYearInput > 1900
    ? startYearInput
    : getCurrentFinancialYearStart();

  const endYear = startYear + 1;
  const label = `FY ${startYear}-${endYear}`;

  const months: FinancialYearMonth[] = MONTH_NAMES.map((m) => {
    // April to December belong to startYear; January to March belong to endYear
    const year = m.monthIndex >= 3 ? startYear : endYear;
    return {
      name: m.name,
      fullName: m.fullName,
      year,
      key: m.key,
      monthIndex: m.monthIndex,
    };
  });

  const quarters: FinancialYearPeriodConfig[] = [
    { name: "Q1", start: 0, span: 3, label: "Apr – Jun" },
    { name: "Q2", start: 3, span: 3, label: "Jul – Sep" },
    { name: "Q3", start: 6, span: 3, label: "Oct – Dec" },
    { name: "Q4", start: 9, span: 3, label: "Jan – Mar" },
  ];

  const halves: FinancialYearPeriodConfig[] = [
    { name: "H1", start: 0, span: 6, label: "Apr – Sep" },
    { name: "H2", start: 6, span: 6, label: "Oct – Mar" },
  ];

  const fullYear: FinancialYearPeriodConfig = {
    name: "FY",
    start: 0,
    span: 12,
    label: "Financial Year",
  };

  return {
    startYear,
    endYear,
    label,
    months,
    quarters,
    halves,
    fullYear,
  };
}

/**
 * Extracts "YYYY-MM" string from date safely (supports ISO, UTC, Date object).
 */
export function getMonthKey(date?: string | Date): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return "";

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Builds the period configuration for a given service frequency using the FY structure.
 */
export function getPeriodsForFrequency(
  frequency: WorkDoneFrequency,
  fy: FinancialYearStructure
): WorkDonePeriod[] {
  if (frequency === "QUARTERLY") {
    return fy.quarters.map((period) => ({
      ...period,
      label: period.name,
    }));
  }

  if (frequency === "HALF_YEARLY") {
    return fy.halves.map((period) => ({
      ...period,
      label: period.name,
    }));
  }

  if (frequency === "YEARLY") {
    return [
      {
        name: fy.fullYear.name,
        label: fy.fullYear.label,
        start: fy.fullYear.start,
        span: fy.fullYear.span,
      },
    ];
  }

  // Monthly / One Time default to all 12 months
  return fy.months.map((month, index) => ({
    name: `${month.name} ${month.year}`,
    label: `${month.name} ${month.year}`,
    start: index,
    span: 1,
  }));
}

/**
 * Filters receipts that fall within the given period for a service.
 */
export function getPeriodReceipts(
  services: WorkDoneService[],
  period: WorkDonePeriod,
  months: FinancialYearMonth[]
): WorkDoneService[] {
  const keys = Array.from({ length: period.span }, (_, index) => {
    const month = months[period.start + index];
    if (!month) return "";
    return `${month.year}-${month.key}`;
  }).filter(Boolean);

  return services.filter((service) =>
    keys.includes(getMonthKey(service.paymentDate))
  );
}

/**
 * Finds all available financial years present in a client's services, guaranteed to include the current FY.
 */
export function getAvailableFinancialYears(
  services?: WorkDoneService[],
  currentStartYear = getCurrentFinancialYearStart()
): number[] {
  const years = new Set<number>();
  years.add(currentStartYear);

  if (Array.isArray(services)) {
    services.forEach((s) => {
      if (s.paymentDate) {
        const d = new Date(s.paymentDate);
        if (!isNaN(d.getTime())) {
          years.add(getCurrentFinancialYearStart(d));
        }
      }
      if (s.financialYear) {
        const match = s.financialYear.match(/(\d{4})/);
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > 1900) {
            years.add(parsed);
          }
        }
      }
    });
  }

  return Array.from(years).sort((a, b) => b - a);
}

