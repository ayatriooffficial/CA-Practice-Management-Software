"use client";

import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { Lead } from "@/data/crmData";
import { useUpdateLead } from "@/hooks/useLeadsQuery";

interface EditDealModalProps {
  lead: Lead;
  onClose: () => void;
}

export const EditDealModal: React.FC<EditDealModalProps> = ({ lead, onClose }) => {
  const [dealValue, setDealValue] = useState<number>(lead.dealValue || 0);
  const updateMutation = useUpdateLead();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        id: lead.id,
        data: { dealValue: Number(dealValue) || 0 },
      });
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to update deal value");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Edit Deal Value</h2>
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
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Estimated Deal Value (₹ INR)
            </label>
            <input
              type="number"
              min="0"
              step="500"
              value={dealValue}
              onChange={(e) => setDealValue(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white font-bold text-sm focus:outline-none focus:border-[#31719B]"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white font-semibold shadow-sm cursor-pointer"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Check className="w-4 h-4" />
              <span>Save Deal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
