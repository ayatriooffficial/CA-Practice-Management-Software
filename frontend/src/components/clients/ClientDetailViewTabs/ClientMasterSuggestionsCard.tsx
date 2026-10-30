"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Check,
  X,
  Users,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  Tag,
} from "lucide-react";
import { gstFormApi } from "@/services/gstFormApi";

interface SuggestionItem {
  _id: string;
  client_id: string;
  type?: "RECIPIENT" | "ITEM";
  kind?: "RECIPIENT" | "ITEM";
  data?: {
    gstin?: string;
    tradeName?: string;
    legalName?: string;
    state?: string;
    pos?: string;
    name?: string;
    hsn?: string;
    uqc?: string;
    defaultRate?: number;
  };
  payload?: {
    gstin?: string;
    tradeName?: string;
    legalName?: string;
    state?: string;
    pos?: string;
    name?: string;
    hsn?: string;
    uqc?: string;
    defaultRate?: number;
  };
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  reviewed_at?: string;
}

interface ClientMasterSuggestionsCardProps {
  clientId?: string;
}

export const ClientMasterSuggestionsCard: React.FC<ClientMasterSuggestionsCardProps> = ({ clientId }) => {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "RECIPIENT" | "ITEM">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const data = await gstFormApi.getMasterSuggestions(clientId);
      const normalized = (Array.isArray(data) ? data : []).map((item: any) => ({
        ...item,
        type: item.type || item.kind || "ITEM",
        data: item.data || item.payload || {},
      }));
      setSuggestions(normalized);
    } catch (err) {
      console.error("Failed to load master suggestions:", err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleUpdateStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    setProcessingId(id);
    try {
      await gstFormApi.updateSuggestionStatus(id, status);
      setSuggestions((prev) =>
        (prev || []).map((s) => (s._id === id ? { ...s, status, reviewed_at: new Date().toISOString() } : s))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update suggestion status");
    } finally {
      setProcessingId(null);
    }
  };

  if (!clientId) return null;

  const filteredSuggestions = (suggestions || []).filter((s) => {
    const itemType = s.type || s.kind;
    if (filterType !== "ALL" && itemType !== filterType) return false;
    if (filterStatus !== "ALL" && s.status !== filterStatus) return false;
    return true;
  });

  const pendingCount = (suggestions || []).filter((s) => s.status === "PENDING").length;

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 shadow-card space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#31719B]" />
              Client Master Suggestions
            </h3>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            New recipients and items captured during client form submissions. Approved entries become instantly searchable in the client&apos;s return autocomplete book.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSuggestions}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filterType === "ALL"
                ? "bg-[#31719B] text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            All Types
          </button>
          <button
            type="button"
            onClick={() => setFilterType("RECIPIENT")}
            className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1 transition-all ${
              filterType === "RECIPIENT"
                ? "bg-[#31719B] text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Users className="w-3 h-3" />
            Recipients ({(suggestions || []).filter((s) => s.type === "RECIPIENT").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("ITEM")}
            className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1 transition-all ${
              filterType === "ITEM"
                ? "bg-[#31719B] text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Package className="w-3 h-3" />
            Items & HSN ({(suggestions || []).filter((s) => s.type === "ITEM").length})
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterStatus("PENDING")}
            className={`px-2.5 py-1 rounded-lg font-medium ${
              filterStatus === "PENDING"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("APPROVED")}
            className={`px-2.5 py-1 rounded-lg font-medium ${
              filterStatus === "APPROVED"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Approved
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("ALL")}
            className={`px-2.5 py-1 rounded-lg font-medium ${
              filterStatus === "ALL"
                ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            All Status
          </button>
        </div>
      </div>

      {/* Suggestions List */}
      {filteredSuggestions.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            No {filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""} suggestions found
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            When clients fill forms with new GSTINs or product lines, they will appear here for one-click verification.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#dde2e8] dark:border-[#334155]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] dark:bg-[#0f172a] text-gray-500 dark:text-gray-400 border-b border-[#dde2e8] dark:border-[#334155]">
              <tr>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Details / Identity</th>
                <th className="py-2.5 px-3">Codes & Specs</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
              {filteredSuggestions.map((s) => {
                const isRecipient = (s.type || s.kind) === "RECIPIENT";
                const isPending = s.status === "PENDING";
                const isApproved = s.status === "APPROVED";
                const isProcessing = processingId === s._id;
                const d = s.data || s.payload || {};

                return (
                  <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isRecipient
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        {isRecipient ? <Users className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                        {isRecipient ? "Recipient" : "Item/HSN"}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      {isRecipient ? (
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white font-mono text-[11px]">
                            {d.gstin || "N/A"}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            {d.tradeName || d.legalName || "Unnamed Entity"}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {d.name || "Item"}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            Captured from invoice line
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {isRecipient ? (
                        <div className="text-[11px] text-gray-600 dark:text-gray-300">
                          <span>POS: </span>
                          <span className="font-semibold font-mono">{d.pos || d.state || "—"}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] space-x-2 text-gray-600 dark:text-gray-300">
                          <span>
                            HSN: <strong className="font-mono">{d.hsn || "—"}</strong>
                          </span>
                          <span>
                            UQC: <strong className="font-mono">{d.uqc || "OTH"}</strong>
                          </span>
                          {d.defaultRate !== undefined && (
                            <span>
                              Rate: <strong>{d.defaultRate}%</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPending
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : isApproved
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        {isPending && <Clock className="w-2.5 h-2.5" />}
                        {isApproved && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {s.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(s._id, "APPROVED")}
                            disabled={isProcessing}
                            title="Approve & add to client master"
                            className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1 text-[11px] shadow-xs disabled:opacity-50"
                          >
                            <Check className="w-3 h-3" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(s._id, "REJECTED")}
                            disabled={isProcessing}
                            title="Reject suggestion"
                            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[11px] disabled:opacity-50"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400">
                          {s.reviewed_at ? new Date(s.reviewed_at).toLocaleDateString("en-IN") : "Reviewed"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

