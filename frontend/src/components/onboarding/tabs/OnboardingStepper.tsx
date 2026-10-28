"use client";

import React from "react";
import {
  Building2,
  CreditCard,
  Palette,
  FileText,
  Share2,
  Clock,
  Blocks,
  CheckCircle2,
} from "lucide-react";

export interface StepItem {
  id: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

export const ONBOARDING_SECTIONS: StepItem[] = [
  { id: 1, label: "Firm Details", icon: Building2 },
  { id: 2, label: "Bank & Payments", icon: CreditCard },
  { id: 3, label: "Branding", icon: Palette },
  { id: 4, label: "Document Settings", icon: FileText },
  { id: 5, label: "Invoice Sharing", icon: Share2 },
  { id: 6, label: "Business Hours", icon: Clock },
  { id: 7, label: "Integrations", icon: Blocks },
];

interface OnboardingStepperProps {
  currentStep: number;
  onSelectStep: (stepId: number) => void;
  completedSteps?: number[];
}

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({
  currentStep,
  onSelectStep,
  completedSteps = [],
}) => {
  return (
    <div className="w-full space-y-2">
      {/* Subtitle text matching Image 1 */}
      {/* <p className="text-center text-xs text-[var(--text-muted)] font-medium">
        Configure your firm identity, banking, branding, and document preferences.
      </p> */}

      {/* Pill Segmented Navigation Bar matching Image 1 with #F6F4F2 header & enhanced shadow */}
      <div className="bg-[#F6F4F2] dark:bg-[#1e1c19] p-1.5 border border-[#EBE7E2] dark:border-stone-800 flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-slim shadow-md">
        {ONBOARDING_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = currentStep === section.id;
          const isDone = completedSteps.includes(section.id) || currentStep > section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectStep(section.id)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-3 sm:px-4.5 rounded-sm text-xs font-semibold transition-all whitespace-nowrap cursor-pointer select-none ${isActive
                ? "bg-white dark:bg-[#0f172a] text-[#4F46E5] dark:text-[#818cf8] shadow-md font-bold scale-[1.01]"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/40"
                }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${isActive
                  ? "text-[#4F46E5] dark:text-[#818cf8]"
                  : "text-gray-400 dark:text-gray-500"
                  }`}
              />
              <span>{section.label}</span>
              {isDone && !isActive && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
