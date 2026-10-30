
"use client";

import React, { useCallback, useEffect, useState } from "react";

import WorkDoneClient from "../../components/workdone/WorkDoneClient";
import WorkDoneServices from "./WorkDoneServices";

import type {
  WorkDoneApiResponse,
  WorkDoneClient as Client,
} from "./types";

const API_URL =
  "http://localhost:5000/api/v1/workdone/client-work-done";

export default function WorkDonePage() {
  const [clients, setClients] = useState<Client[]>([]);

  const [selectedClient, setSelectedClient] =
    useState<Client | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch client data
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch clients. Status: ${response.status}`
        );
      }

      const result: WorkDoneApiResponse = await response.json();

      if (!result.success) {
        throw new Error("Unable to fetch client work done data.");
      }

      setClients(result.data || []);

    } catch (err) {
      console.error("Client fetch error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while fetching clients."
      );

    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when component mounts
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Refresh selected client data
  const handleRefresh = async () => {
    await fetchClients();
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
          <WorkDoneServices
            client={selectedClient}
            onBack={() => setSelectedClient(null)}
          />
        ) : loading ? (

          // Loading State
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
            <div
              className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200"
              style={{
                borderTopColor: "var(--primary)",
              }}
            />

            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-muted)" }}
            >
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
            <h2 className="text-lg font-bold text-red-600">
              Failed to Load Clients
            </h2>

            <p
              className="mt-2 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {error}
            </p>

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
            onSelectClient={setSelectedClient}
            onRefresh={handleRefresh}
          />

        )}

      </div>
    </main>
  );
}
