"use client";

import React, { useMemo, useState } from "react";
import type { Client } from "@/app/workdone/types";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface WorkDoneClientProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onRefresh?: () => void;
  loading?: boolean;
  pagination?: {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    rowsPerPageOptions?: number[];
    onRowsPerPageChange?: (rowsPerPage: number) => void;
  };
  search?: string;
  onSearchChange?: (search: string) => void;
}

export default function WorkDoneClient({
  clients,
  onSelectClient,
  onRefresh,
  loading = false,
  pagination,
  search: controlledSearch,
  onSearchChange,
}: WorkDoneClientProps) {
  const [internalSearch, setInternalSearch] = useState("");
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(10);

  const search = controlledSearch !== undefined ? controlledSearch : internalSearch;

  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearch(val);
      setInternalPage(1);
    }
  };

  const filteredClients = useMemo(() => {
    if (controlledSearch !== undefined) {
      // Backend handled search
      return clients;
    }
    const value = search.toLowerCase().trim();
    if (!value) return clients;
    return clients.filter(
      (client) =>
        client.businessName?.toLowerCase().includes(value) ||
        client.legalName?.toLowerCase().includes(value)
    );
  }, [clients, search, controlledSearch]);

  const displayData = useMemo(() => {
    if (pagination) {
      return filteredClients;
    }
    const startIndex = (internalPage - 1) * internalPageSize;
    return filteredClients.slice(startIndex, startIndex + internalPageSize);
  }, [filteredClients, pagination, internalPage, internalPageSize]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const columns = useMemo<DataTableColumn<Client>[]>(
    () => [
      {
        id: "businessName",
        header: "Client",
        accessorKey: "businessName",
        sortable: true,
        cell: (client) => (
          <div className="font-medium text-[var(--text-main)] hover:text-[var(--primary)] transition-colors">
            {client.businessName || "Unknown Client"}
          </div>
        ),
      },
      {
        id: "legalName",
        header: "Legal Name",
        accessorKey: "legalName",
        sortable: true,
        cell: (client) => (
          <span className="text-sm text-[var(--text-muted)]">
            {client.legalName || "—"}
          </span>
        ),
      },
      {
        id: "totalCost",
        header: "Total Cost",
        accessorKey: "totalCost",
        align: "right",
        sortable: true,
        cell: (client) => (
          <span className="text-sm font-medium text-[var(--text-main)]">
            {formatCurrency(client.totalCost)}
          </span>
        ),
      },
      {
        id: "totalPaid",
        header: "Total Paid",
        accessorKey: "totalPaid",
        align: "right",
        sortable: true,
        cell: (client) => (
          <span className="text-sm font-medium text-green-700">
            {formatCurrency(client.totalPaid)}
          </span>
        ),
      },
      {
        id: "balance",
        header: "Balance",
        align: "right",
        sortable: true,
        cell: (client) => {
          const balance = (client.totalCost || 0) - (client.totalPaid || 0);
          return (
            <span
              className={`text-sm font-medium ${
                balance > 0 ? "text-red-600" : "text-green-700"
              }`}
            >
              {formatCurrency(balance)}
            </span>
          );
        },
      },
      {
        id: "action",
        header: "Action",
        align: "center",
        cell: (client) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-sm bg-[var(--primary-light)] text-[var(--primary)] border-transparent hover:bg-[var(--primary)] hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onSelectClient(client);
            }}
          >
            View Details →
          </Button>
        ),
      },
    ],
    [onSelectClient]
  );

  const effectivePagination = pagination || {
    currentPage: internalPage,
    totalItems: filteredClients.length,
    pageSize: internalPageSize,
    onPageChange: setInternalPage,
    rowsPerPageOptions: [10, 20, 50, 100],
    onRowsPerPageChange: (newSize: number) => {
      setInternalPageSize(newSize);
      setInternalPage(1);
    },
  };

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-main)]">
            Work Done Clients
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Select a client to view their service and payment details.
          </p>
        </div>
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="rounded-sm"
          >
            ↻ Refresh
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by business or legal name..."
          className="w-full rounded-sm sm:max-w-sm"
        />
        <span className="text-sm text-[var(--text-muted)]">
          {pagination ? pagination.totalItems : filteredClients.length} clients
        </span>
      </div>

      {/* DataTable */}
      <DataTable<Client>
        columns={columns}
        data={displayData}
        loading={loading}
        getRowId={(client) => client.clientId}
        onRowClick={(client) => onSelectClient(client)}
        pagination={effectivePagination}
        actions={(client) => [
          {
            label: "View Details",
            onClick: () => onSelectClient(client),
          },
        ]}
      />
    </div>
  );
}
