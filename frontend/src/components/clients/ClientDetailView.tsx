"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Edit,
  Plus,
  MoreVertical,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  FileSpreadsheet,
  KeyRound,
  Award,
  ArrowLeftRight,
  ShieldCheck,
  StickyNote,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  User,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";
import { Client, ClientLicense, ClientDsc, ClientDocumentInOut, ClientServiceSetting, ClientPassword, ClientNote } from "@/data/crmData";
import { clientApi } from "@/services/clientApi";
import { taskApi } from "@/services/taskApi";
import { TaskItem } from "@/data/taskData";
import { AddLicenseModal } from "./modals/AddLicenseModal";
import { AddDocumentInOutModal } from "./modals/AddDocumentInOutModal";
import { AddDscModal } from "./modals/AddDscModal";
import { AddPasswordModal } from "./modals/AddPasswordModal";
import { AddNoteModal } from "./modals/AddNoteModal";

export type ClientTabType =
  | "Master"
  | "IT"
  | "Contacts"
  | "Assignee"
  | "SLA"
  | "Tasks"
  | "Invoices"
  | "Ledger"
  | "Recurring"
  | "Compliance"
  | "Notes"
  | "Passwords"
  | "Licenses"
  | "DSC"
  | "Documents"
  | "Group"
  | "Service Settings";

export const CLIENT_TABS: ClientTabType[] = [
  "Master",
  "IT",
  "Contacts",
  "Assignee",
  "SLA",
  "Tasks",
  "Invoices",
  "Ledger",
  "Recurring",
  "Compliance",
  "Notes",
  "Passwords",
  "Licenses",
  "DSC",
  "Documents",
  "Group",
  "Service Settings",
];

