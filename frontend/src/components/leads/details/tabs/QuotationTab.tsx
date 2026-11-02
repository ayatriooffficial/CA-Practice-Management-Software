"use client";

import React, { memo, useState, useMemo } from "react";
import { Plus, Search, FileText, Eye, Trash2 } from "lucide-react";
import { Lead } from "@/data/crmData";
import { useQuotations, useDeleteQuotation } from "@/hooks/useQuotationsQuery";
import { Quotation } from "@/services/quotationApi";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DropdownActionItem } from "@/components/ui/TableActionDropdown";

interface QuotationTabProps {
  lead: Lead;
  onOpenAddQuotation: () => void;
  onViewQuotation: (quotation: Quotation) => void;
}

export const QuotationTab = memo(
  ({ lead, onOpenAddQuotation, onViewQuotation }: QuotationTabProps) => {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

    const handleDelete = (id: string, quotationNo: string) => {
      setDeleteTarget({ id, quotationNo });
    };

    const columns = useMemo<DataTableColumn<Quotation>[]>(
      () => [
        {
          id: "quotationNo",
          header: "ID",
          width: 130,
          sortable: true,
          cell: (quotation) => (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onViewQuotation(quotation);
              }}
              className="font-semibold text-[#31719B] dark:text-[#60a5fa] hover:underline cursor-pointer whitespace-nowrap"
            >
              {quotation.quotationNo}
            </span>
          ),
        },
        {
          id: "billingOrg",
          header: "Billing Org",
          minWidth: 180,
          sortable: true,
          cell: (quotation) => (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-[#31719B] font-bold text-[10px] flex items-center justify-center shrink-0">
                {quotation.billingOrg?.name?.slice(0, 2).toUpperCase() || "TA"}
              </div>
              <span className="truncate max-w-[150px] text-gray-700 dark:text-gray-300">
                {quotation.billingOrg?.name || "CA Associates Demo"}
              </span>
            </div>
          ),
        },
        {
          id: "service",
          header: "Service",
          minWidth: 180,
          sortable: true,
          cell: (quotation) => {
            const primaryService = quotation.items?.[0]?.serviceName || "Consultancy Services";
            return (
              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[180px] block">
                {primaryService}
              </span>
            );
          },
        },
        {
          id: "quotationDate",
          header: "Quotation Date",
          width: 130,
          sortable: true,
          cell: (quotation) => (
            <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {quotation.quotationDate ? new Date(quotation.quotationDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }) : "—"}
            </span>
          ),
        },
        {
          id: "dueDate",
          header: "Due Date",
          width: 130,
          sortable: true,
          cell: (quotation) => (
            <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {quotation.dueDate ? new Date(quotation.dueDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }) : "—"}
            </span>
          ),
        },
        {
          id: "totalAmount",
          header: "Total Amount",
          width: 130,
          align: "right",
          sortable: true,
          cell: (quotation) => {
            const formattedTotal = new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
            }).format(quotation.totalAmount || 0);
            return (
              <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                {formattedTotal}
              </span>
            );
          },
        },
        {
          id: "status",
          header: "Status",
          width: 110,
          align: "center",
          sortable: true,
          cell: (quotation) => (
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
          ),
        },
      ],
      [onViewQuotation]
    );

    const getRowActions = (quotation: Quotation): DropdownActionItem[] => [
      {
        label: "View Quotation",
        icon: Eye,
        onClick: () => onViewQuotation(quotation),
      },
      {
        label: "Delete Quotation",
        icon: Trash2,
        variant: "danger",
        onClick: () => handleDelete(quotation.id || (quotation as any)._id, quotation.quotationNo),
      },
    ];

    return (
      <div className="w-full space-y-4">
        {/* Tab Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-[#e2e8f0] dark:border-[#334155]">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Quotations ({pagination?.totalDocs ?? quotations.length})
          </h2>

          <div className="flex items-center gap-3">
            {/* Search Input using reusable Input */}
            <div className="w-56 md:w-64">
              <Input
                size="sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                leftIcon={<Search className="w-3.5 h-3.5 text-gray-400" />}
                onClear={() => setSearch("")}
              />
            </div>

            {/* Add Quotation Button using reusable Button */}
            <Button
              size="sm"
              variant="primary"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={onOpenAddQuotation}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Reusable DataTable */}
        <DataTable<Quotation>
          columns={columns}
          data={quotations}
          selectable={true}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          actions={getRowActions}
          loading={isLoading}
          getRowId={(q) => q.id || (q as any)._id}
          onRowClick={(q) => onViewQuotation(q)}
          emptyMessage={`No quotations found. Click "+ Add" to draft a new quotation for ${lead.fullName}.`}
          emptyIcon={<FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />}
          pagination={{
            currentPage: page,
            pageSize: 10,
            totalItems: pagination?.totalDocs ?? quotations.length,
            onPageChange: (p) => setPage(p),
          }}
        />

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
