"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  RotateCw,
  Bell,
  CheckCircle,
  Clock,
  Coins,
  Check,
} from "lucide-react";
import type { Client, Portal, SyncJob } from "@/types/notices";
import { syncClients, getSyncJobs } from "@/services/syncApi";
import { getClients } from "@/services/noticeApi";
import { emitSyncCompleted } from "@/lib/syncEvents";

export interface SyncDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClientIds: string[];
  clients?: Client[];
  onSyncSuccess?: (job: SyncJob) => void;
}

function formatHistoryDate(dateStr?: string): string {
  if (!dateStr) return "Just now";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, "0");
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}, ${strHours}:${minutes} ${ampm}`;
}

export const SyncDrawer: React.FC<SyncDrawerProps> = ({
  isOpen,
  onClose,
  selectedClientIds,
  clients: initialClients,
  onSyncSuccess,
}) => {
  const [selectedPortals, setSelectedPortals] = useState<Record<Portal, boolean>>({
    GST: true,
    IT: true,
    TDS: true,
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentSyncJob, setCurrentSyncJob] = useState<SyncJob | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncJob[]>([]);
  const [fetchedClients, setFetchedClients] = useState<Client[]>([]);

  useEffect(() => {
    if (isOpen) {
      getSyncJobs()
        .then((jobs) => {
          if (jobs) setSyncHistory(jobs);
        })
        .catch(() => {});

      if (!initialClients || initialClients.length === 0) {
        getClients()
          .then((res) => {
            if (res && res.data) setFetchedClients(res.data);
          })
          .catch(() => {});
      }
    }
  }, [isOpen, initialClients]);

  const activeClientsList = initialClients && initialClients.length > 0 ? initialClients : fetchedClients;

  const targetClients = useMemo(() => {
    if (!selectedClientIds || selectedClientIds.length === 0) {
      return activeClientsList;
    }
    const idSet = new Set(selectedClientIds);
    return activeClientsList.filter((c) => idSet.has(c.id));
  }, [activeClientsList, selectedClientIds]);

  const targetClientIds = useMemo(() => {
    return targetClients.map((c) => c.id);
  }, [targetClients]);

  const activePortalsList = useMemo(() => {
    return (Object.keys(selectedPortals) as Portal[]).filter((p) => selectedPortals[p]);
  }, [selectedPortals]);

  const estimatedCredits = targetClientIds.length * activePortalsList.length;

  const togglePortal = (portal: Portal) => {
    setSelectedPortals((prev) => ({
      ...prev,
      [portal]: !prev[portal],
    }));
  };

  const handleStartSync = async () => {
    if (activePortalsList.length === 0 || targetClientIds.length === 0 || isSyncing) {
      return;
    }

    setIsSyncing(true);
    setSyncProgress(15);
    setCurrentSyncJob(null);

    const progressInterval = setInterval(() => {
      setSyncProgress((prev) => (prev < 85 ? prev + 15 : prev));
    }, 400);

    try {
      const response = await syncClients({
        clientIds: targetClientIds,
        portals: activePortalsList,
        triggeredBy: "Manual Sync Drawer",
      });

      clearInterval(progressInterval);
      setSyncProgress(100);

      setTimeout(() => {
        setIsSyncing(false);
        setCurrentSyncJob(response);
        setSyncHistory((prev) => [response, ...prev]);
        emitSyncCompleted(response);
        onSyncSuccess?.(response);
      }, 500);
    } catch {
      clearInterval(progressInterval);
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className="relative w-full max-w-md h-full shadow-2xl flex flex-col z-10 overflow-hidden transition-transform"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderLeft: "1px solid var(--border-main)",
        }}
      >
        {/* Drawer Header */}
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border-main)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--text-inverse)",
              }}
            >
              <RotateCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
                Sync Portal Data
              </h2>
              <p className="text-[11px] font-medium" style={{ color: "var(--text-subtle)" }}>
                Fetch live notices & records from government portals
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
            style={{ color: "var(--text-subtle)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {/* Target Clients Summary Banner */}
          <div
            className="p-3.5 rounded-lg border flex items-center justify-between"
            style={{
              backgroundColor: "var(--bg-subtle)",
              borderColor: "var(--border-main)",
            }}
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>
                Target Scope
              </span>
              <span className="text-xs font-bold mt-0.5" style={{ color: "var(--text-main)" }}>
                {selectedClientIds && selectedClientIds.length > 0
                  ? `${targetClientIds.length} Selected Client${targetClientIds.length === 1 ? "" : "s"}`
                  : `All Clients (${targetClientIds.length} Total)`}
              </span>
            </div>

            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border"
              style={{
                backgroundColor: "var(--credits-bg)",
                borderColor: "var(--credits-border)",
                color: "var(--credits-text)",
              }}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{estimatedCredits} Credits</span>
            </div>
          </div>

          {/* Portal Selectors */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>
              Select Portals to Sync
            </label>

            <div className="grid grid-cols-3 gap-2">
              {(["GST", "IT", "TDS"] as Portal[]).map((p) => {
                const isSelected = selectedPortals[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePortal(p)}
                    className="p-3 rounded-lg border text-left flex flex-col justify-between h-20 transition-all cursor-pointer relative"
                    style={{
                      backgroundColor: isSelected ? "var(--bg-active)" : "var(--bg-surface)",
                      borderColor: isSelected ? "var(--primary)" : "var(--border-main)",
                    }}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-xs" style={{ color: "var(--text-main)" }}>
                        {p}
                      </span>
                      {isSelected && (
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: "var(--primary)",
                            color: "var(--text-inverse)",
                          }}
                        >
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
                      1 credit/client
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sync Progress Bar */}
          {isSyncing && (
            <div className="flex flex-col gap-2 p-3.5 rounded-lg border animate-pulse" style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-main)" }}>
              <div className="flex justify-between text-xs font-semibold">
                <span style={{ color: "var(--primary)" }}>Syncing live portal data…</span>
                <span style={{ color: "var(--text-main)" }}>{syncProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border-main)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${syncProgress}%`, backgroundColor: "var(--primary)" }}
                />
              </div>
            </div>
          )}

          {/* Active / Last Sync Result Card */}
          {currentSyncJob && (
            <div
              className="p-4 rounded-lg border flex flex-col gap-3"
              style={{
                backgroundColor: "var(--badge-new-bg)",
                borderColor: "var(--border-main)",
              }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: "var(--badge-new-text)" }} />
                <span className="text-xs font-bold" style={{ color: "var(--badge-new-text)" }}>
                  Sync completed successfully!
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>New Items Found:</span>
                  <div className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                    {currentSyncJob.newItems}
                  </div>
                </div>
                <div>
                  <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>Credits Deducted:</span>
                  <div className="font-bold text-sm" style={{ color: "var(--credits-text)" }}>
                    {currentSyncJob.creditsUsed}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Sync History */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>
              Recent Sync History
            </span>

            <div className="flex flex-col gap-2">
              {syncHistory.slice(0, 4).map((job) => (
                <div
                  key={job.id}
                  className="p-3 rounded-lg border flex items-center justify-between text-xs"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-main)",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-3.5 h-3.5" style={{ color: "var(--text-subtle)" }} />
                    <div className="flex flex-col">
                      <span className="font-semibold" style={{ color: "var(--text-main)" }}>
                        {formatHistoryDate(job.startedAt)}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
                        {job.portals.join(", ")} • {job.clientIds.length} clients
                      </span>
                    </div>
                  </div>

                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                    style={{
                      backgroundColor: job.status === "success" ? "var(--badge-new-bg)" : "var(--credits-bg)",
                      color: job.status === "success" ? "var(--badge-new-text)" : "var(--credits-text)",
                    }}
                  >
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Action Button */}
        <div
          className="p-4 border-t flex items-center gap-3"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-main)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer text-center"
            style={{
              backgroundColor: "transparent",
              borderColor: "var(--border-main)",
              color: "var(--text-muted)",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStartSync}
            disabled={isSyncing || activePortalsList.length === 0 || targetClientIds.length === 0}
            className="flex-2 py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--text-inverse)",
              opacity: isSyncing || activePortalsList.length === 0 || targetClientIds.length === 0 ? 0.6 : 1,
            }}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : `Sync Now (${estimatedCredits} Credits)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
