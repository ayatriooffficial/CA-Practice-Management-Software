"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Settings,
  Search,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchComplianceRequest,
  syncGstRequest,
} from "@/store/features/compliance/complianceSlice";
import { showToast } from "@/store/features/ui/uiSlice";
import {
  useSyncEntitlementData,
} from "@/hooks/useCompliance";
import { SERVICE_CATEGORIES } from "@/constants/serviceCategories";
import { ComplianceGrid } from "./ComplianceGrid";
import { NoticeCalendarView } from "@/components/notices/NoticeCalendarView";
import { LogsTab } from "@/components/notices/LogsTab";
import { SyncDrawer } from "@/components/notices/SyncDrawer";

export const FREQUENCY_OPTIONS = [
  { key: "all", label: "All" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "half_yearly", label: "Half-Yearly" },
  { key: "yearly", label: "Yearly" },
] as const;

export type FrequencyKey = (typeof FREQUENCY_OPTIONS)[number]["key"];

const AUTO_CATEGORIES = new Set([
  "g.s.t",
  "gst",
  "income tax",
  "r.o.c",
]);

const LEGACY_ID_TO_CATEGORY: Record<string, string> = {
  "cat-gst": "G.S.T",
  "cat-it": "Income Tax",
  "cat-corp-sec": "R.O.C",
  "cat-pf": "E.P.F.P",
  "cat-esi": "E.S.I.C",
  "cat-audit": "Audit",
  "cat-retainer": "Retainer",
  "cat-pune-pt": "Profession Tax",
  "cat-trade-license": "Trade License",
  "cat-iec": "Import Export",
  "cat-shram-suvida": "Shram Suvida",
  "gst": "G.S.T",
  "it": "Income Tax",
  "pf": "E.P.F.P",
  "esi": "E.S.I.C",
  "pt": "Profession Tax",
  "roc": "R.O.C",
};

function findActiveCategory(param: string | null): string {
  if (!param) return "G.S.T";
  const low = param.toLowerCase().trim();
  if (LEGACY_ID_TO_CATEGORY[low]) {
    return LEGACY_ID_TO_CATEGORY[low];
  }
  const normalized = low.replace(/[\s\.\-_]/g, "");
  const match = SERVICE_CATEGORIES.find(
    (c) =>
      c.toLowerCase() === low ||
      c.toLowerCase().replace(/[\s\.\-_]/g, "") === normalized
  );
  return match || "G.S.T";
}

function parseFrequency(param: string | null, _categoryId?: string): FrequencyKey {
  if (param) {
    const clean = param.trim().toLowerCase().replace("-", "_");
    if (clean === "monthly") return "monthly";
    if (clean === "quarterly") return "quarterly";
    if (clean === "half_yearly" || clean === "half-yearly") return "half_yearly";
    if (clean === "yearly") return "yearly";
    if (clean === "all") return "all";
  }
  return "all";
}

