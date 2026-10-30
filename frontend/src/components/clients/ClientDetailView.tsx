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
  UserCheck,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";
import { Client, ClientLicense, ClientDsc, ClientDocumentInOut, ClientServiceSetting, ClientPassword, ClientNote } from "@/data/crmData";
import { serviceApi } from "@/services/serviceApi";
import { Service } from "@/data/serviceData";
import { IosToggleSwitch } from "@/components/ui/IosToggleSwitch";
import { clientApi } from "@/services/clientApi";
import { taskApi } from "@/services/taskApi";
import { TaskItem } from "@/data/taskData";
import { ClientDetailViewTabs } from "./ClientDetailViewTabs";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { AddLicenseModal } from "./modals/AddLicenseModal";
import { AddDocumentInOutModal } from "./modals/AddDocumentInOutModal";
import { AddDscModal } from "./modals/AddDscModal";
import { AddPasswordModal } from "./modals/AddPasswordModal";
import { AddNoteModal } from "./modals/AddNoteModal";
import { ClientComplianceTab } from "@/components/compliance/ClientComplianceTab";
import { usePermission } from "@/components/team/usePermission";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";

export type ClientTabType =
  | "Master"
  | "IT"
  | "Contacts"
  | "Tasks & Assignees"
  | "Assignee"
  | "Tasks"
  | "SLA"
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
  "Tasks & Assignees",
  "SLA",
  "Invoices",
  "Ledger",
  "Recurring",
  "Compliance",
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
  initialTab = "Master",
  onClose,
  onEdit,
  onClientUpdated,
}) => {
  const { canView, canAddEdit, canDelete } = usePermission();
  const [client, setClient] = useState<Client>(initialClient);
  const [activeTab, setActiveTab] = useState<ClientTabType>(initialTab);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Quick Add Dropdown Menu
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Filter tabs dynamically based on user role and granular permissions
  const visibleTabs = useMemo(() => {
    return CLIENT_TABS.filter((tab) => {
      if (tab === "Invoices") return canView("invoice");
      if (tab === "Passwords") return canView("password");
      if (tab === "Licenses") return canView("licenses");
      if (tab === "DSC") return canView("digital_signature");
      if (tab === "Documents") return canView("document_in_out");
      if (tab === "Recurring") return canView("recurring");
      if (tab === "Ledger") return canView("billing");
      if (tab === "Compliance") return canView("compliance_tracker");
      if (tab === "Tasks" || tab === "Assignee" || tab === "Tasks & Assignees") return canView("task_manager");
      return true;
    });
  }, [canView]);

  // Modals
  const [isAddLicenseOpen, setIsAddLicenseOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<ClientLicense | null>(null);
  const [isAddDocInOutOpen, setIsAddDocInOutOpen] = useState(false);
  const [editingDocMovement, setEditingDocMovement] = useState<ClientDocumentInOut | null>(null);
  const [isAddDscOpen, setIsAddDscOpen] = useState(false);
  const [isAddPasswordOpen, setIsAddPasswordOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  // In-App Confirmation Modal
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Delete",
    onConfirm: () => {},
  });

  const promptConfirm = (
    title: string,
    message: string,
    onConfirm: () => Promise<void> | void,
    confirmText = "Delete"
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  // Service Settings Tab State
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<"All" | "Enabled">("All");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<ClientServiceSetting | null>(null);
  const [isSavingServiceOptions, setIsSavingServiceOptions] = useState(false);

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

  // Fetch client tasks when switching to Tasks or Documents tab
  const fetchClientTasks = useCallback(() => {
    if (!client.id && !client.name && !client.fileNo) return;
    setIsLoadingTasks(true);
    taskApi
      .getTasks({
        clientId: client.id,
        clientFileNo: client.fileNo,
        clientName: client.name,
        limit: 50,
      })
      .then((res) => {
        if (res.data) setClientTasks(res.data);
      })
      .catch((err) => console.error("Error fetching client tasks:", err))
      .finally(() => setIsLoadingTasks(false));
  }, [client.id, client.fileNo, client.name]);

  useEffect(() => {
    if (
      activeTab === "Tasks" ||
      activeTab === "Documents" ||
      activeTab === "Assignee" ||
      activeTab === "Tasks & Assignees"
    ) {
      fetchClientTasks();
    }
  }, [activeTab, fetchClientTasks]);

  // Dynamic Services Catalog from Services Section
  const [systemServices, setSystemServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(false);

  // Fetch real services from Services section when viewing Service Settings tab
  useEffect(() => {
    if (activeTab === "Service Settings") {
      setIsLoadingServices(true);
      serviceApi
        .getServices({ limit: 100 })
        .then((res) => {
          if (res.data) setSystemServices(res.data);
        })
        .catch((err) => console.error("Error fetching system services:", err))
        .finally(() => setIsLoadingServices(false));
    }
  }, [activeTab]);

  // Real services from Services section merged with client specific settings
  const allServices = useMemo(() => {
    const clientSettings = client.serviceSettings || [];
    const clientMap = new Map(clientSettings.map((s) => [s.serviceName.trim().toLowerCase(), s]));

    if (systemServices.length > 0) {
      const result: ClientServiceSetting[] = systemServices.map((svc) => {
        const found = clientMap.get(svc.name.trim().toLowerCase());
        if (found) {
          const active = found.isActive !== undefined ? Boolean(found.isActive) : Boolean(found.compliance);
          return {
            ...found,
            id: found.id || (found as any)._id || `ss-${svc.id}`,
            serviceId: svc.id,
            serviceName: svc.name,
            category: svc.category || found.category || "General",
            isActive: active,
            compliance: active,
            recTask: found.recTask || (active ? "Enabled" : "Disabled"),
            recInvoice: found.recInvoice || "Disabled",
            frequency: found.frequency || svc.frequency || "Monthly",
            start: found.start || "Day 1",
            target: found.target || (svc.tatDays ? `Day ${svc.tatDays}` : "Day 15"),
            end: found.end || (svc.tatDays ? `Day ${svc.tatDays + 2}` : "Day 20"),
            invFreq: found.invFreq || "Monthly",
            invDay: found.invDay !== undefined ? found.invDay : 1,
            amount: found.amount !== undefined ? found.amount : (svc.professionalFee || 0),
          };
        }

        return {
          id: `ss-${svc.id}`,
          serviceId: svc.id,
          serviceName: svc.name,
          category: svc.category || "General",
          isActive: false,
          compliance: false,
          recTask: "Disabled",
          recInvoice: "Disabled",
          frequency: svc.frequency || "Monthly",
          start: "Day 1",
          target: svc.tatDays ? `Day ${svc.tatDays}` : "Day 15",
          end: svc.tatDays ? `Day ${svc.tatDays + 2}` : "Day 20",
          invFreq: "Monthly",
          invDay: 1,
          amount: svc.professionalFee || 0,
        };
      });

      // Also preserve any client configured settings not currently in systemServices
      const systemSet = new Set(systemServices.map((s) => s.name.trim().toLowerCase()));
      for (const s of clientSettings) {
        if (!systemSet.has(s.serviceName.trim().toLowerCase())) {
          const active = s.isActive !== undefined ? Boolean(s.isActive) : Boolean(s.compliance);
          result.push({
            ...s,
            isActive: active,
            compliance: active,
          });
        }
      }

      return result;
    }

    return clientSettings.map((s) => ({
      ...s,
      isActive: s.isActive !== undefined ? Boolean(s.isActive) : Boolean(s.compliance),
      compliance: s.isActive !== undefined ? Boolean(s.isActive) : Boolean(s.compliance),
    }));
  }, [systemServices, client.serviceSettings]);

  // Filtered services based on search and Enabled/All pill filter
  const filteredServices = useMemo(() => {
    return allServices.filter((item) => {
      const isItemActive = item.isActive !== undefined ? item.isActive : item.compliance;
      if (serviceFilter === "Enabled" && !isItemActive) return false;
      if (serviceSearch.trim()) {
        const q = serviceSearch.toLowerCase();
        return (
          item.serviceName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allServices, serviceFilter, serviceSearch]);

  // Grouped service settings by category
  const groupedServices = useMemo(() => {
    const groups: Record<string, ClientServiceSetting[]> = {};
    filteredServices.forEach((item) => {
      const cat = item.category || "General Services";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredServices]);

  // Toggle category collapse in Service Settings
  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Toggle compliance switch for single service
  const handleToggleServiceCompliance = async (serviceName: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    const updated = allServices.map((s) =>
      s.serviceName.trim().toLowerCase() === serviceName.trim().toLowerCase()
        ? {
          ...s,
          isActive: nextVal,
          compliance: nextVal,
          recTask: nextVal ? (s.recTask === "Disabled" ? "Enabled" : s.recTask || "Enabled") : "Disabled",
        }
        : s
    );
    const activeNames = updated.filter((s) => s.isActive || s.compliance).map((s) => s.serviceName);

    setClient((prev) => ({
      ...prev,
      serviceSettings: updated,
      services: activeNames,
    }));

    try {
      const res = await clientApi.updateServiceSettings(client.id, updated);
      if (res.data) {
        setClient(res.data);
        onClientUpdated?.(res.data);
      }
      showToast(`Service "${serviceName}" ${nextVal ? "enabled" : "disabled"}.`);
    } catch (err: any) {
      showToast(err.message || "Failed to update service status.");
      reloadClientData();
    }
  };

  // Toggle compliance for whole category
  const handleToggleCategoryCompliance = async (catName: string, items: ClientServiceSetting[]) => {
    const allEnabled = items.every((x) => (x.isActive !== undefined ? x.isActive : x.compliance));
    const targetState = !allEnabled;
    const updated = allServices.map((s) =>
      s.category.trim().toLowerCase() === catName.trim().toLowerCase()
        ? {
          ...s,
          isActive: targetState,
          compliance: targetState,
          recTask: targetState ? (s.recTask === "Disabled" ? "Enabled" : s.recTask || "Enabled") : "Disabled",
        }
        : s
    );
    const activeNames = updated.filter((s) => s.isActive || s.compliance).map((s) => s.serviceName);

    setClient((prev) => ({
      ...prev,
      serviceSettings: updated,
      services: activeNames,
    }));

    try {
      const res = await clientApi.updateServiceSettings(client.id, updated);
      if (res.data) {
        setClient(res.data);
        onClientUpdated?.(res.data);
      }
      showToast(`Category "${catName}" services ${targetState ? "enabled" : "disabled"}.`);
    } catch (err: any) {
      showToast(err.message || "Failed to update category.");
      reloadClientData();
    }
  };

  // Save edited options for an expanded service
  const handleSaveServiceOptions = async (
    updatedSetting: ClientServiceSetting,
    keepDrawerOpen = false
  ) => {
    setIsSavingServiceOptions(true);
    const finalSetting = {
      ...updatedSetting,
      isActive: updatedSetting.isActive !== undefined ? updatedSetting.isActive : updatedSetting.compliance,
      compliance: updatedSetting.isActive !== undefined ? updatedSetting.isActive : updatedSetting.compliance,
    };
    const updated = allServices.map((s) =>
      s.serviceName.trim().toLowerCase() === updatedSetting.serviceName.trim().toLowerCase()
        ? finalSetting
        : s
    );
    const activeNames = updated.filter((s) => s.isActive || s.compliance).map((s) => s.serviceName);

    setClient((prev) => ({
      ...prev,
      serviceSettings: updated,
      services: activeNames,
    }));

    try {
      const res = await clientApi.updateServiceSettings(client.id, updated);
      if (res.data) {
        setClient(res.data);
        onClientUpdated?.(res.data);
      }
      if (!keepDrawerOpen) {
        setExpandedServiceId(null);
        setEditingService(null);
      } else {
        setEditingService(updatedSetting);
      }
      showToast(
        `Service "${updatedSetting.serviceName}" rate (₹${Number(
          updatedSetting.amount || 0
        ).toLocaleString()}) updated for ${client.name || "client"}.`
      );
    } catch (err: any) {
      showToast(err.message || "Failed to save service settings.");
      reloadClientData();
    } finally {
      setIsSavingServiceOptions(false);
    }
  };

  // Delete License
  const handleDeleteLicense = async (licId: string, licName: string) => {
    promptConfirm(
      "Delete License",
      `Are you sure you want to delete license "${licName}"?`,
      async () => {
        try {
          const res = await clientApi.deleteLicense(client.id, licId);
          if (res.data) setClient(res.data);
          showToast(`License "${licName}" deleted.`);
        } catch (err: any) {
          showToast(err.message || "Failed to delete license.");
        }
      }
    );
  };

  // Delete Document Movement
  const handleDeleteDocMovement = async (docId: string, docName: string) => {
    promptConfirm(
      "Delete Document Movement",
      `Are you sure you want to delete record for "${docName}"?`,
      async () => {
        try {
          const res = await clientApi.deleteDocumentInOut(client.id, docId);
          if (res.data) setClient(res.data);
          showToast(`Document movement deleted.`);
        } catch (err: any) {
          showToast(err.message || "Failed to delete document movement.");
        }
      }
    );
  };

  // Delete DSC
  const handleDeleteDsc = async (dscId: string, name: string) => {
    promptConfirm(
      "Delete Digital Signature",
      `Are you sure you want to delete digital signature for "${name}"?`,
      async () => {
        try {
          const res = await clientApi.deleteDsc(client.id, dscId);
          if (res.data) setClient(res.data);
          showToast(`Digital signature removed.`);
        } catch (err: any) {
          showToast(err.message || "Failed to delete DSC.");
        }
      }
    );
  };

  // Delete Contact
  const handleDeleteContact = async (contactId: string, name: string) => {
    promptConfirm(
      "Delete Contact",
      `Are you sure you want to delete contact "${name}"?`,
      async () => {
        try {
          const res = await clientApi.deleteContact(client.id, contactId);
          if (res.data) {
            setClient(res.data);
            onClientUpdated?.(res.data);
          }
          showToast(`Contact "${name}" deleted.`);
        } catch (err: any) {
          showToast(err.message || "Failed to delete contact.");
        }
      }
    );
  };

  // Delete Password
  const handleDeletePassword = async (pwdId: string, portal: string) => {
    promptConfirm(
      "Delete Credential",
      `Are you sure you want to delete credential for "${portal}"?`,
      async () => {
        try {
          const res = await clientApi.deletePassword(client.id, pwdId);
          if (res.data) setClient(res.data);
          showToast(`Credential for "${portal}" removed.`);
        } catch (err: any) {
          showToast(err.message || "Failed to delete credential.");
        }
      }
    );
  };

  // Delete Note
  const handleDeleteNote = async (noteId: string) => {
    promptConfirm(
      "Delete Client Note",
      "Are you sure you want to delete this client note?",
      async () => {
        try {
          const res = await clientApi.deleteNote(client.id, noteId);
          if (res.data) setClient(res.data);
          showToast("Note deleted.");
        } catch (err: any) {
          showToast(err.message || "Failed to delete note.");
        }
      }
    );
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


  return (
    <div className="w-full flex flex-col  animate-in fade-in duration-200">
      {/* Toast */}
      <ToastNotification message={toastMsg} onClose={() => setToastMsg(null)} />

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
              className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${client.active !== false
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
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setActiveTab("Master");
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  <span>Add Key Contact</span>
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
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-xs whitespace-nowrap transition-all border-b-2 font-medium cursor-pointer ${isActive
                  ? "border-[#31719B] text-[#31719B] dark:text-[#60a5fa] font-bold"
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
        {activeTab === "Compliance" ? (
          <ClientComplianceTab client={client} />
        ) : (
          <ClientDetailViewTabs
            activeTab={activeTab}
            client={client}
            serviceSearch={serviceSearch}
            setServiceSearch={setServiceSearch}
            serviceFilter={serviceFilter}
            setServiceFilter={setServiceFilter}
            allServices={allServices}
            filteredServices={filteredServices}
            groupedServices={groupedServices}
            collapsedCategories={collapsedCategories}
            toggleCategory={toggleCategory}
            expandedServiceId={expandedServiceId}
            setExpandedServiceId={setExpandedServiceId}
            editingService={editingService}
            setEditingService={setEditingService}
            isSavingServiceOptions={isSavingServiceOptions}
            isLoadingServices={isLoadingServices}
            handleToggleServiceCompliance={handleToggleServiceCompliance}
            handleToggleCategoryCompliance={handleToggleCategoryCompliance}
            handleSaveServiceOptions={handleSaveServiceOptions}
            setIsAddLicenseOpen={(open) => {
              if (open) setEditingLicense(null);
              setIsAddLicenseOpen(open);
            }}
            handleDeleteLicense={handleDeleteLicense}
            onEditLicense={(lic) => {
              setEditingLicense(lic);
              setIsAddLicenseOpen(true);
            }}
            setIsAddDocInOutOpen={(open) => {
              if (open) setEditingDocMovement(null);
              setIsAddDocInOutOpen(open);
            }}
            handleDeleteDocMovement={handleDeleteDocMovement}
            onEditDocMovement={(doc) => {
              setEditingDocMovement(doc);
              setIsAddDocInOutOpen(true);
            }}
            setIsAddDscOpen={setIsAddDscOpen}
            handleDeleteDsc={handleDeleteDsc}
            clientTasks={clientTasks}
            isLoadingTasks={isLoadingTasks}
            onRefreshTasks={fetchClientTasks}
            revealedPasswords={revealedPasswords}
            setRevealedPasswords={setRevealedPasswords}
            setIsAddPasswordOpen={setIsAddPasswordOpen}
            handleDeletePassword={handleDeletePassword}
            showToast={showToast}
            setIsAddNoteOpen={setIsAddNoteOpen}
            handleDeleteNote={handleDeleteNote}
            handleDeleteContact={handleDeleteContact}
            onClientUpdated={onClientUpdated || ((c) => setClient(c))}
            getAvatarBadge={getAvatarBadge}
          />
        )}
      </div>

      {/* Sub-Section Modals */}
      <AddLicenseModal
        isOpen={isAddLicenseOpen}
        client={client}
        initialData={editingLicense}
        onClose={() => {
          setIsAddLicenseOpen(false);
          setEditingLicense(null);
        }}
        onSuccess={(updated) => {
          setClient(updated);
          onClientUpdated?.(updated);
          showToast(editingLicense ? "License updated successfully." : "License added successfully.");
        }}
      />

      <AddDocumentInOutModal
        isOpen={isAddDocInOutOpen}
        client={client}
        initialData={editingDocMovement}
        onClose={() => {
          setIsAddDocInOutOpen(false);
          setEditingDocMovement(null);
        }}
        onSuccess={(updated) => {
          setClient(updated);
          onClientUpdated?.(updated);
          showToast(editingDocMovement ? "Document movement updated." : "Document movement logged.");
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

      {/* Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText="Cancel"
        confirmVariant="danger"
        onKeepEditing={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onDiscard={async () => {
          const action = confirmDialog.onConfirm;
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          await action();
        }}
      />
    </div>
  );
};
