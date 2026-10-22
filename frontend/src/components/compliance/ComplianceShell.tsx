"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Coins,
  Settings,
  Search,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
} from "lucide-react";
import type { ComplianceCategory } from "@/types/compliance";
import {
  useComplianceCategories,
  useSyncEntitlementData,
  useCreditsData,
} from "@/hooks/useCompliance";
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

const DEFAULT_CATEGORIES: ComplianceCategory[] = [
  { id: "cat-calendar", name: "Calendar", order: 1, mode: "manual" },
  { id: "cat-gst", name: "GST", order: 2, mode: "auto", portal: "GST" },
  { id: "cat-tds", name: "TDS/TCS", order: 3, mode: "auto", portal: "TDS" },
  { id: "cat-it", name: "Income Tax", order: 4, mode: "auto", portal: "IT" },
  { id: "cat-adv-tax", name: "Adv Tax", order: 5, mode: "manual" },
  { id: "cat-pf", name: "PF", order: 6, mode: "manual" },
  { id: "cat-esi", name: "ESI", order: 7, mode: "manual" },
  { id: "cat-it-comp", name: "Income Tax Compliances", order: 8, mode: "manual" },
  { id: "cat-stage-1", name: "Stage 1", order: 9, mode: "manual" },
  { id: "cat-corp-sec", name: "Corporate & Secretarial Compliances", order: 10, mode: "manual" },
  { id: "cat-mgmt-cons", name: "Management Consultancy", order: 11, mode: "manual" },
  { id: "cat-tds-comp", name: "TDS Compliances", order: 12, mode: "manual" },
  { id: "cat-accounts", name: "Accounts", order: 13, mode: "manual" },
  { id: "cat-retainer", name: "Retainer", order: 14, mode: "manual" },
  { id: "cat-book-keeping", name: "Book Keeping", order: 15, mode: "manual" },
  { id: "cat-labour", name: "Labour Compliances", order: 16, mode: "manual" },
  { id: "cat-pune-pt", name: "Pune PT", order: 17, mode: "manual" },
  { id: "cat-real-estate", name: "Real Estate", order: 18, mode: "manual" },
  { id: "cat-uncat", name: "Uncategoriz", order: 19, mode: "manual" },
  { id: "cat-audit", name: "Audit & Assurance", order: 20, mode: "manual" },
  { id: "cat-cfo", name: "CFO Services", order: 21, mode: "manual" },
  { id: "cat-gst-comp", name: "GST Compliances", order: 22, mode: "manual" },
  { id: "cat-payroll", name: "Payroll", order: 23, mode: "manual" },
  { id: "cat-sebi", name: "SEBI", order: 24, mode: "manual" },
  { id: "cat-stpi", name: "STPI Compliances", order: 25, mode: "manual" },
  { id: "cat-turia-test", name: "Turia Test", order: 26, mode: "manual" },
  { id: "cat-logs", name: "Logs", order: 27, mode: "manual" },
];

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

function parseFyStartYear(param: string | null): number {
  if (!param) return 2025;
  const match = param.match(/(\d{4})/);
  if (match) {
    const yr = parseInt(match[1], 10);
    if (!isNaN(yr)) return yr;
  }
  return 2025;
}

function findCategory(
  param: string | null,
  categories: ComplianceCategory[]
): ComplianceCategory | undefined {
  if (!categories.length) return undefined;
  if (!param) {
    // Default to Income Tax as shown in reference screenshot, or cat-it
    return categories.find((c) => c.id === "cat-it" || c.name === "Income Tax") || categories[0];
  }
  const clean = decodeURIComponent(param).trim().toLowerCase();
  return (
    categories.find((c) => c.id.toLowerCase() === clean) ||
    categories.find((c) => c.id.replace("cat-", "").toLowerCase() === clean) ||
    categories.find((c) => c.name.toLowerCase() === clean) ||
    categories.find((c) => c.portal?.toLowerCase() === clean) ||
    categories[0]
  );
}

function getSearchPlaceholder(category?: ComplianceCategory): string {
  if (!category) return "Search by PAN, Client Name";
  const id = category.id.toLowerCase();
  const name = category.name.toLowerCase();
  const portal = category.portal;

  if (portal === "GST" || id === "cat-gst" || name === "gst") {
    return "Search by GSTIN, Legal Name, Form Name";
  }
  if (portal === "TDS" || id === "cat-tds" || name.includes("tds")) {
    return "Search by TAN, Legal Name, Type";
  }
  return "Search by PAN, Client Name";
}

