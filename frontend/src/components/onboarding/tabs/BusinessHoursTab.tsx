"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DaySchedule } from "./types";

export interface BusinessHoursTabProps {
  shiftName: string;
  setShiftName: (val: string) => void;
  schedules: DaySchedule[];
  setSchedules: React.Dispatch<React.SetStateAction<DaySchedule[]>>;
  totalWeeklyHours: number;
  totalMonthlyHours: number;
  gracePeriod: string;
  setGracePeriod: (val: string) => void;
  enableAutoLogout: boolean;
  setEnableAutoLogout: (val: boolean) => void;
  autoLogoutAfter: string;
  setAutoLogoutAfter: (val: string) => void;
  onPrevious: () => void;
  onSkip: () => void;
  onNext: () => void;
}

export const BusinessHoursTab: React.FC<BusinessHoursTabProps> = ({
  shiftName,
  setShiftName,
  schedules,
  setSchedules,
  totalWeeklyHours,
  totalMonthlyHours,
  gracePeriod,
  setGracePeriod,
  enableAutoLogout,
  setEnableAutoLogout,
  autoLogoutAfter,
  setAutoLogoutAfter,
  onPrevious,
  onSkip,
  onNext,
}) => {
  const router = useRouter();

  const handleToggleDay = (idx: number) => {
    setSchedules((prev) =>
      prev.map((s, i) => {
        if (i === idx) {
          const nextEnabled = !s.enabled;
          return {
            ...s,
            enabled: nextEnabled,
            from: nextEnabled ? s.from || "09:30 AM" : "",
            to: nextEnabled ? s.to || "06:30 PM" : "",
            hours: nextEnabled ? 9.0 : 0.0,
          };
        }
        return s;
      })
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1.5">
          Shift Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={shiftName}
          onChange={(e) => setShiftName(e.target.value)}
          placeholder="General Shift"
          className="max-w-md w-full h-[42px] px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-center">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Weekly Hours</span>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">
            {totalWeeklyHours.toFixed(2)} Hrs
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-center">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Monthly Hours</span>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
            {totalMonthlyHours.toFixed(2)} Hrs
          </div>
        </div>
      </div>

      {/* Days Schedule Table */}
      <div className="space-y-3 pt-2">
        {schedules.map((item, idx) => (
          <div
            key={item.day}
            className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] text-xs"
          >
            {/* Checkbox and Day Name */}
            <label className="flex items-center gap-2.5 w-32 cursor-pointer font-semibold text-[var(--text-main)]">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={() => handleToggleDay(idx)}
                className="w-4 h-4 rounded text-[var(--primary)] accent-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
              />
              <span>{item.day}</span>
            </label>

            {/* From & To Time Inputs */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-muted)]">From</span>
                <input
                  type="text"
                  disabled={!item.enabled}
                  value={item.from}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSchedules((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, from: val } : s))
                    );
                  }}
                  placeholder="9:30 AM"
                  className="w-24 h-8 px-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center text-xs text-[var(--text-main)] disabled:opacity-40"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-muted)]">To</span>
                <input
                  type="text"
                  disabled={!item.enabled}
                  value={item.to}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSchedules((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, to: val } : s))
                    );
                  }}
                  placeholder="6:30 PM"
                  className="w-24 h-8 px-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center text-xs text-[var(--text-main)] disabled:opacity-40"
                />
              </div>
            </div>

            {/* Calculated Daily Hours */}
            <div className="w-16 text-right font-mono font-bold text-[var(--text-main)]">
              {item.hours.toFixed(1)} Hrs
            </div>
          </div>
        ))}
      </div>

      {/* Grace Period & Auto Logout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[var(--border-subtle)]">
        <div>
          <label className="block text-[13px] font-semibold text-[var(--text-main)] mb-1">
            Grace Period (Minutes)
          </label>
          <input
            type="number"
            value={gracePeriod}
            onChange={(e) => setGracePeriod(e.target.value)}
            placeholder="15"
            className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
          />
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
            Allows employees to clock in late without late mark
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[13px] font-semibold text-[var(--text-main)]">
              Enable Auto Logout
            </label>
            <button
              type="button"
              onClick={() => setEnableAutoLogout(!enableAutoLogout)}
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enableAutoLogout ? "bg-[var(--primary)]" : "bg-gray-300 dark:bg-gray-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  enableAutoLogout ? "translate-x-3" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <input
            type="text"
            disabled={!enableAutoLogout}
            value={autoLogoutAfter}
            onChange={(e) => setAutoLogoutAfter(e.target.value)}
            placeholder="8:00 PM"
            className="w-full h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-main)] disabled:opacity-40 focus:outline-none focus:border-[var(--primary)]"
          />
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
            Automatically log out after specified time
          </span>
        </div>
      </div>

      {/* Step 4 Actions */}
      <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
        >
          Previous
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onNext}
            className="px-6 py-2.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-sm font-semibold text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Save & Next</span>
          </button>
        </div>
      </div>
    </div>
  );
};
