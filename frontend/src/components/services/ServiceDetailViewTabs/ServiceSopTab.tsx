"use client";

import React from "react";
import { Check, Loader2 } from "lucide-react";

interface ServiceSopTabProps {
  sopContent: string;
  setSopContent: (val: string) => void;
  handleSaveSop: () => Promise<void>;
  isSavingSop: boolean;
}

export const ServiceSopTab: React.FC<ServiceSopTabProps> = ({
  sopContent,
  setSopContent,
  handleSaveSop,
  isSavingSop,
}) => {
  return (
    <div className="gap-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-main)]">
            Standard Operating Procedure (SOP)
          </h3>
          <p className="text-xs text-[var(--text-subtle)] mt-0.5">
            Assigned team members will see this SOP directly in the task workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSop}
          disabled={isSavingSop}
          style={{ backgroundColor: "var(--primary)" }}
          className="h-8 px-4 text-xs font-semibold text-white rounded-lg flex items-center gap-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
        >
          {isSavingSop ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Save SOP</span>
        </button>
      </div>

      <textarea
        rows={12}
        value={sopContent}
        onChange={(e) => setSopContent(e.target.value)}
        className="w-full p-4 text-xs font-mono bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] leading-relaxed mt-3"
      />
    </div>
  );
};
