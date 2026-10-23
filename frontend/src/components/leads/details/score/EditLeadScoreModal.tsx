"use client";

import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { Lead, LeadScore } from "@/data/crmData";
import { useUpdateLead } from "@/hooks/useLeadsQuery";

interface EditLeadScoreModalProps {
  lead: Lead;
  onClose: () => void;
}

export const EditLeadScoreModal: React.FC<EditLeadScoreModalProps> = ({ lead, onClose }) => {
  const updateMutation = useUpdateLead();

  const current = lead.leadScore || {
    score: 50,
    businessSize: 50,
    responseTime: 50,
    engagement: 50,
    sourceQuality: 50,
  };

  const [businessSize, setBusinessSize] = useState(current.businessSize);
  const [responseTime, setResponseTime] = useState(current.responseTime);
  const [engagement, setEngagement] = useState(current.engagement);
  const [sourceQuality, setSourceQuality] = useState(current.sourceQuality);

  // Compute weighted or average score
  const computedScore = Math.round(
    (businessSize * 0.35 + responseTime * 0.25 + engagement * 0.2 + sourceQuality * 0.2)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        id: lead.id,
        data: {
          leadScore: {
            score: computedScore,
            businessSize,
            responseTime,
            engagement,
            sourceQuality,
          },
        },
      });
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to update lead score");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Edit Lead Score</h2>
            <p className="text-xs text-gray-400">Calculated: {computedScore} / 100</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-black dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <div className="flex justify-between font-semibold text-gray-700 dark:text-gray-300 mb-1">
              <span>Business Size</span>
              <span>{businessSize}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={businessSize}
              onChange={(e) => setBusinessSize(Number(e.target.value))}
              className="w-full accent-[#31719B] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between font-semibold text-gray-700 dark:text-gray-300 mb-1">
              <span>Response Time</span>
              <span>{responseTime}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={responseTime}
              onChange={(e) => setResponseTime(Number(e.target.value))}
              className="w-full accent-[#31719B] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between font-semibold text-gray-700 dark:text-gray-300 mb-1">
              <span>Engagement</span>
              <span>{engagement}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={engagement}
              onChange={(e) => setEngagement(Number(e.target.value))}
              className="w-full accent-[#31719B] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between font-semibold text-gray-700 dark:text-gray-300 mb-1">
              <span>Source Quality</span>
              <span>{sourceQuality}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sourceQuality}
              onChange={(e) => setSourceQuality(Number(e.target.value))}
              className="w-full accent-[#31719B] cursor-pointer"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white font-semibold shadow-sm"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Check className="w-4 h-4" />
              <span>Save Score</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
