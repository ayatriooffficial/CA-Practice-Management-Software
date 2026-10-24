"use client";

import React from "react";
import { Check } from "lucide-react";

interface StepItem {
  id: number;
  label: string;
}

const STEPS: StepItem[] = [
  { id: 1, label: "Organization profile" },
  { id: 2, label: "Bank Account" },
  { id: 3, label: "Invoice" },
  { id: 4, label: "Business Hours" },
  { id: 5, label: "Integration" },
];

interface OnboardingStepperProps {
  currentStep: number;
  onSelectStep: (stepId: number) => void;
}

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({
  currentStep,
  onSelectStep,
}) => {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] px-4 sm:px-6 py-4 shadow-xs">
      <div className="flex items-center justify-between max-w-4xl mx-auto relative">
        {STEPS.map((step, idx) => {
          const isPast = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div key={step.id} className="flex-1 flex flex-col items-center relative group">
              {/* Connecting line */}
              {idx > 0 && (
                <div
                  className={`absolute top-3.5 -left-1/2 w-full h-[2px] transition-colors duration-300 ${
                    currentStep >= step.id ? "bg-[#635BFF]" : "bg-[var(--border-subtle)]"
                  }`}
                  style={{ zIndex: 0 }}
                />
              )}

              {/* Step circle */}
              <button
                type="button"
                onClick={() => onSelectStep(step.id)}
                className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                  isPast
                    ? "bg-[#635BFF] text-white shadow-xs"
                    : isCurrent
                    ? "bg-[#635BFF] text-white ring-4 ring-[#635BFF]/20 shadow-xs"
                    : "bg-[var(--bg-hover)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                }`}
              >
                {isPast ? <Check className="w-4 h-4 stroke-[2.5]" /> : step.id}
              </button>

              {/* Step Label */}
              <span
                onClick={() => onSelectStep(step.id)}
                className={`mt-2 text-[11px] sm:text-xs font-medium text-center whitespace-nowrap cursor-pointer transition-colors ${
                  isCurrent
                    ? "text-[#635BFF] dark:text-[#8276f2] font-semibold"
                    : isPast
                    ? "text-[var(--text-main)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
