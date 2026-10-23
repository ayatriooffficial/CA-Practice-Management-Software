"use client";

import React, { memo } from "react";
import { ChevronRight, AlertCircle, Sparkles } from "lucide-react";
import { LeadScore } from "@/data/crmData";

interface LeadScoreCardProps {
  score?: LeadScore | null;
  pipelineStage?: string;
  daysInStage?: number;
  followUpsCount?: number;
  overdueCount?: number;
  onEditScore?: () => void;
}

export const LeadScoreCard = memo(
  ({
    score,
    pipelineStage,
    daysInStage = 0,
    followUpsCount = 0,
    overdueCount = 0,
    onEditScore,
  }: LeadScoreCardProps) => {
    const hasValidScore =
      score !== undefined &&
      score !== null &&
      typeof score.score === "number" &&
      score.score > 0;

    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = hasValidScore
      ? circumference - ((score!.score || 0) / 100) * circumference
      : circumference;

    const isNewLead =
      !pipelineStage ||
      pipelineStage.toLowerCase() === "new_lead" ||
      pipelineStage.toLowerCase() === "new";

    // Breakdown bars - only items that actually exist
    const hasAnyBreakdown =
      score &&
      (score.businessSize != null ||
        score.responseTime != null ||
        score.engagement != null ||
        score.sourceQuality != null);

    return (
      <div className="bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-4 flex flex-col space-y-4 shadow-sm">
        {/* Circular Progress & Label */}
        <div className="flex items-center gap-4">
          <div className="relative w-18 h-18 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 70 70">
              <circle
                cx="35"
                cy="35"
                r={radius}
                className="stroke-gray-100 dark:stroke-gray-800"
                strokeWidth="6"
                fill="transparent"
              />
              {hasValidScore && (
                <circle
                  cx="35"
                  cy="35"
                  r={radius}
                  stroke="currentColor"
                  className="text-emerald-500 transition-all duration-700 ease-out"
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              )}
            </svg>
            <span
              className={`absolute text-base font-bold ${hasValidScore
                ? "text-xl text-gray-800 dark:text-white"
                : "text-xs font-semibold text-gray-400 dark:text-gray-500"
                }`}
            >
              {hasValidScore ? score!.score : "New"}
            </span>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
              LEAD SCORE
            </div>
            <div
              className={`text-xs font-semibold mt-0.5 ${hasValidScore
                ? (score!.score || 0) >= 75
                  ? "text-emerald-600 dark:text-emerald-400"
                  : (score!.score || 0) >= 50
                    ? "text-[#31719B] dark:text-[#60a5fa]"
                    : "text-amber-600 dark:text-amber-400"
                : "text-gray-700 dark:text-gray-300 font-medium"
                }`}
            >
              {hasValidScore
                ? (score!.score || 0) >= 75
                  ? "High Probability"
                  : (score!.score || 0) >= 50
                    ? "Medium Probability"
                    : "Low Probability"
                : "New lead need to followup"}
            </div>
          </div>
        </div>

        {/* Breakdown Progress Bars - Only show if real data is present */}
        {hasAnyBreakdown ? (
          <div className="space-y-2.5 text-xs">
            {score!.businessSize != null && (
              <div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300 font-medium mb-1">
                  <span>Business Size</span>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {score!.businessSize}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, score!.businessSize)}%` }}
                  />
                </div>
              </div>
            )}

            {score!.responseTime != null && (
              <div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300 font-medium mb-1">
                  <span>Response Time</span>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {score!.responseTime}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, score!.responseTime)}%` }}
                  />
                </div>
              </div>
            )}

            {score!.engagement != null && (
              <div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300 font-medium mb-1">
                  <span>Engagement</span>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {score!.engagement}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, score!.engagement)}%` }}
                  />
                </div>
              </div>
            )}

            {score!.sourceQuality != null && (
              <div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300 font-medium mb-1">
                  <span>Source Quality</span>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {score!.sourceQuality}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, score!.sourceQuality)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-gray-50/70 dark:bg-gray-800/40 rounded-lg border border-gray-100 dark:border-gray-700/60 text-xs text-gray-500 dark:text-gray-400">
            <p className="leading-relaxed">
              New lead need to followup. Lead score will be evaluated based on response and follow-ups.
            </p>
          </div>
        )}

        {/* Edit Score Link */}
        <button
          type="button"
          onClick={onEditScore}
          className="flex items-center text-xs font-semibold text-[#31719B] dark:text-[#60a5fa] hover:underline pt-0.5 cursor-pointer"
        >
          <span>{hasValidScore ? "Edit score" : "Evaluate score"}</span>
          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </button>

        {/* Metric Badges Grid - Real Data */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#f1f5f9] dark:border-[#334155]">
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#eaf3f8] dark:bg-[#1a2e3f] text-center">
            <span className="text-base font-bold text-[#31719B] dark:text-[#7bbde8]">
              {daysInStage}
            </span>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-tight">
              days in stage
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-center">
            <span className="text-base font-bold text-orange-600 dark:text-orange-400">
              {followUpsCount}
            </span>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-tight">
              follow-ups
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-center">
            <span className="text-base font-bold text-rose-600 dark:text-rose-400">
              {overdueCount}
            </span>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-tight">
              overdue
            </span>
          </div>
        </div>
      </div>
    );
  }
);

LeadScoreCard.displayName = "LeadScoreCard";
