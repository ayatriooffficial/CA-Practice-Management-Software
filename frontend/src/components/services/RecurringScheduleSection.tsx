"use client";

import React, { useMemo } from "react";
import { ServiceRecurringSchedule, ServiceRecurringPeriod } from "@/data/serviceData";

export interface RecurringScheduleSectionProps {
  frequency: string;
  schedule: ServiceRecurringSchedule;
  onChange: (updated: ServiceRecurringSchedule) => void;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:  return `${day}st`;
    case 2:  return `${day}nd`;
    case 3:  return `${day}rd`;
    default: return `${day}th`;
  }
}

/**
 * Helper to generate 1 year of recurring periods from current date
 */
export function generateYearlyRecurringPeriods(
  frequency: string = "Monthly",
  timingType: "after_period" | "within_period" = "after_period",
  defaults = { startDay: 2, targetDay: 6, dueDay: 8 }
): ServiceRecurringPeriod[] {
  const currentDate = new Date();
  const periods: ServiceRecurringPeriod[] = [];
  const isQuarterly = frequency === "Quarterly";
  const count = isQuarterly ? 4 : 12;

  for (let i = 0; i < count; i++) {
    if (isQuarterly) {
      const qIndex = (Math.floor(currentDate.getMonth() / 3) + i) % 4;
      const qYear = currentDate.getFullYear() + Math.floor((Math.floor(currentDate.getMonth() / 3) + i) / 4);
      const qNumber = qIndex + 1;
      const qStartMonth = MONTH_NAMES[qIndex * 3];
      const qEndMonth = MONTH_NAMES[qIndex * 3 + 2];
      const periodName = `Q${qNumber} (${qStartMonth} - ${qEndMonth} ${qYear})`;

      const dueMonthIndex = timingType === "after_period" ? (qIndex * 3 + 3) % 12 : qIndex * 3 + 2;
      const dueYear = timingType === "after_period" && dueMonthIndex < (qIndex * 3 + 2) ? qYear + 1 : qYear;
      const dueIn = `${MONTH_NAMES[dueMonthIndex]} ${dueYear}`;

      const sDay = defaults.startDay || 5;
      const tDay = defaults.targetDay || 25;
      const dDay = defaults.dueDay || 30;

      periods.push({
        period: periodName,
        subPeriod: `Filing for Q${qNumber} FY ${qYear}`,
        dueIn,
        dueInType: timingType,
        startDay: sDay,
        targetDay: tDay,
        dueDay: dDay,
        isOverride: false,
        startDate: `${MONTH_NAMES[dueMonthIndex]} ${getOrdinalSuffix(sDay)}, ${dueYear}`,
        targetDate: `${MONTH_NAMES[dueMonthIndex]} ${getOrdinalSuffix(tDay)}, ${dueYear}`,
        dueDate: `${MONTH_NAMES[dueMonthIndex]} ${getOrdinalSuffix(dDay)}, ${dueYear}`,
      });
    } else {
      // Monthly 12 periods
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const pMonth = MONTH_NAMES[d.getMonth()];
      const pYear = d.getFullYear();
      const periodName = `${pMonth} ${pYear}`;

      const dueD = timingType === "after_period"
        ? new Date(d.getFullYear(), d.getMonth() + 1, 1)
        : new Date(d.getFullYear(), d.getMonth(), 1);
      const dueMonth = MONTH_NAMES[dueD.getMonth()];
      const dueYear = dueD.getFullYear();
      const dueIn = `${dueMonth} ${dueYear}`;

      // Row 0 has default values, rows 1..11 can have override if customized
      const sDay = i === 0 ? defaults.startDay : 1;
      const tDay = i === 0 ? defaults.targetDay : 5;
      const dDay = i === 0 ? defaults.dueDay : 7;
      const isOverridden = i > 0 && (sDay !== defaults.startDay || tDay !== defaults.targetDay || dDay !== defaults.dueDay);

      periods.push({
        period: periodName,
        subPeriod: `Filing for ${periodName}`,
        dueIn,
        dueInType: timingType,
        startDay: sDay,
        targetDay: tDay,
        dueDay: dDay,
        isOverride: isOverridden,
        startDate: `${dueMonth} ${getOrdinalSuffix(sDay)}, ${dueYear}`,
        targetDate: `${dueMonth} ${getOrdinalSuffix(tDay)}, ${dueYear}`,
        dueDate: `${dueMonth} ${getOrdinalSuffix(dDay)}, ${dueYear}`,
      });
    }
  }

  return periods;
}

