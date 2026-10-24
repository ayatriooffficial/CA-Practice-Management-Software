"use client";

import React from "react";
import { Service } from "@/data/serviceData";
import { Info } from "lucide-react";

interface ServiceOverviewTabProps {
  service: Service;
}

export const ServiceOverviewTab: React.FC<ServiceOverviewTabProps> = ({ service }) => {
  // Generate recurring schedule rows for the financial year 2026-2027
  const isMonthly = (service.frequency || "Monthly").toLowerCase() === "monthly";
  const isQuarterly = (service.frequency || "").toLowerCase() === "quarterly";

  const scheduleRows = React.useMemo(() => {
    if (service.recurringSchedule?.periods && service.recurringSchedule.periods.length > 0) {
      const currentMonthStr = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });
      return service.recurringSchedule.periods.map((p) => ({
        period: p.period,
        subPeriod: p.subPeriod || `Filing for ${p.period}`,
        dueIn: p.dueIn,
        dueInSub: p.dueInType === "within_period" ? "within period" : "after period",
        startDay: `${p.startDay} Day`,
        startDaySub: p.startDate || "—",
        targetDay: `${p.targetDay} Day`,
        targetDaySub: p.targetDate || "—",
        endDay: `${p.dueDay} Day`,
        endDaySub: p.dueDate || "—",
        isCurrent: p.period.toLowerCase().includes(currentMonthStr.toLowerCase()),
      }));
    }

    if (isQuarterly) {
      return [
        {
          period: "Q1 (Apr - Jun 2026)",
          subPeriod: "Filing for Q1 FY 2026-27",
          dueIn: "Jul 2026",
          dueInSub: "after period",
          startDay: "5 Day",
          startDaySub: "Jul 5th, 2026",
          targetDay: "25 Day",
          targetDaySub: "Jul 25th, 2026",
          endDay: "31 Day",
          endDaySub: "Jul 31st, 2026",
          isCurrent: false,
        },
        {
          period: "Q2 (Jul - Sep 2026)",
          subPeriod: "Filing for Q2 FY 2026-27",
          dueIn: "Oct 2026",
          dueInSub: "after period",
          startDay: "5 Day",
          startDaySub: "Oct 5th, 2026",
          targetDay: "25 Day",
          targetDaySub: "Oct 25th, 2026",
          endDay: "31 Day",
          endDaySub: "Oct 31st, 2026",
          isCurrent: true,
        },
        {
          period: "Q3 (Oct - Dec 2026)",
          subPeriod: "Filing for Q3 FY 2026-27",
          dueIn: "Jan 2027",
          dueInSub: "after period",
          startDay: "5 Day",
          startDaySub: "Jan 5th, 2027",
          targetDay: "25 Day",
          targetDaySub: "Jan 25th, 2027",
          endDay: "31 Day",
          endDaySub: "Jan 31st, 2027",
          isCurrent: false,
        },
        {
          period: "Q4 (Jan - Mar 2027)",
          subPeriod: "Filing for Q4 FY 2026-27",
          dueIn: "Apr 2027",
          dueInSub: "after period",
          startDay: "5 Day",
          startDaySub: "Apr 5th, 2027",
          targetDay: "25 Day",
          targetDaySub: "Apr 25th, 2027",
          endDay: "30 Day",
          endDaySub: "Apr 30th, 2027",
          isCurrent: false,
        },
      ];
    }

    // Default: Monthly schedule (12 months matching Screenshot 2)
    const months = [
      { name: "Apr 2026", due: "May 2026", startSub: "May 2nd, 2026", targetSub: "May 6th, 2026", endSub: "May 8th, 2026", current: false },
      { name: "May 2026", due: "Jun 2026", startSub: "Jun 2nd, 2026", targetSub: "Jun 6th, 2026", endSub: "Jun 8th, 2026", current: false },
      { name: "Jun 2026", due: "Jul 2026", startSub: "Jul 2nd, 2026", targetSub: "Jul 6th, 2026", endSub: "Jul 8th, 2026", current: true },
      { name: "Jul 2026", due: "Aug 2026", startSub: "Aug 2nd, 2026", targetSub: "Aug 6th, 2026", endSub: "Aug 8th, 2026", current: false },
      { name: "Aug 2026", due: "Sep 2026", startSub: "Sep 2nd, 2026", targetSub: "Sep 6th, 2026", endSub: "Sep 8th, 2026", current: false },
      { name: "Sep 2026", due: "Oct 2026", startSub: "Oct 2nd, 2026", targetSub: "Oct 6th, 2026", endSub: "Oct 8th, 2026", current: false },
      { name: "Oct 2026", due: "Nov 2026", startSub: "Nov 2nd, 2026", targetSub: "Nov 6th, 2026", endSub: "Nov 8th, 2026", current: false },
      { name: "Nov 2026", due: "Dec 2026", startSub: "Dec 2nd, 2026", targetSub: "Dec 6th, 2026", endSub: "Dec 8th, 2026", current: false },
      { name: "Dec 2026", due: "Jan 2027", startSub: "Jan 2nd, 2027", targetSub: "Jan 6th, 2027", endSub: "Jan 8th, 2027", current: false },
      { name: "Jan 2027", due: "Feb 2027", startSub: "Feb 2nd, 2027", targetSub: "Feb 6th, 2027", endSub: "Feb 8th, 2027", current: false },
      { name: "Feb 2027", due: "Mar 2027", startSub: "Mar 2nd, 2027", targetSub: "Mar 6th, 2027", endSub: "Mar 8th, 2027", current: false },
      { name: "Mar 2027", due: "Apr 2027", startSub: "Apr 2nd, 2027", targetSub: "Apr 6th, 2027", endSub: "Apr 8th, 2027", current: false },
    ];

    return months.map((m) => ({
      period: m.name,
      subPeriod: `Filing for ${m.name}`,
      dueIn: m.due,
      dueInSub: "after period",
      startDay: "2 Day",
      startDaySub: m.startSub,
      targetDay: "6 Day",
      targetDaySub: m.targetSub,
      endDay: "8 Day",
      endDaySub: m.endSub,
      isCurrent: m.current,
    }));
  }, [isQuarterly]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top 2 Cards: BASIC INFORMATION & COMMERCIAL & TAX matching Screenshot 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: BASIC INFORMATION */}
        <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-6 shadow-xs">
          <h4 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-5">
            BASIC INFORMATION
          </h4>

          <div className="grid grid-cols-2 gap-y-5 gap-x-4">
            {/* Service Name */}
            <div>
              <span className="block text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                SERVICE NAME
              </span>
              <span className="text-sm font-bold text-[var(--text-main)] block mt-1">
                {service.name}
              </span>
            </div>

            {/* Category */}
            <div>
              <span className="block text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                CATEGORY
              </span>
              <span className="text-sm font-semibold text-[var(--text-main)] block mt-1">
                {service.category || "Retainer"}
              </span>
            </div>

            {/* Frequency */}
            <div>
              <span className="block text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                FREQUENCY
              </span>
              <span className="text-sm font-semibold text-[var(--text-main)] block mt-1">
                {service.frequency || "Monthly"}
              </span>
            </div>

            {/* Recurring */}
            <div>
              <span className="block text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                RECURRING
              </span>
              <span className="text-sm font-semibold text-[var(--text-main)] block mt-1">
                {service.isRecurring ? "Yes" : "No"}
              </span>
            </div>

            {/* Due Timing */}
            <div>
              <span className="block text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                DUE TIMING
              </span>
              <span className="text-sm font-semibold text-[var(--text-main)] block mt-1">
                {service.recurringSchedule?.timingType === "within_period"
                  ? "Within filing period"
                  : "After period ends"}
              </span>
            </div>

            {/* Difficulty */}
            <div>
              <span className="flex items-center gap-1 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                <span>DIFFICULTY</span>
                <Info className="w-3 h-3 text-gray-400" />
              </span>
              <span className="text-sm font-semibold text-[var(--text-main)] block mt-1">
                {service.difficulty || "—"}
              </span>
            </div>

            {/* Description (Full width) */}
            <div className="col-span-2 pt-1 border-t border-gray-100 dark:border-gray-800">
              <span className="block text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                DESCRIPTION
              </span>
              <span className="text-xs text-[var(--text-subtle)] block mt-1 leading-relaxed">
                {service.description || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: COMMERCIAL & TAX */}
        <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-6 shadow-xs">
          <h4 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-5">
            COMMERCIAL & TAX
          </h4>

          <div className="grid grid-cols-2 gap-y-5 gap-x-4">
            {/* Amount */}
            <div>
              <span className="block text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                AMOUNT
              </span>
              <span className="text-sm font-bold text-[var(--text-main)] block mt-1">
                {service.professionalFee ? `₹ ${service.professionalFee.toLocaleString()}` : "—"}
              </span>
            </div>

            {/* Tax Rate */}
            <div>
              <span className="block text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                TAX RATE
              </span>
              <span className="text-sm font-semibold text-[var(--text-main)] block mt-1">
                {service.taxRate || "—"}
              </span>
            </div>

            {/* SAC Code */}
            <div>
              <span className="block text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                SAC CODE
              </span>
              <span className="text-sm font-mono font-semibold text-[var(--text-main)] block mt-1">
                {service.sacCode || "—"}
              </span>
            </div>

            {/* Max OOP Budget */}
            <div>
              <span className="block text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                MAX OOP BUDGET
              </span>
              <span className="text-sm font-semibold text-[var(--text-main)] block mt-1">
                {service.maxOopBudget ? `₹ ${service.maxOopBudget.toLocaleString()}` : "—"}
              </span>
            </div>

            {/* TAT Days */}
            <div>
              <span className="block text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                TAT DAYS
              </span>
              <span className="text-sm font-semibold text-[var(--text-main)] block mt-1">
                {service.tatDays ? `${service.tatDays}` : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Card: Recurring Schedule matching Screenshot 2 */}
      <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-6 shadow-xs space-y-4">
        {/* Recurring Schedule Header */}
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-[var(--text-main)]">
            Recurring Schedule
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60">
            {isMonthly ? "Monthly • 12 periods" : isQuarterly ? "Quarterly • 4 periods" : `${service.frequency || "Monthly"} schedule`}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            {service.recurringSchedule?.timingType === "within_period" ? "within period" : "after period"}
          </span>
        </div>

        {/* Schedule Table */}
        <div className="border border-[var(--border-main)] rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-main)] bg-gray-50/60 dark:bg-gray-800/40 text-[11px] font-semibold">
                <th className="py-3 px-4 text-gray-400 uppercase tracking-wider">PERIOD</th>
                <th className="py-3 px-4 text-gray-400 uppercase tracking-wider">DUE IN</th>
                <th className="py-3 px-4 text-gray-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <span>START DAY</span>
                    <Info className="w-3 h-3 text-gray-400" />
                  </span>
                </th>
                <th className="py-3 px-4 text-amber-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <span>TARGET DAY</span>
                    <Info className="w-3 h-3 text-amber-500" />
                  </span>
                </th>
                <th className="py-3 px-4 text-rose-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <span>END DAY (DUE)</span>
                    <Info className="w-3 h-3 text-rose-500" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)] text-xs">
              {scheduleRows.map((row, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors ${
                    row.isCurrent ? "bg-purple-50/20 dark:bg-purple-950/10" : ""
                  }`}
                >
                  {/* Period Column */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text-main)]">
                        {row.period}
                      </span>
                      {row.isCurrent && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-200">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {row.subPeriod}
                    </div>
                  </td>

                  {/* Due In Column */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {row.dueIn}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {row.dueInSub}
                    </div>
                  </td>

                  {/* Start Day Column */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[var(--text-main)]">
                      {row.startDay}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {row.startDaySub}
                    </div>
                  </td>

                  {/* Target Day Column (Amber font) */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-amber-600 dark:text-amber-400">
                      {row.targetDay}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {row.targetDaySub}
                    </div>
                  </td>

                  {/* End Day Column (Rose/Red font) */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-rose-600 dark:text-rose-400">
                      {row.endDay}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {row.endDaySub}
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
