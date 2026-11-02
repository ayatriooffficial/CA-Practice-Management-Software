"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Check,
  X,
  Users,
  Package,
  RefreshCw,
  Clock,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { DropdownActionItem } from "@/components/ui/TableActionDropdown";

interface ClientMasterSuggestionsCardProps {
  clientId: string;
  clientName?: string;
  onItemApproved?: () => void;
}

export const ClientMasterSuggestionsCard: React.FC<ClientMasterSuggestionsCardProps> = ({
  clientId,
  clientName,
  onItemApproved,
}) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "RECIPIENT" | "ITEM">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED">("PENDING");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchSuggestions = async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/client-master-suggestions?clientId=${clientId}`);
      if (res.ok) {
        const json = await res.json();
        setSuggestions(json.data || json || []);
      }
    } catch (e) {
      console.error("Failed to load client master suggestions:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [clientId]);

  const handleUpdateStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/client-master-suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSuggestions((prev) =>
          prev.map((s) => (s._id === id ? { ...s, status, reviewed_at: new Date().toISOString() } : s))
        );
        if (status === "APPROVED" && onItemApproved) {
          onItemApproved();
        }
      }
    } catch (e) {
      console.error("Failed to update suggestion status:", e);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredSuggestions = useMemo(() => {
    return (suggestions || []).filter((s) => {
      const kind = s.type || s.kind;
      if (filterType !== "ALL" && kind !== filterType) return false;
      if (filterStatus !== "ALL" && s.status !== filterStatus) return false;
      return true;
    });
  }, [suggestions, filterType, filterStatus]);

  const paginatedSuggestions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSuggestions.slice(start, start + pageSize);
  }, [filteredSuggestions, page, pageSize]);

  const pendingCount = (suggestions || []).filter((s) => s.status === "PENDING").length;

  const columns = useMemo<DataTableColumn<any>[]>(
    () => [
      {
        id: "type",
        header: "Type",
        width: 140,
        sortable: true,
        cell: (s) => {
          const isRecipient = (s.type || s.kind) === "RECIPIENT";
          return (
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
          );
        },
      },
      {
        id: "details",
        header: "Details / Identity",
        minWidth: 200,
        sortable: true,
        cell: (s) => {
          const isRecipient = (s.type || s.kind) === "RECIPIENT";
          const d = s.data || s.payload || {};
          return isRecipient ? (
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
              <div className="text-[11px] text-gray-400">Captured from invoice line</div>
            </div>
          );
        },
      },
      {
        id: "codes",
        header: "Codes & Specs",
        width: 190,
        sortable: true,
        cell: (s) => {
          const isRecipient = (s.type || s.kind) === "RECIPIENT";
          const d = s.data || s.payload || {};
          return isRecipient ? (
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
          );
        },
      },
      {
        id: "status",
        header: "Status",
        width: 130,
        sortable: true,
        align: "center",
        cell: (s) => {
          const isPending = s.status === "PENDING";
          const isApproved = s.status === "APPROVED";
          return (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
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
          );
        },
      },
    ],
    []
  );

  const getSuggestionActions = (s: any): DropdownActionItem[] => {
    const isPending = s.status === "PENDING";
    const actions: DropdownActionItem[] = [];

    if (isPending) {
      actions.push({
        label: "Approve to Client Master",
        icon: ThumbsUp,
        onClick: () => handleUpdateStatus(s._id, "APPROVED"),
      });
      actions.push({
        label: "Reject Suggestion",
        icon: ThumbsDown,
        variant: "danger",
        onClick: () => handleUpdateStatus(s._id, "REJECTED"),
      });
    }

    return actions;
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-none border-0 shadow-none p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
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
            New recipients and items captured during client form submissions. Approved entries become instantly searchable in autocomplete.
          </p>
        </div>

        {/* Refresh Button */}
        <Button
          size="sm"
          variant="outline"
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
          onClick={fetchSuggestions}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setFilterType("ALL");
              setPage(1);
            }}
            className={`px-3 py-1 rounded-xs font-medium cursor-pointer transition-all ${
              filterType === "ALL"
                ? "bg-[#31719B] text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            All Types
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterType("RECIPIENT");
              setPage(1);
            }}
            className={`px-3 py-1 rounded-xs font-medium flex items-center gap-1 cursor-pointer transition-all ${
              filterType === "RECIPIENT"
                ? "bg-[#31719B] text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Users className="w-3 h-3" />
            Recipients ({(suggestions || []).filter((s) => (s.type || s.kind) === "RECIPIENT").length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterType("ITEM");
              setPage(1);
            }}
            className={`px-3 py-1 rounded-xs font-medium flex items-center gap-1 cursor-pointer transition-all ${
              filterType === "ITEM"
                ? "bg-[#31719B] text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Package className="w-3 h-3" />
            Items & HSN ({(suggestions || []).filter((s) => (s.type || s.kind) === "ITEM").length})
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setFilterStatus("PENDING");
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-xs font-medium cursor-pointer ${
              filterStatus === "PENDING"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterStatus("APPROVED");
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-xs font-medium cursor-pointer ${
              filterStatus === "APPROVED"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Approved
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterStatus("ALL");
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-xs font-medium cursor-pointer ${
              filterStatus === "ALL"
                ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            All Status
          </button>
        </div>
      </div>

      {/* Reusable DataTable */}
      <DataTable<any>
        columns={columns}
        data={paginatedSuggestions}
        actions={getSuggestionActions}
        loading={isLoading}
        getRowId={(s) => s._id || s.id}
        emptyMessage={`No ${filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""} suggestions found.`}
        emptyIcon={<Sparkles className="w-8 h-8 text-gray-300 dark:text-gray-600" />}
        pagination={{
          currentPage: page,
          pageSize,
          totalItems: filteredSuggestions.length,
          onPageChange: setPage,
          rowsPerPageOptions: [10, 25, 50],
          onRowsPerPageChange: (s) => {
            setPageSize(s);
            setPage(1);
          },
        }}
      />
    </div>
  );
};
