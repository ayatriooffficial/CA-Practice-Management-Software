"use client";

import React from "react";
import { Minus } from "lucide-react";
import { useRouter } from "next/navigation";

interface OnboardingHeaderProps {
  businessName: string;
  progressPercent: number;
  stepsRemaining: number;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  businessName,
  progressPercent,
  stepsRemaining,
}) => {
  const router = useRouter();

  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 sm:gap-5">
        {/* SVG Circular Progress Ring */}
        <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
          <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="20"
              className="text-gray-100 dark:text-gray-800"
              strokeWidth="4"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              className="text-[#635BFF] transition-all duration-500 ease-out"
              strokeWidth="4"
              strokeDasharray={125.6}
              strokeDashoffset={125.6 - (125.6 * progressPercent) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <span className="absolute text-[11px] font-bold text-[#635BFF] dark:text-[#8276f2]">
            {progressPercent}%
          </span>
        </div>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-[var(--text-main)] leading-tight">
            Welcome {businessName || "Medappa & Associates"}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Complete your profile setup · {stepsRemaining} steps remaining
          </p>
        </div>
      </div>

      {/* Minimize / Close Button */}
      <button
        type="button"
        onClick={() => router.push("/")}
        title="Minimize to dashboard"
        className="w-8 h-8 rounded-lg border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
};
