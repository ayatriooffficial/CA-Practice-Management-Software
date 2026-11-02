"use client";

import React, { useState, useMemo } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { ClientDsc } from "@/data/crmData";
import { getAvatarBadge } from "./utils";
import { usePermission } from "../../team/usePermission";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DropdownActionItem } from "@/components/ui/TableActionDropdown";

export interface ClientDscTabProps {
  dscs: ClientDsc[];
  setIsAddDscOpen: (open: boolean) => void;
  handleDeleteDsc: (dscId: string, name: string) => Promise<void>;
}

export const ClientDscTab: React.FC<ClientDscTabProps> = ({
  dscs,
  setIsAddDscOpen,
  handleDeleteDsc,
}) => {
  const { canDelete } = usePermission();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Expired">("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredDscs = useMemo(() => {
    return dscs.filter((dsc) => {
      if (statusFilter !== "All" && dsc.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          dsc.name.toLowerCase().includes(q) ||
          (dsc.dscId && dsc.dscId.toLowerCase().includes(q)) ||
          (dsc.vendor && dsc.vendor.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [dscs, search, statusFilter]);

  const paginatedDscs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDscs.slice(start, start + pageSize);
  }, [filteredDscs, page, pageSize]);

  const columns = useMemo<DataTableColumn<ClientDsc>[]>(
    () => [
      {
        id: "dscId",
        header: "DSC ID",
        width: 130,
        sortable: true,
        cell: (dsc, idx) => (
          <span className="font-mono text-gray-700 dark:text-gray-300 font-medium">
            {dsc.dscId || `#S${idx + 100}`}
          </span>
        ),
      },
      {
        id: "name",
        header: "Name",
        width: 200,
        sortable: true,
        cell: (dsc, idx) => (
          <div className="flex items-center gap-2.5 font-medium text-gray-900 dark:text-white">
            {getAvatarBadge(dsc.name, idx)}
            <span className="truncate">{dsc.name}</span>
          </div>
        ),
      },
      {
        id: "issuedDate",
        header: "Issued Date",
        width: 120,
        sortable: true,
        cell: (dsc) => (
          <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
            {dsc.issuedDate || "-"}
          </span>
        ),
      },
      {
        id: "expiryDate",
        header: "Expiry Date",
        width: 120,
        sortable: true,
        cell: (dsc) => (
          <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
            {dsc.expiryDate || "-"}
          </span>
        ),
      },
      {
        id: "binNumber",
        header: "Bin Number",
        width: 120,
        sortable: true,
        cell: (dsc) => (
          <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
            {dsc.binNumber || "-"}
          </span>
        ),
      },
      {
        id: "vendor",
        header: "Vendor",
        width: 130,
        sortable: true,
        cell: (dsc) => (
          <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
            {dsc.vendor || "-"}
          </span>
        ),
      },
      {
        id: "class",
        header: "Class",
        width: 100,
        sortable: true,
        cell: (dsc) => (
          <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
            {dsc.class || "-"}
          </span>
        ),
      },
      {
        id: "location",
        header: "Location",
        width: 130,
        sortable: true,
        cell: (dsc) => (
          <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
            {dsc.location || "-"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        width: 110,
        sortable: true,
        align: "center",
        cell: (dsc) => (
          <span
            className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
              dsc.status === "Active"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
            }`}
          >
            {dsc.status || "Active"}
          </span>
        ),
      },
      {
        id: "remarks",
        header: "Remarks",
        minWidth: 160,
        cell: (dsc) => (
          <span className="text-gray-600 dark:text-gray-300 truncate max-w-xs block">
            {dsc.remarks || "-"}
          </span>
        ),
      },
    ],
    []
  );

  const getDscActions = (dsc: ClientDsc): DropdownActionItem[] => {
    if (!canDelete("digital_signature")) return [];
    return [
      {
        label: "Delete DSC",
        icon: Trash2,
        variant: "danger",
        onClick: () => handleDeleteDsc(dsc.dscId || dsc.id || "", dsc.name),
      },
    ];
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-none border-0 shadow-none overflow-hidden space-y-3">
      {/* Header Controls */}
      <div className="p-3 border-b border-[#dde2e8] dark:border-[#334155] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            Digital Signatures ({filteredDscs.length})
          </h2>

          {/* Search Input */}
          <div className="w-56">
            <Input
              size="sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search DSC..."
              leftIcon={<Search className="w-3.5 h-3.5 text-gray-400" />}
              onClear={() => setSearch("")}
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center rounded-sm border border-[#dde2e8] dark:border-[#334155] p-0.5 bg-gray-50 dark:bg-[#0f172a]">
            {(["All", "Active", "Expired"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setStatusFilter(filter);
                  setPage(1);
                }}
                className={`h-7 px-3 rounded-xs text-xs font-semibold cursor-pointer transition-all ${
                  statusFilter === filter
                    ? "bg-[#31719B] text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Add DSC Button */}
        <Button
          size="sm"
          variant="primary"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setIsAddDscOpen(true)}
        >
          Add
        </Button>
      </div>

      {/* Reusable DataTable */}
      <DataTable<ClientDsc>
        columns={columns}
        data={paginatedDscs}
        actions={canDelete("digital_signature") ? getDscActions : undefined}
        getRowId={(dsc, idx) => dsc.id || dsc.dscId || String(idx)}
        emptyMessage='No Digital Signatures on record. Click "+ Add" to record a DSC.'
        pagination={{
          currentPage: page,
          pageSize,
          totalItems: filteredDscs.length,
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
