"use client";

import React, { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import WorkDoneClient from "../../components/workdone/WorkDoneClient";
import WorkDoneServices from "./WorkDoneServices";
import type { WorkDoneClient as Client } from "./types";
import { fetchWorkDoneRequest } from "@/store/features/workdone/workdoneSlice";
import { RootState } from "@/store";

export default function WorkDonePage() {
  const dispatch = useDispatch();
  const { items: clients, loading, error } = useSelector((state: RootState) => state.workdone);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);

  const fetchClients = useCallback(() => {
    dispatch(fetchWorkDoneRequest(undefined));
  }, [dispatch]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleRefresh = () => {
    fetchClients();
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
  };

  const handleBack = () => {
    setSelectedClient(null);
  };

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
        ) : loading ? (
          // Loading State
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
            <div
              className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200"
              style={{
                borderTopColor: "var(--primary)",
              }}
            />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              Loading clients...
            </p>
          </div>
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
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-5 rounded-lg px-5 py-2 text-sm font-semibold text-white"
              style={{
                background: "var(--primary)",
              }}
            >
              Try Again
            </button>
          </div>
        ) : (
          // Client List
          <WorkDoneClient
            clients={clients}
            onSelectClient={handleSelectClient}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </main>
  );
}
