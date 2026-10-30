import React from "react";
import { Building2, ShieldCheck, CheckCircle2, Clock } from "lucide-react";
import { formatReturnPeriod } from "./gstFormUtils";

export interface GstFormHeaderProps {
  header: {
    gstin: string;
    legalName: string;
    tradeName?: string;
    stateCode: string;
    returnPeriod: string;
    filingFrequency: "Monthly" | "Quarterly-QRMP";
    turnoverSlab: "Up to ₹5 crore" | "Above ₹5 crore";
    registrationType: "Regular" | "Composition";
  };
  lastSavedAt?: string | null;
  currentStep: "step0" | "wizard" | "gstr1" | "gstr3b" | "summary";
  onStepChange?: (step: "step0" | "wizard" | "gstr1" | "gstr3b" | "summary") => void;
  activeSectionTitle?: string;
  onBackToDashboard?: () => void;
}

export const GstFormHeader: React.FC<GstFormHeaderProps> = ({
  header,
  lastSavedAt,
  currentStep,
  onStepChange,
  activeSectionTitle,
  onBackToDashboard,
}) => {
  return (
    <div className="space-y-3">
      {/* Top Navbar / Branding Strip */}
      <div className="bg-white dark:bg-[#1e293b] border-b border-[#dde2e8] dark:border-[#334155] px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#31719B] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            CA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                Turia Practice · GST Return Filing Portal
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Official Client Portal
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Direct GST data collection for GSTR-1 & GSTR-3B preparation
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 md:gap-2">
          <button
            type="button"
            onClick={() => onStepChange?.("step0")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              currentStep === "step0"
                ? "bg-[#31719B] text-white shadow-xs"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            1. Scope & Setup
          </button>
          <span className="text-gray-300 dark:text-gray-600">→</span>
          <button
            type="button"
            onClick={() => onStepChange?.("wizard")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              currentStep === "wizard" || currentStep === "gstr1" || currentStep === "gstr3b"
                ? "bg-[#31719B] text-white shadow-xs"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            2. Smart Form Wizard
          </button>
          <span className="text-gray-300 dark:text-gray-600">→</span>
          <button
            type="button"
            onClick={() => onStepChange?.("summary")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              currentStep === "summary"
                ? "bg-[#31719B] text-white shadow-xs"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            3. Summary & Submit
          </button>
        </div>
      </div>

      {/* Prefilled Header Card (P) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#31719B]" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Prefilled Taxpayer Master (Read-Only)
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {lastSavedAt ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Draft auto-saved {lastSavedAt}</span>
                </span>
              ) : (
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Auto-save enabled</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs pt-3">
            <div>
              <span className="text-gray-400 block text-[11px]">GSTIN</span>
              <span className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-wide">
                {header.gstin}
              </span>
            </div>

            <div>
              <span className="text-gray-400 block text-[11px]">Legal Name</span>
              <span className="font-semibold text-gray-900 dark:text-white truncate block" title={header.legalName}>
                {header.legalName}
              </span>
            </div>

            <div>
              <span className="text-gray-400 block text-[11px]">Trade Name</span>
              <span className="font-semibold text-gray-900 dark:text-white truncate block">
                {header.tradeName || header.legalName}
              </span>
            </div>

            <div>
              <span className="text-gray-400 block text-[11px]">Return Period</span>
              <span className="font-bold text-[#31719B] dark:text-blue-400 font-mono">
                {formatReturnPeriod(header.returnPeriod)}
              </span>
            </div>

            <div>
              <span className="text-gray-400 block text-[11px]">Filing Frequency</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {header.filingFrequency}
              </span>
            </div>

            <div>
              <span className="text-gray-400 block text-[11px]">Turnover Slab</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {header.turnoverSlab}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