export const RecurringScheduleSection: React.FC<RecurringScheduleSectionProps> = ({
  frequency,
  schedule,
  onChange,
}) => {
  const timingType = schedule.timingType || "after_period";
  const periods = schedule.periods || [];

  // Toggle timing type (After period ends vs Within filing period)
  const handleTimingTypeChange = (newType: "after_period" | "within_period") => {
    if (newType === timingType) return;
    const updatedPeriods = periods.map((p, idx) => {
      // Recalculate dueIn based on newType
      const [pMonthStr, pYearStr] = p.period.split(" ");
      const pMonthIdx = MONTH_NAMES.indexOf(pMonthStr);
      const pYear = parseInt(pYearStr, 10);

      let dueMonth = pMonthStr;
      let dueYear = pYear;
      if (newType === "after_period" && pMonthIdx !== -1 && !isNaN(pYear)) {
        const nextD = new Date(pYear, pMonthIdx + 1, 1);
        dueMonth = MONTH_NAMES[nextD.getMonth()];
        dueYear = nextD.getFullYear();
      }

      const dueIn = `${dueMonth} ${dueYear}`;
      return {
        ...p,
        dueIn,
        dueInType: newType,
        startDate: `${dueMonth} ${getOrdinalSuffix(p.startDay)}, ${dueYear}`,
        targetDate: `${dueMonth} ${getOrdinalSuffix(p.targetDay)}, ${dueYear}`,
        dueDate: `${dueMonth} ${getOrdinalSuffix(p.dueDay)}, ${dueYear}`,
      };
    });

    onChange({
      ...schedule,
      timingType: newType,
      periods: updatedPeriods,
    });
  };

  // Change day value on a specific period row
  const handlePeriodDayChange = (
    index: number,
    field: "startDay" | "targetDay" | "dueDay",
    val: number
  ) => {
    const clampedVal = Math.max(1, Math.min(31, isNaN(val) ? 1 : val));
    const firstRow = periods[0];

    const updatedPeriods = periods.map((p, idx) => {
      if (idx !== index) return p;
      const updatedRow = {
        ...p,
        [field]: clampedVal,
      };

      // Recalculate formatted dates for this row
      const dueMonth = p.dueIn.split(" ")[0] || "May";
      const dueYear = p.dueIn.split(" ")[1] || "2026";
      updatedRow.startDate = `${dueMonth} ${getOrdinalSuffix(updatedRow.startDay)}, ${dueYear}`;
      updatedRow.targetDate = `${dueMonth} ${getOrdinalSuffix(updatedRow.targetDay)}, ${dueYear}`;
      updatedRow.dueDate = `${dueMonth} ${getOrdinalSuffix(updatedRow.dueDay)}, ${dueYear}`;

      // Determine override status: if row is not row 0, compare with row 0
      if (idx > 0 && firstRow) {
        const isDiff =
          updatedRow.startDay !== firstRow.startDay ||
          updatedRow.targetDay !== firstRow.targetDay ||
          updatedRow.dueDay !== firstRow.dueDay;
        updatedRow.isOverride = isDiff;
      }

      return updatedRow;
    });

    onChange({
      ...schedule,
      periods: updatedPeriods,
    });
  };

  // Apply row 0 values to all period rows
  const handleApplyFirstRowToAll = () => {
    if (periods.length === 0) return;
    const first = periods[0];
    const sDay = first.startDay;
    const tDay = first.targetDay;
    const dDay = first.dueDay;

    const updatedPeriods = periods.map((p, idx) => {
      const dueMonth = p.dueIn.split(" ")[0] || "May";
      const dueYear = p.dueIn.split(" ")[1] || "2026";

      return {
        ...p,
        startDay: sDay,
        targetDay: tDay,
        dueDay: dDay,
        isOverride: false, // cleared because all match row 0
        startDate: `${dueMonth} ${getOrdinalSuffix(sDay)}, ${dueYear}`,
        targetDate: `${dueMonth} ${getOrdinalSuffix(tDay)}, ${dueYear}`,
        dueDate: `${dueMonth} ${getOrdinalSuffix(dDay)}, ${dueYear}`,
      };
    });

    onChange({
      ...schedule,
      periods: updatedPeriods,
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* 1. TIMING OPTION CARDS (Matching Screenshot top) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Card 1: After period ends */}
        <div
          onClick={() => handleTimingTypeChange("after_period")}
          className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
            timingType === "after_period"
              ? "border-[#31719B] bg-blue-50/40 dark:bg-[#1a2c42]/40 shadow-xs"
              : "border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              <input
                type="radio"
                name="timingTypeOption"
                checked={timingType === "after_period"}
                onChange={() => handleTimingTypeChange("after_period")}
                className="w-4 h-4 text-[#31719B] border-gray-300 focus:ring-[#31719B] cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <span className="block text-sm font-bold text-gray-900 dark:text-white">
                After period ends
              </span>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                File after the period closes — e.g. TDS for Apr filed in May
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-400 pt-0.5">
                e.g. TDS · GSTR-1 · GSTR-3B
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Within filing period */}
        <div
          onClick={() => handleTimingTypeChange("within_period")}
          className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
            timingType === "within_period"
              ? "border-[#31719B] bg-blue-50/40 dark:bg-[#1a2c42]/40 shadow-xs"
              : "border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              <input
                type="radio"
                name="timingTypeOption"
                checked={timingType === "within_period"}
                onChange={() => handleTimingTypeChange("within_period")}
                className="w-4 h-4 text-[#31719B] border-gray-300 focus:ring-[#31719B] cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <span className="block text-sm font-bold text-gray-900 dark:text-white">
                Within filing period
              </span>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                Pay/file before the period ends — e.g. Advance Tax Q1 paid by 15 Jun
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-400 pt-0.5">
                e.g. Advance Tax instalments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-HEADER BAR: Instruction & "Apply first row to all" Button */}
      <div className="flex items-center justify-between pt-2 pb-0.5 px-0.5">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          Each period can be configured independently
        </span>
        <button
          type="button"
          onClick={handleApplyFirstRowToAll}
          title="Copy the first row's day values to all periods"
          className="h-8 px-3 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] text-xs font-semibold text-[#31719B] dark:text-[#5fa8d3] hover:bg-[#31719B]/5 dark:hover:bg-[#31719B]/10 transition-colors shadow-2xs cursor-pointer"
        >
          Apply first row to all
        </button>
      </div>

      {/* 3. RECURRING SCHEDULE 1-YEAR TABLE (Matching Screenshot Table) */}
      <div className="rounded-xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-hidden shadow-card">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr
                className="text-gray-600 dark:text-gray-300"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                <th className="px-4 py-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-bold text-[11px] uppercase tracking-wider text-gray-500">
                  PERIOD
                </th>
                <th className="px-4 py-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-bold text-[11px] uppercase tracking-wider text-gray-500">
                  DUE IN
                </th>
                <th className="px-4 py-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-bold text-[11px] uppercase tracking-wider text-gray-500 text-center">
                  START DAY
                </th>
                <th className="px-4 py-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-bold text-[11px] uppercase tracking-wider text-[#ea580c] dark:text-[#fb923c] text-center">
                  TARGET DAY
                </th>
                <th className="px-4 py-3.5 border-b border-[#dde2e8] dark:border-[#334155] font-bold text-[11px] uppercase tracking-wider text-[#e11d48] dark:text-[#f43f5e] text-center">
                  DUE DAY
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
              {periods.map((row, idx) => (
                <tr
                  key={`${row.period}-${idx}`}
                  className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors"
                >
                  {/* Column 1: PERIOD */}
                  <td className="px-4 py-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white text-xs">
                        {row.period}
                      </span>
                      {row.isOverride && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                          override
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-400 mt-0.5">
                      {row.subPeriod || `Filing for ${row.period}`}
                    </div>
                  </td>

                  {/* Column 2: DUE IN */}
                  <td className="px-4 py-3.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                    <div className="font-bold text-[#31719B] dark:text-[#6db0db] text-xs">
                      {row.dueIn}
                    </div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-400 mt-0.5">
                      {timingType === "after_period" ? "after period" : "within period"}
                    </div>
                  </td>

                  {/* Column 3: START DAY */}
                  <td className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className="inline-flex items-center h-8 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-2 shadow-2xs focus-within:border-[#31719B] focus-within:ring-1 focus-within:ring-[#31719B]">
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={row.startDay}
                          onChange={(e) =>
                            handlePeriodDayChange(idx, "startDay", parseInt(e.target.value, 10))
                          }
                          className="w-8 text-center font-bold text-xs text-gray-900 dark:text-white outline-none bg-transparent"
                        />
                        <span className="text-[11px] font-medium text-gray-400 pl-1">
                          Day
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 font-medium block">
                        {row.startDate || "—"}
                      </span>
                    </div>
                  </td>

                  {/* Column 4: TARGET DAY */}
                  <td className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className="inline-flex items-center h-8 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-2 shadow-2xs focus-within:border-[#ea580c] focus-within:ring-1 focus-within:ring-[#ea580c]">
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={row.targetDay}
                          onChange={(e) =>
                            handlePeriodDayChange(idx, "targetDay", parseInt(e.target.value, 10))
                          }
                          className="w-8 text-center font-bold text-xs text-gray-900 dark:text-white outline-none bg-transparent"
                        />
                        <span className="text-[11px] font-medium text-gray-400 pl-1">
                          Day
                        </span>
                      </div>
                      <span className="text-[11px] text-[#ea580c] dark:text-[#fb923c] mt-1.5 font-semibold block">
                        {row.targetDate || "—"}
                      </span>
                    </div>
                  </td>

                  {/* Column 5: DUE DAY */}
                  <td className="px-4 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className="inline-flex items-center h-8 rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-2 shadow-2xs focus-within:border-[#e11d48] focus-within:ring-1 focus-within:ring-[#e11d48]">
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={row.dueDay}
                          onChange={(e) =>
                            handlePeriodDayChange(idx, "dueDay", parseInt(e.target.value, 10))
                          }
                          className="w-8 text-center font-bold text-xs text-gray-900 dark:text-white outline-none bg-transparent"
                        />
                        <span className="text-[11px] font-medium text-gray-400 pl-1">
                          Day
                        </span>
                      </div>
                      <span className="text-[11px] text-[#e11d48] dark:text-[#f43f5e] mt-1.5 font-semibold block">
                        {row.dueDate || "—"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