export const ComplianceShell: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { categories: fetchedCategories } = useComplianceCategories();
  const { isCooldown, daysRemaining } = useSyncEntitlementData();
  const { credits } = useCreditsData();

  const categories = useMemo(() => {
    if (fetchedCategories && fetchedCategories.length > 0) {
      return fetchedCategories;
    }
    return DEFAULT_CATEGORIES;
  }, [fetchedCategories]);

  const categoryParam = searchParams.get("category") || searchParams.get("tab");
  const frequencyParam = searchParams.get("frequency");
  const fyParam = searchParams.get("fy");
  const searchParam = searchParams.get("search");

  const activeCategory = useMemo(() => {
    return findCategory(categoryParam, categories);
  }, [categoryParam, categories]);

  const activeCategoryId = activeCategory?.id || "cat-it";

  const activeFrequency = useMemo(() => {
    return parseFrequency(frequencyParam, activeCategoryId);
  }, [frequencyParam, activeCategoryId]);

  const fyStartYear = parseFyStartYear(fyParam);
  const fyLabel = `FY ${fyStartYear}-${fyStartYear + 1}`;

  const [localSearch, setLocalSearch] = useState<string | null>(null);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);
  const searchInput = localSearch !== null ? localSearch : searchParam || "";

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

  const handleCategoryClick = (cat: ComplianceCategory) => {
    updateUrlParams({
      category: cat.id,
      tab: cat.id,
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

  const isCalendarView = activeCategoryId === "cat-calendar" || activeCategory?.name === "Calendar";
  const isLogsView = activeCategoryId === "cat-logs" || activeCategory?.name === "Logs";
  const searchPlaceholder = getSearchPlaceholder(activeCategory);

  const AUTO_CATEGORY_IDS = new Set([
    "cat-gst",
    "cat-tds",
    "cat-it",
    "gst",
    "tds/tcs",
    "income tax",
  ]);

  return (
    <div
      className="flex flex-col w-full min-h-screen"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* 1. Category Chips & Credits Section */}
      <div
        className="px-6 pt-3 pb-2.5 border-b flex flex-col gap-2"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          {/* Chips list wrapping into 2-3 lines */}
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1 flex-1">
            {categories.map((cat) => {
              const isActive = activeCategoryId === cat.id || activeCategory?.name.toLowerCase() === cat.name.toLowerCase();
              const hasAutoBadge =
                cat.mode === "auto" ||
                AUTO_CATEGORY_IDS.has(cat.id.toLowerCase()) ||
                AUTO_CATEGORY_IDS.has(cat.name.toLowerCase());

              return (
                <div key={cat.id} className="flex flex-col items-center justify-end">
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
                    onClick={() => handleCategoryClick(cat)}
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
                    <span>{cat.name}</span>
                  </button>
                </div>
              );
            })}

            {/* Settings Gear Button at end */}
            <div className="flex flex-col items-center justify-end">
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

          {/* Credits badge aligned to top right */}
          <div className="shrink-0 self-start mt-2 lg:mt-3">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer shadow-2xs"
              style={{
                backgroundColor: "var(--credits-bg)",
                borderColor: "var(--credits-border)",
                color: "var(--credits-text)",
              }}
            >
              <Coins className="w-3.5 h-3.5" />
              <span className="tracking-wide text-[10px] font-bold">CREDITS</span>
              <span className="font-bold">
                {credits === null ? "13,841" : credits.toLocaleString()}
              </span>
            </button>
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
            className="px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-3"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-main)",
            }}
          >
            {/* Left side: Search input */}
            <div className="relative flex-1 min-w-[260px] max-w-sm">
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-subtle)" }}
              />
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border focus:outline-none transition-colors"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-main)",
                  color: "var(--text-main)",
                }}
              />
            </div>

            {/* Action Controls & Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Download Utility */}
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer shrink-0"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-main)",
                  color: "var(--text-main)",
                }}
              >
                <Download
                  className="w-3.5 h-3.5"
                  style={{ color: "var(--text-subtle)" }}
                />
                <span>Download Utility</span>
              </button>

              {/* XLS */}
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer shrink-0"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-main)",
                  color: "var(--text-main)",
                }}
              >
                <FileSpreadsheet
                  className="w-3.5 h-3.5"
                  style={{ color: "var(--text-subtle)" }}
                />
                <span>XLS</span>
              </button>

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
                className="flex items-center gap-1 px-2 py-1 rounded-md border shrink-0"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-main)",
                  color: "var(--text-main)",
                }}
              >
                <button
                  type="button"
                  aria-label="Previous Financial Year"
                  onClick={handlePrevFy}
                  className="p-0.5 rounded hover:opacity-80 transition-opacity cursor-pointer"
                  style={{ color: "var(--text-subtle)" }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold px-1 whitespace-nowrap">
                  {fyLabel}
                </span>
                <button
                  type="button"
                  aria-label="Next Financial Year"
                  onClick={handleNextFy}
                  className="p-0.5 rounded hover:opacity-80 transition-opacity cursor-pointer"
                  style={{ color: "var(--text-subtle)" }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Sync Status Button */}
              <button
                type="button"
                onClick={() => setIsSyncDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer shrink-0"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--primary)",
                  color: "var(--primary)",
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Status</span>
              </button>

              {/* Free Sync Button */}
              <div className="flex flex-col items-center shrink-0">
                <button
                  type="button"
                  disabled={isCooldown}
                  onClick={() => setIsSyncDrawerOpen(true)}
                  className={`flex items-center gap-1.5 px-3.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                    isCooldown
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--primary)",
                    color: "var(--primary)",
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Free Sync</span>
                </button>
                <span
                  className="text-[10px] mt-0.5 tracking-tight whitespace-nowrap font-medium"
                  style={{ color: "var(--status-online)" }}
                >
                  Once in 14 days (Growth plan)
                </span>
              </div>
            </div>
          </div>

          {/* 3. Compliance Grid Section */}
          <div className="flex-1 p-6 flex flex-col">
            <ComplianceGrid
              categoryId={activeCategoryId}
              fy={fyLabel}
              frequency={activeFrequency}
              search={searchInput}
              portal={activeCategory?.portal}
              isAuto={activeCategory?.mode === "auto"}
            />
          </div>
        </>
      )}

      {/* Sync Drawer */}
      <SyncDrawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
        selectedClientIds={[]}
      />
    </div>
  );
};
