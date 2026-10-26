"use client";

import React, { memo, useState, useMemo } from "react";
import { Plus, Search, FileText, ChevronLeft, ChevronRight, Eye, Trash2 } from "lucide-react";
import { Lead } from "@/data/crmData";
import { useQuotations, useDeleteQuotation } from "@/hooks/useQuotationsQuery";
import { Quotation } from "@/services/quotationApi";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";

interface QuotationTabProps {
  lead: Lead;
  onOpenAddQuotation: () => void;
  onViewQuotation: (quotation: Quotation) => void;
}

export const QuotationTab = memo(
  ({ lead, onOpenAddQuotation, onViewQuotation }: QuotationTabProps) => {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; quotationNo: string } | null>(null);

    const { data, isLoading } = useQuotations({
      leadId: lead.id,
      search: search.trim() || undefined,
      page,
      limit: 10,
    });

    const deleteMutation = useDeleteQuotation();
    const quotations = data?.quotations || [];
    const pagination = data?.pagination;

    const toggleSelect = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    const toggleSelectAll = () => {
      if (quotations.every((q) => selectedIds.has(q.id))) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(quotations.map((q) => q.id)));
      }
    };

    const handleDelete = (id: string, quotationNo: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeleteTarget({ id, quotationNo });
    };

    return (
      <div className="w-full space-y-4">
        {/* Tab Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-[#e2e8f0] dark:border-[#334155]">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Quotations ({pagination?.totalDocs ?? quotations.length})
          </h2>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px] md:min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-8.5 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] pl-8.5 pr-3 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
              />
            </div>

            {/* Add Quotation Button */}
            <button
              type="button"
              onClick={onOpenAddQuotation}
              className="flex items-center gap-1.5 h-8.5 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Quotations Table */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] overflow-hidden shadow-sm">
          <div className="overflow-x-auto scrollbar-slim">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-b border-[#e2e8f0] dark:border-[#334155] font-semibold">
                  <th scope="col" className="w-10 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={quotations.length > 0 && quotations.every((q) => selectedIds.has(q.id))}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3">ID</th>
                  <th scope="col" className="px-4 py-3">Billing Org</th>
                  <th scope="col" className="px-4 py-3">Service</th>
                  <th scope="col" className="px-4 py-3">Quotation Date</th>
                  <th scope="col" className="px-4 py-3">Due Date</th>
                  <th scope="col" className="px-4 py-3 text-right">Total Amount</th>
                  <th scope="col" className="px-4 py-3 text-center">Status</th>
                  <th scope="col" className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                {isLoading && quotations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-gray-400">
                      Loading quotations...
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                        <span className="font-medium text-gray-600 dark:text-gray-300">
                          No quotations found
                        </span>
                        <p className="text-gray-400 text-[11px]">
                          Click "+ Add" to draft a new quotation for {lead.fullName}.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  quotations.map((quotation) => {
                    const qId = quotation.id || (quotation as any)._id;
                    const isSelected = selectedIds.has(qId);
                    const primaryService =
                      quotation.items?.[0]?.serviceName || "Consultancy Services";
                    const formattedTotal = new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                    }).format(quotation.totalAmount || 0);

                    return (
                      <tr
                        key={qId}
                        onClick={() => onViewQuotation(quotation)}
                        className={`group transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#eaf3f8] dark:bg-[#1a2e3f]"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="w-10 px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelect(qId, e as any)}
                            className="w-3.5 h-3.5 rounded text-[#31719B] accent-[#31719B] cursor-pointer"
                          />
                        </td>

                        {/* ID */}
                        <td className="px-4 py-3 font-semibold text-[#31719B] dark:text-[#60a5fa] hover:underline whitespace-nowrap">
                          {quotation.quotationNo}
                        </td>

                        {/* Billing Org */}
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-[#31719B] font-bold text-[10px] flex items-center justify-center shrink-0">
                              {quotation.billingOrg?.name?.slice(0, 2).toUpperCase() || "TA"}
                            </div>
                            <span className="truncate max-w-[150px]">
                              {quotation.billingOrg?.name || "Turia Associates Dem"}
                            </span>
                          </div>
                        </td>

                        {/* Service */}
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {primaryService.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[180px]">
                              {primaryService}
                              {quotation.items?.length > 1 && ` (+${quotation.items.length - 1})`}
                            </span>
                          </div>
                        </td>

                        {/* Quotation Date */}
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {quotation.quotationDate}
                        </td>

                        {/* Due Date */}
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {quotation.dueDate}
                        </td>

                        {/* Total Amount */}
                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                          {formattedTotal}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              quotation.status === "Accepted"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200"
                                : quotation.status === "Rejected"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200"
                            }`}
                          >
                            {quotation.status || "Pending"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onViewQuotation(quotation)}
                              title="View Quotation"
                              className="p-1 rounded text-gray-400 hover:text-[#31719B] hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(qId, quotation.quotationNo, e)}
                              title="Delete Quotation"
                              className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#e2e8f0] dark:border-[#334155] bg-gray-50/50 dark:bg-gray-800/40 text-xs text-gray-500">
            <span>
              {quotations.length > 0
                ? `${(page - 1) * 10 + 1}-${Math.min(
                    page * 10,
                    pagination?.totalDocs || quotations.length
                  )} of ${pagination?.totalDocs || quotations.length}`
                : "0-0 of 0"}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-700 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={page >= (pagination?.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-700 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <DiscardConfirmationModal
          isOpen={Boolean(deleteTarget)}
          title="Delete Quotation?"
          message={`Are you sure you want to delete quotation ${deleteTarget?.quotationNo || ""}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
          onConfirm={async () => {
            if (deleteTarget) {
              await deleteMutation.mutateAsync(deleteTarget.id);
              setDeleteTarget(null);
            }
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    );
  }
);

QuotationTab.displayName = "QuotationTab";
