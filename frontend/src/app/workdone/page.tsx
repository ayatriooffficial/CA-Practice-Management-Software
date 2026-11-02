"use client";

import React, { useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import WorkDoneClient from "../../components/workdone/WorkDoneClient";
import WorkDoneServices from "./WorkDoneServices";
import type { WorkDoneClient as Client } from "./types";
import { fetchWorkDoneRequest } from "@/store/features/workdone/workdoneSlice";
import { RootState } from "@/store";
import { Button } from "@/components/ui/Button";

export default function WorkDonePage() {
  const dispatch = useDispatch();
  const { items: clients, loading, error, pagination } = useSelector(
    (state: RootState) => state.workdone
  );
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const fetchClients = useCallback(
    (currentPage: number, currentLimit: number, currentSearch?: string) => {
      const payload: Record<string, any> = {
        page: currentPage,
        limit: currentLimit,
      };
      const trimmed = (currentSearch || "").trim();
      if (trimmed) {
        payload.search = trimmed;
      }
      dispatch(fetchWorkDoneRequest(payload));
    },
    [dispatch]
  );

  useEffect(() => {
    fetchClients(page, pageSize, search);
  }, [page, pageSize, search, fetchClients]);

  const handleRefresh = () => {
    fetchClients(page, pageSize, search);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
  };

  const handleBack = () => {
    setSelectedClient(null);
  };

  const safeClients = Array.isArray(clients) ? clients : [];

  return (
    <main
      className="min-h-screen w-full p-4 sm:p-6"
      style={{
        background: "var(--bg-app)",
        color: "var(--text-main)",
      }}
    >
      <div className="mx-auto w-full max-w-[1800px]">
        {selectedClient ? (
          <WorkDoneServices client={selectedClient} onBack={handleBack} />
        ) : error ? (
          // Error State
          <div
            className="rounded-xl border p-8 text-center"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-main)",
            }}
          >
            <h2 className="text-lg font-bold text-red-600">Failed to Load Clients</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              {error}
            </p>
            <Button
              onClick={handleRefresh}
              className="mt-5 rounded-sm"
              variant="primary"
              size="md"
            >
              Try Again
            </Button>
          </div>
        ) : (
          // Client List with DataTable and Pagination
          <WorkDoneClient
            clients={safeClients}
            loading={loading}
            onSelectClient={handleSelectClient}
            onRefresh={handleRefresh}
            search={search}
            onSearchChange={handleSearchChange}
            pagination={{
              currentPage: pagination?.page || page,
              totalItems: pagination?.totalDocs ?? safeClients.length,
              pageSize: pagination?.limit || pageSize,
              onPageChange: handlePageChange,
              rowsPerPageOptions: [10, 20, 50, 100],
              onRowsPerPageChange: handlePageSizeChange,
            }}
          />
        )}
      </div>
    </main>
  );
}
