"use client";

import React, { useMemo } from "react";
import {
  Check,
  AlertCircle,
  Clock,
  Plus,
  ArrowLeft,
  ArrowRight,
  SkipForward,
  Layers,
  Building2,
  ShoppingBag,
  Store,
  Ban,
  FileMinus2,
  Package,
  CreditCard,
  RotateCcw,
  Percent,
} from "lucide-react";
import { formatIndianCurrency } from "./gstFormUtils";

export interface WizardStepInfo {
  id: string;
  title: string;
  shortTitle: string;
  tableTag: string;
  status: "pending" | "valid" | "warning" | "error";
  hasData: boolean;
  recordCount: number;
}

interface RunningTotals {
  salesTaxable: number;
  salesGst: number;
  itcEntered: number;
  estimatedCashTax: number;
}

interface GstWizardStepperProps {
  steps: WizardStepInfo[];
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
  onAddSection: () => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  runningTotals: RunningTotals;
  isSaving?: boolean;
}

export const GstWizardStepper: React.FC<GstWizardStepperProps> = ({
  steps,
  currentStepIndex,
  onSelectStep,
  onAddSection,
  onBack,
  onNext,
  onSkip,
  isFirstStep,
  isLastStep,
  runningTotals,
  isSaving = false,
}) => {
  const currentStep = steps[currentStepIndex];

  return (
    <div className="space-y-4">
      {/* Top Stepper Navigation */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-[#dde2e8] dark:border-[#334155] p-3 shadow-sm">
        {/* Mobile View: Compact Bar */}
        <div className="sm:hidden flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#31719B] dark:text-[#64B5D6]">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <span className="text-gray-400">·</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
              {currentStep?.shortTitle || currentStep?.title}
            </span>
          </div>
          <button
            type="button"
            onClick={onAddSection}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#31719B] dark:text-[#64B5D6] hover:underline"
          >
            <Plus className="w-3 h-3" /> Add section
          </button>
        </div>

        {/* Desktop View: Horizontal Stepper Strip */}
        <div className="hidden sm:flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto py-1">
            {steps.map((step, idx) => {
              const isCurrent = idx === currentStepIndex;
              const isVisited = idx < currentStepIndex || step.hasData;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onSelectStep(idx)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isCurrent
                      ? "bg-[#31719B] text-white shadow-sm ring-2 ring-[#31719B]/20"
                      : isVisited
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600 cursor-pointer"
                  }`}
                >
                  {/* Status Indicator Icon */}
                  {step.status === "valid" ? (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : step.status === "error" ? (
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  ) : step.status === "warning" ? (
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                  )}

                  <span>{step.shortTitle}</span>

                  {step.recordCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isCurrent
                          ? "bg-white/20 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {step.recordCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Add Section Link */}
          <button
            type="button"
            onClick={onAddSection}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#31719B] dark:text-[#64B5D6] hover:bg-[#31719B]/5 rounded-xl transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Section
          </button>
        </div>
      </div>

      {/* Sticky Running Totals Live Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-3 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Live Estimate:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono">
          <div>
            <span className="text-slate-400 text-[10px] block">Sales Taxable</span>
            <span className="font-bold text-slate-100">
              ₹{formatIndianCurrency(runningTotals.salesTaxable)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] block">GST on Sales</span>
            <span className="font-bold text-amber-300">
              ₹{formatIndianCurrency(runningTotals.salesGst)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] block">ITC Claimed</span>
            <span className="font-bold text-emerald-300">
              ₹{formatIndianCurrency(runningTotals.itcEntered)}
            </span>
          </div>

          <div className="border-l border-slate-700 pl-4 sm:pl-6">
            <span className="text-slate-400 text-[10px] block">Est. Cash Tax</span>
            <span className="font-bold text-blue-300">
              ₹{formatIndianCurrency(runningTotals.estimatedCashTax)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