interface ClientDetailViewProps {
  client: Client;
  initialTab?: ClientTabType;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onClientUpdated?: (client: Client) => void;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client: initialClient,
  initialTab = "Service Settings",
  onClose,
  onEdit,
  onClientUpdated,
}) => {
  const [client, setClient] = useState<Client>(initialClient);
  const [activeTab, setActiveTab] = useState<ClientTabType>(initialTab);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Quick Add Dropdown Menu
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Modals
  const [isAddLicenseOpen, setIsAddLicenseOpen] = useState(false);
  const [isAddDocInOutOpen, setIsAddDocInOutOpen] = useState(false);
  const [isAddDscOpen, setIsAddDscOpen] = useState(false);
  const [isAddPasswordOpen, setIsAddPasswordOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  // Service Settings Tab State
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<"All" | "Enabled">("All");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Client Tasks State
  const [clientTasks, setClientTasks] = useState<TaskItem[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Passwords show/hide
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Reload client from backend to stay in sync
  const reloadClientData = useCallback(async () => {
    if (!client.id) return;
    setIsRefreshing(true);
    try {
      const res = await clientApi.getClientById(client.id);
      if (res.data) {
        setClient(res.data);
        onClientUpdated?.(res.data);
      }
    } catch (err) {
      console.error("Error refreshing client data:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [client.id, onClientUpdated]);

  // Fetch client tasks when switching to Tasks tab
  useEffect(() => {
    if (activeTab === "Tasks" && client.id) {
      setIsLoadingTasks(true);
      taskApi
        .getTasks({ clientId: client.id, limit: 50 })
        .then((res) => {
          if (res.data) setClientTasks(res.data);
        })
        .catch((err) => console.error("Error fetching client tasks:", err))
        .finally(() => setIsLoadingTasks(false));
    }
  }, [activeTab, client.id]);

  // Toggle category collapse in Service Settings
  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Toggle compliance switch for single service
  const handleToggleServiceCompliance = async (settingId: string, currentVal: boolean) => {
    const updated = (client.serviceSettings || []).map((s) =>
      s.id === settingId || (s as any)._id === settingId ? { ...s, compliance: !currentVal } : s
    );
    setClient((prev) => ({ ...prev, serviceSettings: updated }));
    try {
      const res = await clientApi.updateServiceSettings(client.id, updated);
      if (res.data) setClient(res.data);
      showToast("Service compliance updated.");
    } catch (err: any) {
      showToast(err.message || "Failed to update service compliance.");
      reloadClientData();
    }
  };

  // Toggle compliance for whole category
  const handleToggleCategoryCompliance = async (catName: string, items: ClientServiceSetting[]) => {
    const allEnabled = items.every((x) => x.compliance);
    const targetState = !allEnabled;
    const updated = (client.serviceSettings || []).map((s) =>
      s.category === catName ? { ...s, compliance: targetState } : s
    );
    setClient((prev) => ({ ...prev, serviceSettings: updated }));
    try {
      const res = await clientApi.updateServiceSettings(client.id, updated);
      if (res.data) setClient(res.data);
      showToast(`Category "${catName}" compliance updated.`);
    } catch (err: any) {
      showToast(err.message || "Failed to update category.");
      reloadClientData();
    }
  };

  // Delete License
  const handleDeleteLicense = async (licId: string, licName: string) => {
    if (!window.confirm(`Delete license "${licName}"?`)) return;
    try {
      const res = await clientApi.deleteLicense(client.id, licId);
      if (res.data) setClient(res.data);
      showToast(`License "${licName}" deleted.`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete license.");
    }
  };

  // Delete Document Movement
  const handleDeleteDocMovement = async (docId: string, docName: string) => {
    if (!window.confirm(`Delete record for "${docName}"?`)) return;
    try {
      const res = await clientApi.deleteDocumentInOut(client.id, docId);
      if (res.data) setClient(res.data);
      showToast(`Document movement deleted.`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete document movement.");
    }
  };

  // Delete DSC
  const handleDeleteDsc = async (dscId: string, name: string) => {
    if (!window.confirm(`Delete digital signature for "${name}"?`)) return;
    try {
      const res = await clientApi.deleteDsc(client.id, dscId);
      if (res.data) setClient(res.data);
      showToast(`Digital signature removed.`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete DSC.");
    }
  };

  // Delete Password
  const handleDeletePassword = async (pwdId: string, portal: string) => {
    if (!window.confirm(`Delete credential for "${portal}"?`)) return;
    try {
      const res = await clientApi.deletePassword(client.id, pwdId);
      if (res.data) setClient(res.data);
      showToast(`Credential for "${portal}" removed.`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete credential.");
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm("Delete this client note?")) return;
    try {
      const res = await clientApi.deleteNote(client.id, noteId);
      if (res.data) setClient(res.data);
      showToast("Note deleted.");
    } catch (err: any) {
      showToast(err.message || "Failed to delete note.");
    }
  };

  // Helper avatar generator with distinct harmonious soft colors
  const getAvatarBadge = (text: string, index: number) => {
    const palette = [
      { bg: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300" },
      { bg: "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300" },
      { bg: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" },
      { bg: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" },
      { bg: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" },
      { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
    ];
    const picked = palette[index % palette.length];
    const initials = text
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CL";

    return (
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${picked.bg}`}
      >
        {initials}
      </div>
    );
  };

  // Grouped service settings
  const groupedServices = useMemo(() => {
    const list = client.serviceSettings || [];
    const filtered = list.filter((item) => {
      if (serviceFilter === "Enabled" && !item.compliance) return false;
      if (serviceSearch.trim()) {
        const q = serviceSearch.toLowerCase();
        return (
          item.serviceName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const groups: Record<string, ClientServiceSetting[]> = {};
    filtered.forEach((item) => {
      const cat = item.category || "General Services";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [client.serviceSettings, serviceSearch, serviceFilter]);

  return (
    <div className="w-full flex flex-col space-y-4 animate-in fade-in duration-200">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-60 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border border-[#31719B]/30 bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white animate-in slide-in-from-top-2 duration-200">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Top Client Header Bar matching Screenshots 1-4 */}
      <div className="bg-white dark:bg-[#1e293b] border-b border-[#dde2e8] dark:border-[#334155] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        {/* Client Name & Status Pill */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold shadow-xs"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
          >
            {client.name?.[0] || "C"}
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              {client.legalName || client.name}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                client.active !== false
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {client.active !== false ? "Active" : "Inactive"}
            </span>
            {client.fileNo && (
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                #{client.fileNo}
              </span>
            )}
            {isRefreshing && (
              <Loader2 className="w-4 h-4 animate-spin text-[#31719B]" />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Edit Button */}
          <button
            type="button"
            onClick={() => onEdit(client)}
            className="h-9 px-4 rounded-md text-xs font-semibold border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Edit
          </button>

          {/* + Add Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="h-9 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
            </button>

            {isAddMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-52 rounded-xl shadow-xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] py-1.5 z-40 text-xs font-medium text-gray-700 dark:text-gray-300 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setIsAddMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setIsAddLicenseOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-purple-600" />
                  <span>Add License</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setIsAddDocInOutOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
                  <span>Record Document Movement</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setIsAddDscOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Add Digital Signature (DSC)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setIsAddPasswordOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Add Portal Credential</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setIsAddNoteOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
                >
                  <StickyNote className="w-4 h-4 text-rose-600" />
                  <span>Add Client Note</span>
                </button>
              </div>
            )}
          </div>

          {/* More Options */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="h-9 w-9 flex items-center justify-center rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {isMoreMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-44 rounded-xl shadow-xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] py-1 z-40 text-xs font-medium text-gray-700 dark:text-gray-300"
                onMouseLeave={() => setIsMoreMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    reloadClientData();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Refresh Data
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    window.print();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Print Client Dossier
                </button>
              </div>
            )}
          </div>

          {/* Close Button X */}
          <button
            type="button"
            onClick={onClose}
            title="Close Client View"
            className="h-9 w-9 flex items-center justify-center rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 17 Sub-Tabs Navigation Bar matching Screenshots */}
      <div className="bg-white dark:bg-[#1e293b] border-b border-[#dde2e8] dark:border-[#334155] px-6">
        <div className="flex items-center space-x-6 overflow-x-auto scrollbar-none py-1">
          {CLIENT_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-xs whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${
                  isActive
                    ? "border-[#7c3aed] text-[#7c3aed] dark:text-[#a78bfa] font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div className="px-6 py-2">
        {/* ======================================================== */}
        {/* TAB 1: SERVICE SETTINGS (Screenshot 1) */}
        {/* ======================================================== */}
        {activeTab === "Service Settings" && (
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Services ({client.serviceSettings?.length || 0})
              </h2>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Search service..."
                    className="h-8 w-full rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] pl-8 pr-3 text-xs text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
                  />
                </div>

                {/* Filters */}
                <div className="flex items-center rounded-md border border-[#dde2e8] dark:border-[#334155] p-0.5 bg-gray-50 dark:bg-[#0f172a]">
                  <button
                    type="button"
                    onClick={() => setServiceFilter("Enabled")}
                    className={`h-7 px-3 rounded text-xs font-semibold cursor-pointer transition-all ${
                      serviceFilter === "Enabled"
                        ? "bg-white dark:bg-[#1e293b] shadow-xs text-purple-700 dark:text-purple-300"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Enabled
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceFilter("All")}
                    className={`h-7 px-3 rounded text-xs font-semibold cursor-pointer transition-all ${
                      serviceFilter === "All"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 shadow-xs"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>
            </div>

            {/* Service Settings Table */}
            <div className="overflow-x-auto scrollbar-slim">
              <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
                <thead>
                  <tr
                    className="text-gray-700 dark:text-gray-300"
                    style={{ backgroundColor: "var(--orange-havy-light)" }}
                  >
                    <th className="w-12 px-3 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center font-semibold">
                      Compliance
                    </th>
                    <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Service
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Rec. Task
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Rec. Invoice
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Frequency
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Start
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Target
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      End
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Inv. Freq
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Inv. Day
                    </th>
                    <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-right">
                      Amount
                    </th>
                    <th className="w-10 px-2 py-3 border-b border-[#dde2e8] dark:border-[#334155]"></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(groupedServices).length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-gray-400 font-medium">
                        No services configured for this client.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedServices).map(([category, items]) => {
                      const isCollapsed = collapsedCategories[category];
                      const allCategoryCompliance = items.every((x) => x.compliance);

                      return (
                        <React.Fragment key={category}>
                          {/* Category Group Header Row */}
                          <tr className="bg-gray-50/70 dark:bg-gray-800/40 hover:bg-gray-100/60 transition-colors">
                            <td className="px-3 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                              <input
                                type="checkbox"
                                checked={allCategoryCompliance}
                                onChange={() => handleToggleCategoryCompliance(category, items)}
                                className="w-4 h-4 rounded text-[#7c3aed] accent-[#7c3aed] cursor-pointer"
                              />
                            </td>
                            <td
                              colSpan={10}
                              className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-bold text-gray-900 dark:text-white"
                            >
                              <div className="flex items-center gap-2">
                                <span>{category}</span>
                                <span className="text-[11px] font-normal text-gray-500">
                                  ({items.length} {items.length === 1 ? "service" : "services"})
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                              <button
                                type="button"
                                onClick={() => toggleCategory(category)}
                                className="text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer"
                              >
                                {isCollapsed ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronUp className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Category Items */}
                          {!isCollapsed &&
                            items.map((svc) => (
                              <tr
                                key={svc.id || svc.serviceName}
                                className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                              >
                                {/* Toggle switch */}
                                <td className="px-3 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(svc.compliance)}
                                    onChange={() =>
                                      handleToggleServiceCompliance(svc.id || "", svc.compliance)
                                    }
                                    className="w-4 h-4 rounded text-[#7c3aed] accent-[#7c3aed] cursor-pointer"
                                  />
                                </td>

                                {/* Service Name */}
                                <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-medium text-gray-900 dark:text-white">
                                  {svc.serviceName}
                                </td>

                                {/* Rec. Task */}
                                <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                      svc.recTask === "Enabled"
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    }`}
                                  >
                                    {svc.recTask || "Disabled"}
                                  </span>
                                </td>

                                {/* Rec. Invoice */}
                                <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                      svc.recInvoice === "Enabled"
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    }`}
                                  >
                                    {svc.recInvoice || "Disabled"}
                                  </span>
                                </td>

                                {/* Frequency */}
                                <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                      svc.frequency === "Quarterly"
                                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                        : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                                    }`}
                                  >
                                    {svc.frequency || "Monthly"}
                                  </span>
                                </td>

                                {/* Start, Target, End */}
                                <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                                  {svc.start || "-"}
                                </td>
                                <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                                  {svc.target || "-"}
                                </td>
                                <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                                  {svc.end || "-"}
                                </td>

                                {/* Inv Freq */}
                                <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                                  {svc.invFreq ? (
                                    <span
                                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                        svc.invFreq === "Quarterly"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                          : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                                      }`}
                                    >
                                      {svc.invFreq}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>

                                {/* Inv Day */}
                                <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                                  {svc.invDay ?? "—"}
                                </td>

                                {/* Amount */}
                                <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-right text-gray-900 dark:text-white">
                                  {svc.amount > 0
                                    ? `₹${svc.amount.toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}`
                                    : "—"}
                                </td>

                                {/* Row expand/menu */}
                                <td className="px-2 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-pointer" />
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: LICENSES (Screenshot 2) */}
        {/* ======================================================== */}
        {activeTab === "Licenses" && (
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Licenses
              </h2>
              <button
                type="button"
                onClick={() => setIsAddLicenseOpen(true)}
                className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto scrollbar-slim">
              <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
                <thead>
                  <tr
                    className="text-gray-700 dark:text-gray-300"
                    style={{ backgroundColor: "var(--orange-havy-light)" }}
                  >
                    <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Name
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      License No
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Issued Date
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Expiry Date
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      URL
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-center">
                      Files
                    </th>
                    <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Remarks
                    </th>
                    <th className="w-12 px-2 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!client.licenses || client.licenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                        No licenses recorded. Click "+ Add" to add a client license.
                      </td>
                    </tr>
                  ) : (
                    client.licenses.map((lic, index) => (
                      <tr
                        key={lic.id || index}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                      >
                        {/* Name + Avatar */}
                        <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            {getAvatarBadge(lic.name, index)}
                            <span>{lic.name}</span>
                          </div>
                        </td>

                        {/* License No */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-mono text-gray-600 dark:text-gray-300">
                          {lic.licenseNo || "-"}
                        </td>

                        {/* Issued Date */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {lic.issuedDate || "-"}
                        </td>

                        {/* Expiry Date */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {lic.expiryDate || "-"}
                        </td>

                        {/* URL */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {lic.url && lic.url !== "-" ? (
                            <a
                              href={lic.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#31719B] hover:underline flex items-center gap-1"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* Files */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                          {lic.file ? (
                            <span
                              className={`inline-flex items-center justify-center p-1 rounded ${
                                lic.file === "xls"
                                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                                  : "text-rose-600 bg-rose-50 dark:bg-rose-950/40"
                              }`}
                              title={lic.file.toUpperCase()}
                            >
                              {lic.file === "xls" ? (
                                <FileSpreadsheet className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* Remarks */}
                        <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {lic.remarks || "-"}
                        </td>

                        {/* Action */}
                        <td className="px-2 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteLicense(lic.id || "", lic.name)}
                            title="Delete License"
                            className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination */}
            <div className="p-3 border-t border-[#dde2e8] dark:border-[#334155] flex items-center justify-end gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">50</span>
              </div>
              <span>
                1-{client.licenses?.length || 0} of {client.licenses?.length || 0}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  className="p-1 rounded opacity-50 cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled
                  className="p-1 rounded opacity-50 cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: DOCUMENTS (Document In - Out) (Screenshot 3) */}
        {/* ======================================================== */}
        {activeTab === "Documents" && (
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Document In - Out
              </h2>
              <button
                type="button"
                onClick={() => setIsAddDocInOutOpen(true)}
                className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto scrollbar-slim">
              <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
                <thead>
                  <tr
                    className="text-gray-700 dark:text-gray-300"
                    style={{ backgroundColor: "var(--orange-havy-light)" }}
                  >
                    <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Document Name
                    </th>
                    <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Person Name
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Date
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Status
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Returnable
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Return Date
                    </th>
                    <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Remarks
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-center">
                      Files
                    </th>
                    <th className="w-12 px-2 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!client.documentsInOut || client.documentsInOut.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400 font-medium">
                        No document movements logged. Click "+ Add" to record a document movement.
                      </td>
                    </tr>
                  ) : (
                    client.documentsInOut.map((doc, idx) => (
                      <tr
                        key={doc.id || idx}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                      >
                        {/* Document Name + Avatar */}
                        <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            {getAvatarBadge(doc.documentName, idx)}
                            <span>{doc.documentName}</span>
                          </div>
                        </td>

                        {/* Person Name + Avatar */}
                        <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300">
                          {doc.personName && doc.personName !== "-" ? (
                            <div className="flex items-center gap-2">
                              {getAvatarBadge(doc.personName, idx + 3)}
                              <span>{doc.personName}</span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {doc.date || "-"}
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                              doc.status === "In"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {doc.status}
                          </span>
                        </td>

                        {/* Returnable */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              doc.returnable === "Yes" || doc.returnable === true
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {doc.returnable === true || doc.returnable === "Yes" ? "Yes" : "No"}
                          </span>
                        </td>

                        {/* Return Date */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {doc.returnDate || "-"}
                        </td>

                        {/* Remarks */}
                        <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300 max-w-xs truncate">
                          {doc.remarks || "-"}
                        </td>

                        {/* Files */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-center">
                          {doc.file ? (
                            <span className="inline-flex p-1 rounded text-rose-600 bg-rose-50 dark:bg-rose-950/40">
                              <FileText className="w-4 h-4" />
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-2 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteDocMovement(doc.id || "", doc.documentName)}
                            title="Delete Movement"
                            className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: DSC (Digital Signatures) (Screenshot 4) */}
        {/* ======================================================== */}
        {activeTab === "DSC" && (
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Digital Signatures
              </h2>
              <button
                type="button"
                onClick={() => setIsAddDscOpen(true)}
                className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto scrollbar-slim">
              <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
                <thead>
                  <tr
                    className="text-gray-700 dark:text-gray-300"
                    style={{ backgroundColor: "var(--orange-havy-light)" }}
                  >
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      ID
                    </th>
                    <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Name
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Issued Date
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Expiry Date
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Bin Number
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Vendor
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Class
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Location
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Status
                    </th>
                    <th className="w-12 px-2 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!client.dscs || client.dscs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-gray-400 font-medium">
                        No digital signatures registered. Click "+ Add" to register a DSC.
                      </td>
                    </tr>
                  ) : (
                    client.dscs.map((dsc, idx) => (
                      <tr
                        key={dsc.id || idx}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                      >
                        {/* ID */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-mono font-medium text-gray-700 dark:text-gray-300">
                          {dsc.dscId || dsc.id || `#S001${80 + idx}`}
                        </td>

                        {/* Name + Avatar */}
                        <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            {getAvatarBadge(dsc.name, idx + 1)}
                            <span>{dsc.name}</span>
                          </div>
                        </td>

                        {/* Issued Date */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {dsc.issuedDate || "-"}
                        </td>

                        {/* Expiry Date */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {dsc.expiryDate || "-"}
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
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {dsc.class || "-"}
                        </td>

                        {/* Location */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                              dsc.location === "Missing"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : dsc.location === "Client Office"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                            }`}
                          >
                            {dsc.location}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                              dsc.status === "Active"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            }`}
                          >
                            {dsc.status}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-2 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteDsc(dsc.id || "", dsc.name)}
                            title="Delete DSC"
                            className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination */}
            <div className="p-3 border-t border-[#dde2e8] dark:border-[#334155] flex items-center justify-end gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">50</span>
              </div>
              <span>
                1-{client.dscs?.length || 0} of {client.dscs?.length || 0}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  className="p-1 rounded opacity-50 cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled
                  className="p-1 rounded opacity-50 cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: MASTER */}
        {/* ======================================================== */}
        {activeTab === "Master" && (
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 shadow-card space-y-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                Entity Master Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block font-medium">
                    Legal / Business Name
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {client.legalName || client.name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block font-medium">
                    Constitution Type
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white capitalize">
                    {client.type?.replace("-", " ") || "Private Limited"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block font-medium">
                    Client Group
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {client.group || "Default Group"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block font-medium">
                    File Number
                  </span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">
                    #{client.fileNo}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block font-medium">
                    PAN
                  </span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">
                    {client.pan || "ATVOO38723"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block font-medium">
                    Primary Mobile
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {client.mobile}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block font-medium">
                    Primary Email
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {client.email || "accounts@turia.com"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block font-medium">
                    City & State
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {client.city ? `${client.city}, ${client.state}` : "Mumbai, Maharashtra"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block font-medium">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(client.tags || ["Corporate", "Audit"]).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold text-[10px]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="pt-4 border-t border-[#dde2e8] dark:border-[#334155]">
              <span className="text-gray-500 dark:text-gray-400 block font-medium text-xs mb-1">
                Registered Office Address
              </span>
              <p className="text-xs text-gray-800 dark:text-gray-200">
                {client.address || "Plot No 44, MIDC Industrial Area, Andheri East, Mumbai 400093"}
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: TASKS */}
        {/* ======================================================== */}
        {activeTab === "Tasks" && (
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
            <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Client Tasks ({clientTasks.length})
              </h2>
            </div>
            {isLoadingTasks ? (
              <div className="py-16 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#31719B]" />
                <span className="text-xs text-gray-500 mt-2 block">Loading client tasks...</span>
              </div>
            ) : clientTasks.length === 0 ? (
              <div className="py-16 text-center text-gray-400 font-medium text-xs">
                No tasks assigned to this client yet.
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-slim">
                <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
                  <thead>
                    <tr
                      className="text-gray-700 dark:text-gray-300"
                      style={{ backgroundColor: "var(--orange-havy-light)" }}
                    >
                      <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                        Task Name
                      </th>
                      <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                        Service
                      </th>
                      <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                        Status
                      </th>
                      <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                        Priority
                      </th>
                      <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                        Due Date
                      </th>
                      <th className="px-4 py-3 border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                        Assignee
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientTasks.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                      >
                        <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-gray-900 dark:text-white">
                          {t.taskName}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {t.serviceName || "-"}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            {t.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              t.priority === "High" || t.priority === "Urgent"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {t.targetDueDate || t.endDate || "-"}
                        </td>
                        <td className="px-4 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-gray-800 dark:text-gray-200">
                          {t.assigneeName || "Dipak Sahani"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: PASSWORDS */}
        {/* ======================================================== */}
        {activeTab === "Passwords" && (
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
            <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  Statutory Portal Credentials
                </h2>
                <p className="text-xs text-gray-500">
                  Secure vault for Income Tax, GST, MCA, and TRACES logins
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPasswordOpen(true)}
                className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Credential</span>
              </button>
            </div>

            <div className="overflow-x-auto scrollbar-slim">
              <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
                <thead>
                  <tr
                    className="text-gray-700 dark:text-gray-300"
                    style={{ backgroundColor: "var(--orange-havy-light)" }}
                  >
                    <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Portal
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      User ID / Login ID
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Password
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      URL
                    </th>
                    <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Remarks
                    </th>
                    <th className="w-12 px-2 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!client.passwords || client.passwords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                        No credentials stored. Click "+ Add Credential" to save portal login details.
                      </td>
                    </tr>
                  ) : (
                    client.passwords.map((pwd, idx) => {
                      const isRevealed = revealedPasswords[pwd.id || idx];
                      return (
                        <tr
                          key={pwd.id || idx}
                          className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                        >
                          <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-gray-900 dark:text-white">
                            {pwd.portal}
                          </td>
                          <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-mono font-medium text-gray-700 dark:text-gray-300">
                            {pwd.userId || (pwd as any).username || "-"}
                          </td>
                          <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-mono">
                            <div className="flex items-center gap-2">
                              <span>{isRevealed ? pwd.password : "••••••••••••"}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedPasswords((prev) => ({
                                    ...prev,
                                    [pwd.id || idx]: !isRevealed,
                                  }))
                                }
                                className="text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                            {pwd.url && pwd.url !== "-" ? (
                              <a
                                href={pwd.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#31719B] hover:underline flex items-center gap-1"
                              >
                                <span>Login</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                            {pwd.remarks || "-"}
                          </td>
                          <td className="px-2 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                            <button
                              type="button"
                              onClick={() => handleDeletePassword(pwd.id || "", pwd.portal)}
                              title="Delete Credential"
                              className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 8: NOTES */}
        {/* ======================================================== */}
        {activeTab === "Notes" && (
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
            <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Client Notes & Observations
              </h2>
              <button
                type="button"
                onClick={() => setIsAddNoteOpen(true)}
                className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Note</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!client.notes || client.notes.length === 0 ? (
                <div className="py-12 text-center text-gray-400 font-medium text-xs">
                  No internal notes recorded. Click "+ Add Note" to create one.
                </div>
              ) : (
                client.notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl border border-[#dde2e8] dark:border-[#334155] bg-gray-50/50 dark:bg-gray-800/30 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                          {note.title}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {note.createdAt
                            ? new Date(note.createdAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : ""}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                        {note.content}
                      </p>
                      <span className="text-[10px] text-gray-400 font-medium block">
                        Logged by {note.author || "Dipak Sahani"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id || "")}
                      title="Delete Note"
                      className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 9: CONTACTS */}
        {/* ======================================================== */}
        {activeTab === "Contacts" && (
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
            <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155]">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Promoters & Key Contacts
              </h2>
            </div>
            <div className="overflow-x-auto scrollbar-slim">
              <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
                <thead>
                  <tr
                    className="text-gray-700 dark:text-gray-300"
                    style={{ backgroundColor: "var(--orange-havy-light)" }}
                  >
                    <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Name
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Designation
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Mobile
                    </th>
                    <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      Email
                    </th>
                    <th className="px-3.5 py-3 border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                      DIN / PAN
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(client.promoters || client.customerFiles?.promoter) &&
                  (client.promoters || client.customerFiles?.promoter)!.length > 0 ? (
                    (client.promoters || client.customerFiles?.promoter)!.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            {getAvatarBadge(p.name || p.fullName || "Contact", idx)}
                            <span>{p.name || p.fullName}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {p.designation || "Director"}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {p.mobile || client.mobile}
                        </td>
                        <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                          {p.email || client.email || "-"}
                        </td>
                        <td className="px-3.5 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] font-mono text-gray-600 dark:text-gray-300">
                          {p.pan || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {getAvatarBadge(client.name, 0)}
                          <span>Authorized Signatory</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                        Managing Director
                      </td>
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                        {client.mobile}
                      </td>
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                        {client.email || "accounts@turia.com"}
                      </td>
                      <td className="px-3.5 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] font-mono text-gray-600 dark:text-gray-300">
                        {client.pan || "ATVOO38723"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* OTHER TABS (Fallback / Clean Professional Layout) */}
        {/* ======================================================== */}
        {![
          "Service Settings",
          "Licenses",
          "Documents",
          "DSC",
          "Master",
          "Tasks",
          "Passwords",
          "Notes",
          "Contacts",
        ].includes(activeTab) && (
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-8 shadow-card text-center space-y-3">
            <div
              className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {activeTab} Module
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {activeTab} records and statutory tracking configured for {client.name}.
            </p>
          </div>
        )}
      </div>

      {/* Sub-Section Modals */}
      <AddLicenseModal
        isOpen={isAddLicenseOpen}
        client={client}
        onClose={() => setIsAddLicenseOpen(false)}
        onSuccess={(updated) => {
          setClient(updated);
          onClientUpdated?.(updated);
          showToast("License added successfully.");
        }}
      />

      <AddDocumentInOutModal
        isOpen={isAddDocInOutOpen}
        client={client}
        onClose={() => setIsAddDocInOutOpen(false)}
        onSuccess={(updated) => {
          setClient(updated);
          onClientUpdated?.(updated);
          showToast("Document movement logged.");
        }}
      />

      <AddDscModal
        isOpen={isAddDscOpen}
        client={client}
        onClose={() => setIsAddDscOpen(false)}
        onSuccess={(updated) => {
          setClient(updated);
          onClientUpdated?.(updated);
          showToast("Digital signature registered.");
        }}
      />

      <AddPasswordModal
        isOpen={isAddPasswordOpen}
        client={client}
        onClose={() => setIsAddPasswordOpen(false)}
        onSuccess={(updated) => {
          setClient(updated);
          onClientUpdated?.(updated);
          showToast("Portal credential saved.");
        }}
      />

      <AddNoteModal
        isOpen={isAddNoteOpen}
        client={client}
        onClose={() => setIsAddNoteOpen(false)}
        onSuccess={(updated) => {
          setClient(updated);
          onClientUpdated?.(updated);
          showToast("Note added.");
        }}
      />
    </div>
  );
};
