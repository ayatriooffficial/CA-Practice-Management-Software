"use client";

import React, { memo } from "react";
import { ChevronRight } from "lucide-react";

interface DealCardProps {
  dealValue?: number | null;
  onEditDeal?: () => void;
}

export const DealCard = memo(({ dealValue, onEditDeal }: DealCardProps) => {
  const hasValue = dealValue !== undefined && dealValue !== null && dealValue > 0;
  const formatted = hasValue
    ? new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(dealValue)
    : "Not set";

  return (
    <div className="bg-white dark:bg-[#1e293b]  border border-[#e2e8f0] dark:border-[#334155] p-4 flex items-center justify-between shadow-sm">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
          DEAL
        </div>
        <div
          className={`mt-0.5 ${hasValue
              ? "text-xl font-extrabold text-gray-900 dark:text-white"
              : "text-sm font-semibold text-gray-400 dark:text-gray-500"
            }`}
        >
          {formatted}
        </div>
      </div>

      <button
        type="button"
        onClick={onEditDeal}
        className="flex items-center text-xs font-semibold text-[#31719B] dark:text-[#60a5fa] hover:underline cursor-pointer"
      >
        <span>{hasValue ? "Edit" : "Set Deal"}</span>
        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
      </button>
    </div>
  );
});

DealCard.displayName = "DealCard";