function getCurrentFyStartYear(): number {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

function parseFyStartYear(param: string | null): number {
  if (!param) return getCurrentFyStartYear();
  const match = param.match(/(\d{4})/);
  if (match) {
    const yr = parseInt(match[1], 10);
    if (!isNaN(yr)) return yr;
  }
  return getCurrentFyStartYear();
}

function getSearchPlaceholder(categoryName?: string): string {
  if (!categoryName) return "Search by PAN, Client Name";
  const lower = categoryName.toLowerCase();
  if (lower.includes("gst")) {
    return "Search by GSTIN, Legal Name, Form Name";
  }
  if (lower.includes("tax") || lower.includes("it")) {
    return "Search by PAN, Client Name";
  }
  return `Search ${categoryName} by Client Name, ID`;
}

export const ComplianceShell: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dispatch = useAppDispatch();
  const { rows, columns, loading, isLoaded, isSyncingGst } = useAppSelector(
    (state) => state.compliance
  );

  const { isCooldown } = useSyncEntitlementData();

  const categoryParam = searchParams.get("category") || searchParams.get("tab");
  const frequencyParam = searchParams.get("frequency");
  const fyParam = searchParams.get("fy");
  const searchParam = searchParams.get("search");

  const activeCategoryId = useMemo(() => {
    return findActiveCategory(categoryParam);
  }, [categoryParam]);

  const activeFrequency = useMemo(() => {
    return parseFrequency(frequencyParam, activeCategoryId);
  }, [frequencyParam, activeCategoryId]);

  const fyStartYear = parseFyStartYear(fyParam);
  const activeFy = `FY ${fyStartYear}-${fyStartYear + 1}`;
  const fyLabel = activeFy;

  const [localSearch, setLocalSearch] = useState<string | null>(null);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [refreshQrmp, setRefreshQrmp] = useState<boolean>(false);
  const selectedClientIds = useMemo(() => Array.from(selectedClients), [selectedClients]);
  const searchInput = localSearch !== null ? localSearch : searchParam || "";

  const handleSyncGst = useCallback(() => {
    if (selectedClientIds.length === 0) {
      dispatch(
        showToast({
          type: "info",
          message: "Please tick at least one client to sync GST details.",
        })
      );
      return;
    }
    dispatch(
      syncGstRequest({
        clientIds: selectedClientIds,
        fy: activeFy,
        refreshPreference: refreshQrmp,
      })
    );
  }, [dispatch, selectedClientIds, activeFy, refreshQrmp]);

  // Memoize fetch parameters based ONLY on primitive filter values
  const fetchParams = useMemo(() => ({
    category: activeCategoryId,
    categoryId: activeCategoryId,
    fy: activeFy,
    frequency: activeFrequency,
    search: searchInput ? searchInput.trim() : undefined,
  }), [activeCategoryId, activeFy, activeFrequency, searchInput]);

  // Stable effect: runs ONLY when primitive filter values change, preventing infinite loops
  useEffect(() => {
    dispatch(fetchComplianceRequest(fetchParams));
  }, [dispatch, fetchParams]);

  const updateUrlParams = useCallback(
    (updates: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === undefined || val === "") {
          current.delete(key);
        } else {
          current.set(key, val);
        }
      }
      const queryStr = current.toString();
      const target = queryStr ? `${pathname}?${queryStr}` : pathname;
      router.push(target, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleCategoryClick = (catName: string) => {
    updateUrlParams({
      category: catName,
      tab: catName,
    });
  };

  const handleFrequencyChange = (freq: FrequencyKey) => {
    updateUrlParams({ frequency: freq });
  };

  const handlePrevFy = () => {
    const nextStart = fyStartYear - 1;
    updateUrlParams({ fy: `${nextStart}-${nextStart + 1}` });
  };

  const handleNextFy = () => {
    const nextStart = fyStartYear + 1;
    updateUrlParams({ fy: `${nextStart}-${nextStart + 1}` });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    updateUrlParams({ search: val || null });
  };

  const isCalendarView = categoryParam?.toLowerCase() === "cat-calendar" || categoryParam?.toLowerCase() === "calendar";
  const isLogsView = categoryParam?.toLowerCase() === "cat-logs" || categoryParam?.toLowerCase() === "logs";
  const searchPlaceholder = getSearchPlaceholder(activeCategoryId);

  return (
    <div
      className="flex flex-col w-full min-h-screen"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* 1. Category Chips & Credits Section */}
      <div
        className="px-4 sm:px-6 pt-3 pb-2.5 border-b flex flex-col gap-2"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          {/* Chips list wrapping into rows with modern scroll */}
          <div className="flex overflow-x-auto items-end gap-x-2 gap-y-1 flex-1 pb-1 w-full hide-scrollbar snap-x">
            {SERVICE_CATEGORIES.map((catName) => {
              const isActive = activeCategoryId.toLowerCase() === catName.toLowerCase();
              const hasAutoBadge = AUTO_CATEGORIES.has(catName.toLowerCase());

              return (
                <div key={catName} className="flex flex-col items-center justify-end shrink-0 snap-start">
                  {hasAutoBadge ? (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase leading-tight tracking-wider mb-0.5"
                      style={{
                        backgroundColor: "var(--badge-new-bg)",
                        color: "var(--badge-new-text)",
                      }}
                    >
                      AUTO
                    </span>
                  ) : (
                    <span className="text-[9px] leading-tight mb-0.5 opacity-0 pointer-events-none select-none">
                      AUTO
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCategoryClick(catName)}
                    className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs transition-all cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? "font-semibold shadow-xs"
                        : "hover:border-gray-400 dark:hover:border-neutral-500 font-medium"
                    }`}
                    style={{
                      backgroundColor: isActive
                        ? "var(--primary)"
                        : "var(--bg-surface)",
                      borderColor: isActive
                        ? "var(--primary)"
                        : "var(--border-main)",
                      color: isActive
                        ? "var(--text-inverse)"
                        : "var(--text-main)",
                    }}
                  >
                    <span>{catName}</span>
                  </button>
                </div>
              );
            })}

            {/* Settings Gear Button at end */}
            <div className="flex flex-col items-center justify-end shrink-0 snap-start">
              <span className="text-[9px] leading-tight mb-0.5 opacity-0 pointer-events-none select-none">
                AUTO
              </span>
              <button
                type="button"
                className="p-1.5 rounded-full border transition-colors cursor-pointer shrink-0"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-main)",
                  color: "var(--text-muted)",
                }}
                title="Settings"
                aria-label="Compliance settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isCalendarView ? (
        <div className="flex-1 flex flex-col w-full">
          <NoticeCalendarView module="compliance" />
        </div>
      ) : isLogsView ? (
        <div className="flex-1 flex flex-col w-full">
          <LogsTab module="compliance" />
        </div>
      ) : (
        <>
          {/* 2. Toolbar Section */}
          <div
            className="px-4 sm:px-6 py-2.5 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-main)",
            }}
          >
            {/* Left side: Search input */}
            <Input
              leftIcon={<Search className="w-4 h-4" />}
              inputSize="sm"
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={handleSearchChange}
              containerClassName="w-full md:flex-1 md:min-w-[260px] max-w-sm"
            />

            {/* Action Controls & Filters */}
            <div className="flex overflow-x-auto w-full md:w-auto items-center gap-2.5 pb-1 hide-scrollbar">
              {/* Download Utility */}
              <Button
                variant="secondary"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Download Utility
              </Button>

              {/* XLS */}
              <Button
                variant="secondary"
                size="sm"
                icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
              >
                XLS
              </Button>

              {/* Frequency Segmented Control */}
              <div
                className="flex items-center rounded-md border p-0.5 shrink-0"
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  borderColor: "var(--border-main)",
                }}
              >
                {FREQUENCY_OPTIONS.map((opt) => {
                  const isActive = activeFrequency === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleFrequencyChange(opt.key)}
                      className="px-2.5 py-1 text-xs rounded transition-all cursor-pointer whitespace-nowrap"
                      style={{
                        backgroundColor: isActive
                          ? "var(--primary)"
                          : "transparent",
                        color: isActive
                          ? "var(--text-inverse)"
                          : "var(--text-muted)",
                        fontWeight: isActive ? 600 : 500,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* FY Selector */}
              <div
                className="flex items-center gap-1 px-1 py-0.5 rounded-md border shrink-0"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-main)",
                  color: "var(--text-main)",
                }}
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Previous Financial Year"
                  onClick={handlePrevFy}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-semibold px-1 whitespace-nowrap">
                  {fyLabel}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Next Financial Year"
                  onClick={handleNextFy}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Refresh QRMP Status Checkbox */}
              <label
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer select-none whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  borderColor: "var(--border-main)",
                  color: "var(--text-main)",
                }}
                title="Check to force re-fetching Monthly vs Quarterly (QRMP) filing preference from GST portal"
              >
                <input
                  type="checkbox"
                  checked={refreshQrmp}
                  onChange={(e) => setRefreshQrmp(e.target.checked)}
                  className="rounded cursor-pointer"
                />
                <span>Refresh QRMP Status</span>
              </label>

              {/* Sync GST Portal Button (Live gstinapi.in) */}
              <Button
                variant="primary"
                size="sm"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncingGst ? "animate-spin" : ""}`} />}
                disabled={isSyncingGst}
                onClick={handleSyncGst}
              >
                {isSyncingGst
                  ? "Syncing GST..."
                  : selectedClientIds.length > 0
                  ? `Sync GST Portal (${selectedClientIds.length})`
                  : "Sync GST Portal"}
              </Button>

              {/* Sync Status Button */}
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => setIsSyncDrawerOpen(true)}
              >
                Sync Status
              </Button>

              {/* Free Sync Button */}
              <Button
                variant="primary"
                size="sm"
                icon={<Zap className="w-3.5 h-3.5" />}
                disabled={isCooldown}
                onClick={() => setIsSyncDrawerOpen(true)}
              >
                Free Sync
              </Button>
            </div>
          </div>

          {/* 3. Compliance Grid Section */}
          <div className="flex-1 p-4 sm:p-6 flex flex-col min-w-0">
            <ComplianceGrid
              categoryId={activeCategoryId}
              fy={activeFy}
              frequency={activeFrequency}
              search={searchInput}
              portal={activeCategoryId.toLowerCase().includes("gst") ? "GST Portal" : undefined}
              isAuto={AUTO_CATEGORIES.has(activeCategoryId.toLowerCase())}
              rows={rows}
              columns={columns}
              loading={loading}
              selectedClients={selectedClients}
              onSelectedClientsChange={setSelectedClients}
            />
          </div>
        </>
      )}

      {/* Sync Drawer */}
      <SyncDrawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
        selectedClientIds={selectedClientIds}
      />
    </div>
  );
};
