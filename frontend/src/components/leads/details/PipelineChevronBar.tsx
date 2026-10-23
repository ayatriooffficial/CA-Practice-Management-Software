"use client";

import React, { memo } from "react";
import { Check } from "lucide-react";

export const PIPELINE_STAGES = [
  { id: "new_lead", label: "NEW LEAD" },
  { id: "contacted", label: "CONTACTED" },
  { id: "proposal_sent", label: "PROPOSAL SENT" },
  { id: "negotiation", label: "NEGOTIATION" },
  { id: "qualified_lead", label: "QUALIFIED LEAD" },
  { id: "follow_up_scheduled", label: "FOLLOW UP SCHEDULED" },
  { id: "demo_scheduled", label: "DEMO SCHEDULED" },
  { id: "decision_pending", label: "DECISION PENDING" },
  { id: "won", label: "WON / CLOSED WON" },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]["id"];

interface PipelineChevronBarProps {
  currentStage: string;
  onSelectStage: (stageId: string) => void;
  disabled?: boolean;
}

export const PipelineChevronBar = memo(
  ({ currentStage, onSelectStage, disabled }: PipelineChevronBarProps) => {
    // Normalize current stage matching
    const activeIndex = Math.max(
      0,
      PIPELINE_STAGES.findIndex(
        (s) =>
          s.id.toLowerCase() === (currentStage || "new_lead").toLowerCase() ||
          s.label.toLowerCase() === (currentStage || "").toLowerCase()
      )
    );

    return (
      <div className="w-full bg-[#f8fafc] dark:bg-[#0f172a] border-y border-[#e2e8f0] dark:border-[#334155] py-1.5 px-2 overflow-x-auto scrollbar-slim select-none">
        <div className="flex items-center min-w-max ">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isCompleted = idx < activeIndex;
            const isActive = idx === activeIndex;

            return (
              <button
                key={stage.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectStage(stage.id)}
                className={`relative group flex items-center justify-center px-4 py-2 text-[11px] font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap
                  ${isActive
                    ? "text-white shadow-sm"
                    : isCompleted
                      ? "bg-[#eaf3f8] dark:bg-[#1a2e3f] text-[#31719B] dark:text-[#7bbde8] hover:bg-[#d8eaf4]"
                      : "bg-white dark:bg-[#1e293b] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#28384f] border border-[#e2e8f0] dark:border-[#334155]"
                  }
                `}
                style={{
                  clipPath:
                    idx === 0
                      ? "polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)"
                      : "polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)",
                  backgroundColor: isActive ? "var(--premium-blue-dark)" : undefined,
                  paddingLeft: idx === 0 ? "14px" : "20px",
                  paddingRight: "18px",
                }}
              >
                <div className="flex items-center gap-1.5">
                  {isCompleted && <Check className="w-3 h-3 text-[#31719B] dark:text-[#7bbde8]" />}
                  <span>{stage.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);

PipelineChevronBar.displayName = "PipelineChevronBar";
