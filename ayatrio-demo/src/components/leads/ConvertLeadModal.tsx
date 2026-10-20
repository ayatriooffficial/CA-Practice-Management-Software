"use client";

import React, { useState } from "react";
import { X, UserCheck, ArrowRight, Loader2 } from "lucide-react";
import { Lead, CLIENT_TYPES, CLIENT_GROUPS, RECURRING_SERVICES } from "@/data/crmData";
import { Select } from "@/components/ui/Select";

interface ConvertLeadModalProps {
  lead: Lead;
  onConvert: (config: {
    type: string;
    group: string;
    fileNo?: string;
    services?: string[];
  }) => Promise<void>;
  onClose: () => void;
}

export const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
  lead,
  onConvert,
  onClose,
}) => {
  const [clientType, setClientType] = useState("llp");
  const [clientGroup, setClientGroup] = useState("Accounting");
  const [fileNo, setFileNo] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>(["gst-monthly"]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConvert({
        type: clientType,
        group: clientGroup,
        fileNo: fileNo.trim() || undefined,
        services: selectedServices,
      });
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  const toggleService = (srvId: string) => {
    setSelectedServices((prev) =>
      prev.includes(srvId) ? prev.filter((s) => s !== srvId) : [...prev, srvId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Convert Lead to Active Client
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create a permanent client folder for &ldquo;{lead.fullName}&rdquo;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5">
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#0f172a] border border-gray-200/60 dark:border-gray-700/60 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-400">Primary Mobile:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{lead.mobile}</span>
            </div>
            {lead.email && (
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{lead.email}</span>
              </div>
            )}
            {lead.pan && (
              <div className="flex justify-between">
                <span className="text-gray-400">PAN Number:</span>
                <span className="font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
                  {lead.pan}
                </span>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="convert-client-type"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 cursor-pointer"
            >
              Constitution Type <span className="text-red-500">*</span>
            </label>
            <Select
              id="convert-client-type"
              aria-label="Constitution Type"
              value={clientType}
              onChange={setClientType}
              options={CLIENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
          </div>

          <div>
            <label
              htmlFor="convert-client-group"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 cursor-pointer"
            >
              Practice / Client Group <span className="text-red-500">*</span>
            </label>
            <Select
              id="convert-client-group"
              aria-label="Practice Client Group"
              value={clientGroup}
              onChange={setClientGroup}
              options={CLIENT_GROUPS.map((g) => ({ value: g, label: g }))}
            />
          </div>

          <div>
            <label
              htmlFor="convert-file-no"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 cursor-pointer"
            >
              File Number (Optional)
            </label>
            <input
              id="convert-file-no"
              name="fileNo"
              aria-label="File Number (Optional)"
              type="text"
              value={fileNo}
              onChange={(e) => setFileNo(e.target.value)}
              placeholder="e.g. CL-2026-0001 (auto-generated if left blank)"
              className="w-full h-10 px-3 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Assign Recurring Services
            </span>
            <div className="grid grid-cols-2 gap-2">
              {RECURRING_SERVICES.slice(0, 6).map((srv) => {
                const isChecked = selectedServices.includes(srv.id);
                return (
                  <button
                    type="button"
                    key={srv.id}
                    onClick={() => toggleService(srv.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      isChecked
                        ? "border-[#31719B] bg-[#31719B]/10 text-[#31719B] font-semibold"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={`convert-srv-${srv.id}`}
                      name={`service-${srv.id}`}
                      aria-label={`Assign ${srv.name}`}
                      checked={isChecked}
                      readOnly
                      className="accent-[#31719B]"
                    />
                    <span className="truncate">{srv.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <span>Create Client Folder</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
