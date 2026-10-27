"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Building2,
  ExternalLink,
  RefreshCw,
  ArrowUpRight,
  Loader2,
  Filter,
} from "lucide-react";
import { GlobalDsc } from "@/data/crmData";
import { clientApi } from "@/services/clientApi";

// Palette for avatar badges
const AVATAR_PALETTE = [
  "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
];

function getAvatarBadge(name: string, index: number) {
  const picked = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  const initials =
    name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "DS";

  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${picked}`}
    >
      {initials}
    </div>
  );
}

function getExpiryMeta(expiryStr?: string) {
  if (!expiryStr || expiryStr === "-") {
    return { isExpired: false, isExpiringSoon: false, daysLeft: null, label: "-" };
  }
  const parsed = new Date(expiryStr);
  if (isNaN(parsed.getTime())) {
    return { isExpired: false, isExpiringSoon: false, daysLeft: null, label: expiryStr };
  }
  const now = new Date();
  const diffMs = parsed.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    isExpired: diffDays < 0,
    isExpiringSoon: diffDays >= 0 && diffDays <= 30,
    daysLeft: diffDays,
    label: expiryStr,
  };
}

export const GlobalDscPage: React.FC = () => {
  const router = useRouter();
  const [dscs, setDscs] = useState<GlobalDsc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Expired" | "ExpiringSoon">("All");
  const [locationFilter, setLocationFilter] = useState<string>("All");

  const fetchDscs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await clientApi.getAllGlobalDscs();
      if (res && res.data) {
        setDscs(res.data);
      } else {
        setDscs([]);
      }
    } catch (err: any) {
      console.error("Failed to load global DSCs:", err);
      setErrorMessage(err.message || "Failed to load Digital Signature Certificates.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDscs();
  }, [fetchDscs]);

  // Aggregate statistics
  const stats = useMemo(() => {
    let total = dscs.length;
    let active = 0;
    let expired = 0;
    let expiringSoon = 0;

    dscs.forEach((dsc) => {
      const meta = getExpiryMeta(dsc.expiryDate);
      if (meta.isExpired || dsc.status === "Expired") {
        expired++;
      } else {
        active++;
        if (meta.isExpiringSoon) {
          expiringSoon++;
        }
      }
    });

    return { total, active, expired, expiringSoon };
  }, [dscs]);

  // Unique locations for filter dropdown
  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    dscs.forEach((d) => {
      if (d.location && d.location !== "-") set.add(d.location);
    });
    return Array.from(set);
  }, [dscs]);

  // Filtered DSCs
  const filteredDscs = useMemo(() => {
    return dscs.filter((dsc) => {
      const meta = getExpiryMeta(dsc.expiryDate);

      // Status filter
      if (statusFilter === "Active") {
        if (dsc.status === "Expired" || meta.isExpired) return false;
      } else if (statusFilter === "Expired") {
        if (dsc.status !== "Expired" && !meta.isExpired) return false;
      } else if (statusFilter === "ExpiringSoon") {
        if (!meta.isExpiringSoon) return false;
      }

      // Location filter
      if (locationFilter !== "All" && dsc.location !== locationFilter) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = dsc.name?.toLowerCase().includes(q);
        const matchesId = dsc.dscId?.toLowerCase().includes(q);
        const matchesClient = dsc.clientName?.toLowerCase().includes(q);
        const matchesVendor = dsc.vendor?.toLowerCase().includes(q);
        const matchesBin = dsc.binNumber?.toLowerCase().includes(q);
        const matchesLocation = dsc.location?.toLowerCase().includes(q);

        return matchesName || matchesId || matchesClient || matchesVendor || matchesBin || matchesLocation;
      }

      return true;
    });
  }, [dscs, statusFilter, locationFilter, search]);

  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-4 md:p-6 bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-[#31719B] dark:text-blue-300 flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Global Digital Signature (DSC) Management
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Centralized registry of all Digital Signature Certificates registered across all clients
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDscs(true)}
            disabled={isRefreshing}
            className="h-9 px-3.5 rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
            title="Refresh DSC list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#31719B]" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total DSCs */}
        <div
          onClick={() => setStatusFilter("All")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === "All"
              ? "border-[#31719B] bg-blue-50/40 dark:bg-blue-950/20 shadow-xs"
              : "border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:border-gray-400"
          }`}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">
            <span>Total DSCs</span>
            <KeyRound className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          <p className="text-[11px] text-gray-400 mt-1">Across all active clients</p>
        </div>

        {/* Active DSCs */}
        <div
          onClick={() => setStatusFilter("Active")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === "Active"
              ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs"
              : "border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:border-gray-400"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-1">
            <span>Active Tokens</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</div>
          <p className="text-[11px] text-gray-400 mt-1">Valid and operational</p>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={() => setStatusFilter("ExpiringSoon")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === "ExpiringSoon"
              ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs"
              : "border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:border-gray-400"
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-medium mb-1">
            <span>Expiring &le; 30 Days</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.expiringSoon}</div>
          <p className="text-[11px] text-gray-400 mt-1">Renewal required soon</p>
        </div>

        {/* Expired */}
        <div
          onClick={() => setStatusFilter("Expired")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === "Expired"
              ? "border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs"
              : "border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:border-gray-400"
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-medium mb-1">
            <span>Expired Tokens</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">{stats.expired}</div>
          <p className="text-[11px] text-gray-400 mt-1">Needs immediate re-issue</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>Certificates</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {filteredDscs.length}
              </span>
            </h2>

            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search DSC, Holder, Client, Vendor..."
                className="h-8 w-full rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] pl-8 pr-3 text-xs text-gray-900 dark:text-white outline-none focus:border-[#31719B] transition-colors"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center rounded-md border border-[#dde2e8] dark:border-[#334155] p-0.5 bg-gray-50 dark:bg-[#0f172a]">
              {(
                [
                  { id: "All", label: "All" },
                  { id: "Active", label: "Active" },
                  { id: "ExpiringSoon", label: "Expiring" },
                  { id: "Expired", label: "Expired" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`h-7 px-3 rounded text-xs font-semibold cursor-pointer transition-all ${
                    statusFilter === f.id
                      ? "bg-blue-100 text-[#31719B] dark:bg-blue-950/60 dark:text-blue-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Location Filter */}
            {uniqueLocations.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Filter className="w-3 h-3 text-gray-400" />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="h-8 rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-2.5 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-[#31719B]"
                >
                  <option value="All">All Locations</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => fetchDscs(true)}
              className="font-bold underline hover:no-underline cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto scrollbar-slim">
          <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300"
                style={{ backgroundColor: "var(--orange-havy-light, #f8fafc)" }}
              >
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  DSC ID
                </th>
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Holder Name
                </th>
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Client
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Issued Date
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Expiry Date
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Bin No.
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Vendor
                </th>
                <th className="px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Class
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Location
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Status
                </th>
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Remarks
                </th>
                <th className="w-16 px-3 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#31719B]" />
                      <span className="text-xs font-medium">Fetching global Digital Signature Certificates...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDscs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <KeyRound className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      <span className="font-semibold text-gray-600 dark:text-gray-300 text-sm">
                        No Digital Signature Certificates Found
                      </span>
                      <span className="text-xs text-gray-400 max-w-sm">
                        {search || statusFilter !== "All" || locationFilter !== "All"
                          ? "No DSC matches your current filter criteria. Try clearing search or filters."
                          : "No DSCs have been registered in client profiles yet."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDscs.map((dsc, idx) => {
                  const meta = getExpiryMeta(dsc.expiryDate);
                  const isExp = meta.isExpired || dsc.status === "Expired";

                  return (
                    <tr
                      key={dsc.id || `${dsc.clientId}-${dsc.dscId || idx}`}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      {/* DSC ID */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-mono text-gray-700 dark:text-gray-300 font-medium">
                        {dsc.dscId || `#S${idx + 100}`}
                      </td>

                      {/* Holder Name + Avatar */}
                      <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          {getAvatarBadge(dsc.name, idx)}
                          <span className="font-semibold">{dsc.name}</span>
                        </div>
                      </td>

                      {/* Client (Clickable navigation link) */}
                      <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                        <Link
                          href={`/client/${dsc.clientId}`}
                          className="font-semibold text-[#31719B] dark:text-blue-400 hover:underline flex items-center gap-1.5 group/link"
                          title={`Navigate to client: ${dsc.clientName}`}
                        >
                          <Building2 className="w-3.5 h-3.5 text-gray-400 group-hover/link:text-[#31719B] dark:group-hover/link:text-blue-400 shrink-0" />
                          <span className="truncate max-w-[170px]">{dsc.clientName || "Unnamed Client"}</span>
                          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
                        </Link>
                      </td>

                      {/* Issued Date */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                        {dsc.issuedDate || "-"}
                      </td>

                      {/* Expiry Date */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-medium ${
                              isExp
                                ? "text-rose-600 dark:text-rose-400"
                                : meta.isExpiringSoon
                                ? "text-amber-600 dark:text-amber-400 font-semibold"
                                : "text-gray-600 dark:text-gray-300"
                            }`}
                          >
                            {meta.label}
                          </span>
                          {meta.isExpiringSoon && !isExp && (
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              {meta.daysLeft}d left
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Bin Number */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                        {dsc.binNumber || "-"}
                      </td>

                      {/* Vendor */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                        {dsc.vendor || "-"}
                      </td>

                      {/* Class */}
                      <td className="px-3 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300 font-medium">
                        {dsc.class || "-"}
                      </td>

                      {/* Location */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                        {dsc.location || "-"}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${
                            isExp
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                          }`}
                        >
                          {isExp ? "Expired" : "Active"}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300 max-w-xs truncate">
                        {dsc.remarks || "-"}
                      </td>

                      {/* Action */}
                      <td className="px-3 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                        <Link
                          href={`/client/${dsc.clientId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#31719B] dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          title="Open Client Profile"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
