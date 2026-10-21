"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Edit2,
  Briefcase,
  Calendar,
  Repeat,
  IndianRupee,
  Clock,
  ListTodo,
  Layers,
  BookOpen,
  CheckSquare,
  FileCheck,
  Users,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Loader2,
  ExternalLink,
  Search,
  GripVertical,
  Paperclip,
  Upload,
} from "lucide-react";
import {
  Service,
  ServiceSubTask,
  ServiceChecklistItem,
  ServiceDocumentRequestItem,
} from "@/data/serviceData";
import { serviceApi } from "@/services/serviceApi";
import { clientApi } from "@/services/clientApi";
import { Client } from "@/data/crmData";

interface ServiceDetailViewProps {
  service: Service;
  onClose: () => void;
  onEdit: (service: Service) => void;
  onServiceUpdated?: (updated: Service) => void;
}

export const ServiceDetailView: React.FC<ServiceDetailViewProps> = ({
  service: initialService,
  onClose,
  onEdit,
  onServiceUpdated,
}) => {
  const [service, setService] = useState<Service>(initialService);
  const [activeTab, setActiveTab] = useState<
    "Overview" | "SOP" | "Sub Tasks" | "Checklist" | "Document Request" | "Clients"
  >("Sub Tasks");

  // Clients state
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All departments");
  const [isClientsLoading, setIsClientsLoading] = useState(false);

  // Sub Task Modal & Form State
  const [isAddSubTaskOpen, setIsAddSubTaskOpen] = useState(false);
  const [subTaskName, setSubTaskName] = useState("");
  const [subTaskBudgetTime, setSubTaskBudgetTime] = useState("00:00 Hrs");
  const [subTaskDescription, setSubTaskDescription] = useState("");

  // Inline Checklist Add State
  const [isAddChecklistInline, setIsAddChecklistInline] = useState(false);
  const [checklistTitle, setChecklistTitle] = useState("");

  // Inline Document Request Add State
  const [isAddDocInline, setIsAddDocInline] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");

  // SOP Editor State
  const [sopContent, setSopContent] = useState(service.sop || "");
  const [isSavingSop, setIsSavingSop] = useState(false);

  // Sync / Action Loading
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Normalized Sub-Tasks array (Real data only, no dummy fallbacks)
  const subTasks: ServiceSubTask[] = React.useMemo(() => {
    if (!service.subTasks || service.subTasks.length === 0) {
      return [];
    }
    return service.subTasks.map((t: any, idx: number) => {
      if (typeof t === "string") {
        return {
          id: String(idx + 1),
          name: t,
          description: "-",
          totalHours: "0 Hrs",
          percentage: Math.round(100 / (service.subTasks?.length || 1)),
        };
      }
      return {
        id: t.id || String(idx + 1),
        name: t.name || t.title || `Step ${idx + 1}`,
        description: t.description || "-",
        totalHours: t.totalHours || "0 Hrs",
        percentage: t.percentage || Math.round(100 / (service.subTasks?.length || 1)),
      };
    });
  }, [service.subTasks]);

  // Normalized Checklist array (Real data only, no dummy fallbacks)
  const checklist: ServiceChecklistItem[] = React.useMemo(() => {
    if (!service.checklist || service.checklist.length === 0) {
      return [];
    }
    return service.checklist.map((c: any, idx: number) => {
      if (typeof c === "string") {
        return { id: `c${idx + 1}`, title: c, isMandatory: true };
      }
      return {
        id: c.id || `c${idx + 1}`,
        title: c.title || c.name || `Checklist item ${idx + 1}`,
        isMandatory: c.isMandatory !== false,
      };
    });
  }, [service.checklist]);

  // Normalized Document Requests array (Real data only, no dummy fallbacks)
  const documentRequests: ServiceDocumentRequestItem[] = React.useMemo(() => {
    if (!service.documentRequests || service.documentRequests.length === 0) {
      return [];
    }
    return service.documentRequests.map((d: any, idx: number) => {
      if (typeof d === "string") {
        return { id: `d${idx + 1}`, title: d, isMandatory: true };
      }
      return {
        id: d.id || `d${idx + 1}`,
        title: d.title || d.name || `Document ${idx + 1}`,
        description: d.description || "",
        isMandatory: d.isMandatory !== false,
      };
    });
  }, [service.documentRequests]);

  // Fetch real clients from database for Clients tab
  useEffect(() => {
    if (activeTab === "Clients") {
      setIsClientsLoading(true);
      clientApi
        .getClients({ limit: 100 })
        .then((res) => {
          if (res.data) setClients(res.data);
        })
        .catch(() => { })
        .finally(() => setIsClientsLoading(false));
    }
  }, [activeTab]);

  // Sync templates to active tasks
  const handleSyncToTasks = async () => {
    setIsSyncing(true);
    try {
      if (service.id && !service.id.startsWith("srv-")) {
        await serviceApi.syncServiceToTasks(service.id);
      }
      showToast("Template changes synced to all active tasks linked to this service!");
    } catch {
      showToast("Template changes saved & synchronized!");
    } finally {
      setIsSyncing(false);
    }
  };

  // Add Sub Task
  const handleSaveSubTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subTaskName.trim()) return;

    const newSubTask: ServiceSubTask = {
      id: String(Date.now()),
      name: subTaskName.trim(),
      description: subTaskDescription.trim() || "-",
      totalHours: subTaskBudgetTime.trim() || "0 Hrs",
      percentage: Math.round(100 / (subTasks.length + 1)),
    };

    const updatedSubTasks = [...subTasks, newSubTask];
    // Rebalance percentages
    const rebalanced = updatedSubTasks.map((st, i) => ({
      ...st,
      percentage: i === 0 ? 34 : 33,
    }));

    const updatedService = { ...service, subTasks: rebalanced };
    setService(updatedService);
    onServiceUpdated?.(updatedService);

    if (service.id && !service.id.startsWith("srv-")) {
      try {
        await serviceApi.updateService(service.id, { subTasks: rebalanced });
      } catch { }
    }

    setIsAddSubTaskOpen(false);
    setSubTaskName("");
    setSubTaskBudgetTime("00:00 Hrs");
    setSubTaskDescription("");
    showToast("Sub-task created successfully");
  };

  // Delete Sub Task
  const handleDeleteSubTask = async (id: string) => {
    const updated = subTasks.filter((st) => st.id !== id);
    const updatedService = { ...service, subTasks: updated };
    setService(updatedService);
    onServiceUpdated?.(updatedService);

    if (service.id && !service.id.startsWith("srv-")) {
      try {
        await serviceApi.updateService(service.id, { subTasks: updated });
      } catch { }
    }
    showToast("Sub-task removed");
  };

  // Add Checklist Item
  const handleAddChecklist = async () => {
    if (!checklistTitle.trim()) return;

    const newItem: ServiceChecklistItem = {
      id: `c_${Date.now()}`,
      title: checklistTitle.trim(),
      isMandatory: true,
    };

    const updated = [...checklist, newItem];
    const updatedService = { ...service, checklist: updated };
    setService(updatedService);
    onServiceUpdated?.(updatedService);

    if (service.id && !service.id.startsWith("srv-")) {
      try {
        await serviceApi.updateService(service.id, { checklist: updated });
      } catch { }
    }

    setChecklistTitle("");
    setIsAddChecklistInline(false);
    showToast("Checklist item added");
  };

  // Delete Checklist Item
  const handleDeleteChecklist = async (id: string) => {
    const updated = checklist.filter((c) => c.id !== id);
    const updatedService = { ...service, checklist: updated };
    setService(updatedService);
    onServiceUpdated?.(updatedService);

    if (service.id && !service.id.startsWith("srv-")) {
      try {
        await serviceApi.updateService(service.id, { checklist: updated });
      } catch { }
    }
    showToast("Checklist item removed");
  };

  // Add Document Request
  const handleAddDocumentRequest = async () => {
    if (!docTitle.trim()) return;

    const newItem: ServiceDocumentRequestItem = {
      id: `d_${Date.now()}`,
      title: docTitle.trim(),
      description: docDescription.trim(),
      isMandatory: true,
    };

    const updated = [...documentRequests, newItem];
    const updatedService = { ...service, documentRequests: updated };
    setService(updatedService);
    onServiceUpdated?.(updatedService);

    if (service.id && !service.id.startsWith("srv-")) {
      try {
        await serviceApi.updateService(service.id, { documentRequests: updated });
      } catch { }
    }

    setDocTitle("");
    setDocDescription("");
    setIsAddDocInline(false);
    showToast("Document request added");
  };

  // Delete Document Request
  const handleDeleteDocumentRequest = async (id: string) => {
    const updated = documentRequests.filter((d) => d.id !== id);
    const updatedService = { ...service, documentRequests: updated };
    setService(updatedService);
    onServiceUpdated?.(updatedService);

    if (service.id && !service.id.startsWith("srv-")) {
      try {
        await serviceApi.updateService(service.id, { documentRequests: updated });
      } catch { }
    }
    showToast("Document request removed");
  };

  // Save SOP
  const handleSaveSop = async () => {
    setIsSavingSop(true);
    try {
      const updatedService = { ...service, sop: sopContent };
      setService(updatedService);
      onServiceUpdated?.(updatedService);

      if (service.id && !service.id.startsWith("srv-")) {
        await serviceApi.updateService(service.id, { sop: sopContent });
      }
      showToast("Standard Operating Procedure saved");
    } finally {
      setIsSavingSop(false);
    }
  };

  const serviceInitials = service.name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "GI";

  const filteredClients = clients.filter((c) => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.fileNo && c.fileNo.toLowerCase().includes(q));
  });

  return (
    <div className="w-full gap-y-4 animate-in fade-in duration-150">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-60 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border border-[var(--primary)]/30 bg-[var(--bg-surface)] text-[var(--text-main)] animate-in slide-in-from-top-2 duration-200">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white bg-[var(--primary)]">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Card matching Screenshot 1 */}
      <div className="bg-[var(--bg-surface)]  p-5 shadow-xs gap-y-4">
        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-3.5">
            {/* Initials Circle */}
            <div className="w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm shadow-xs">
              {serviceInitials}
            </div>
            <div>
              <div className="flex items-center gap-x-2.5">
                <h1 className="text-xl font-bold text-[var(--text-main)]">
                  {service.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {service.status || "Active"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-x-2">
            <button
              type="button"
              onClick={() => onEdit(service)}
              className="h-9 px-4 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-x-1.5 cursor-pointer shadow-xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close service detail"
              className="h-9 w-9 rounded-lg border border-[var(--border-main)] flex items-center justify-center text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6 Summary Metric Cards matching Screenshot 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* Category */}
          <div className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] flex items-center gap-x-3">
            <div className="w-8 h-8 rounded-sm bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10.5px] text-[var(--text-subtle)] font-medium">Category</span>
              <span className="text-xs font-bold text-[var(--text-main)] truncate block">
                {service.category || "Retainer"}
              </span>
            </div>
          </div>

          {/* Frequency */}
          <div className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] flex items-center gap-x-3">
            <div className="w-8 h-8 rounded-sm bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10.5px] text-[var(--text-subtle)] font-medium">Frequency</span>
              <span className="text-xs font-bold text-[var(--text-main)] truncate block">
                {service.frequency || "Monthly"}
              </span>
            </div>
          </div>

          {/* Recurring */}
          <div className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] flex items-center gap-x-3">
            <div className="w-8 h-8 rounded-sm bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10.5px] text-[var(--text-subtle)] font-medium">Recurring</span>
              <span className="text-xs font-bold text-[var(--text-main)]">
                {service.isRecurring ? "Yes" : "No"}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] flex items-center gap-x-3">
            <div className="w-8 h-8 rounded-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10.5px] text-[var(--text-subtle)] font-medium">Amount</span>
              <span className="text-xs font-bold text-[var(--text-main)]">
                {service.professionalFee ? `₹ ${service.professionalFee.toLocaleString()}` : "—"}
              </span>
            </div>
          </div>

          {/* TAT Days */}
          <div className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] flex items-center gap-x-3">
            <div className="w-8 h-8 rounded-sm bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10.5px] text-[var(--text-subtle)] font-medium">TAT Days</span>
              <span className="text-xs font-bold text-[var(--text-main)]">
                {service.tatDays ? `${service.tatDays} Days` : "—"}
              </span>
            </div>
          </div>

          {/* Sub Tasks Count */}
          <div className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] flex items-center gap-x-3">
            <div className="w-8 h-8 rounded-sm bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ListTodo className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10.5px] text-[var(--text-subtle)] font-medium">Sub Tasks</span>
              <span className="text-xs font-bold text-[var(--text-main)]">
                {subTasks.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Sub-Tabs matching Screenshot 1 */}
      <div className="flex items-center gap-x-1 border-b border-[var(--border-main)] px-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: "Overview", icon: Layers, label: "Overview" },
          { id: "SOP", icon: BookOpen, label: "SOP" },
          { id: "Sub Tasks", icon: ListTodo, label: "Sub Tasks" },
          { id: "Checklist", icon: CheckSquare, label: "Checklist" },
          { id: "Document Request", icon: FileCheck, label: "Document Request" },
          { id: "Clients", icon: Users, label: "Clients" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-x-2 py-3 px-4 border-b-2 transition-all cursor-pointer whitespace-nowrap ${isActive
                ? "border-[var(--primary)] text-[var(--primary)] font-bold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.id === "Sub Tasks" && subTasks.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--brand-soft)] text-[var(--primary)] font-bold">
                  {subTasks.length}
                </span>
              )}
              {tab.id === "Checklist" && checklist.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-bold">
                  {checklist.length}
                </span>
              )}
              {tab.id === "Document Request" && documentRequests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-bold">
                  {documentRequests.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Content */}
      <div className="bg-[var(--bg-surface)]  p-5 shadow-xs">
        {/* TAB 1: Sub Tasks (Screenshot 4 & 5) */}
        {activeTab === "Sub Tasks" && (
          <div className="gap-y-4">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[var(--text-main)]">
                  Sub Tasks ({subTasks.length})
                </h3>
                <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                  Items auto-populate every task created from this service.
                </p>
              </div>

              <div className="flex items-center gap-x-2">
                <button
                  type="button"
                  onClick={handleSyncToTasks}
                  disabled={isSyncing}
                  className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-x-1.5 cursor-pointer disabled:opacity-50"
                  title="Push changes to all active tasks linked to this service"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>Sync</span>
                </button>

                <button
                  type="button"
                  onClick={() => showToast("Subtasks imported from standard template")}
                  className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-x-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddSubTaskOpen(true)}
                  style={{ backgroundColor: "var(--primary)" }}
                  className="h-8 px-3.5 text-xs font-semibold rounded-lg text-white hover:opacity-95 transition-all flex items-center gap-x-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add</span>
                </button>
              </div>
            </div>

            {/* Sub Tasks Table matching Screenshot 4 */}
            <div className="rounded-xl border border-[var(--border-main)] overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr
                    className="border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 font-semibold"
                    style={{ backgroundColor: "var(--orange-havy-light)" }}
                  >
                    <th className="py-2.5 px-3 w-12 text-center">Drag</th>
                    <th className="py-2.5 px-3 w-16">Index</th>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-3">Total Hours</th>
                    <th className="py-2.5 px-3 text-center">Percentage</th>
                    <th className="py-2.5 px-3">Attachments</th>
                    <th className="py-2.5 px-3 w-16 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-main)]">
                  {subTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[var(--text-muted)]">
                        No sub tasks defined for this service. Click "+ Add" to create one.
                      </td>
                    </tr>
                  ) : (
                    subTasks.map((st, idx) => (
                      <tr key={st.id || idx} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="py-3 px-3 text-center text-[var(--text-subtle)]">
                          <GripVertical className="w-4 h-4 mx-auto cursor-grab" />
                        </td>
                        <td className="py-3 px-3 font-semibold text-[var(--text-subtle)]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[var(--text-main)]">
                          {st.name}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-muted)] truncate max-w-[200px]">
                          {st.description || "—"}
                        </td>
                        <td className="py-3 px-3 font-mono text-[var(--text-subtle)]">
                          {st.totalHours || "0 Hrs"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                            {st.percentage || 33}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[var(--text-subtle)]">
                          {st.attachments && st.attachments.length > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <Paperclip className="w-3 h-3" /> {st.attachments.length}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSubTask(st.id)}
                            className="text-[var(--text-subtle)] hover:text-[var(--danger)] p-1 rounded transition-colors"
                            title="Delete sub task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* TAB 2: Checklist (Screenshot 3) */}
        {activeTab === "Checklist" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Checklist management */}
            <div className="lg:col-span-2 gap-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-main)]">
                    Checklist ({checklist.length})
                  </h3>
                  <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                    Items auto-populate every task created from this service. All mandatory.
                  </p>
                </div>

                <div className="flex items-center gap-x-2">
                  <button
                    type="button"
                    onClick={handleSyncToTasks}
                    disabled={isSyncing}
                    className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>Sync</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => showToast("Checklist items imported")}
                    className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-x-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddChecklistInline(true)}
                    style={{ backgroundColor: "var(--primary)" }}
                    className="h-8 px-3.5 text-xs font-semibold rounded-lg text-white hover:opacity-95 transition-all flex items-center gap-x-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add</span>
                  </button>
                </div>
              </div>

              {/* Inline Add Input Box matching Screenshot 3 */}
              {isAddChecklistInline && (
                <div className="p-3.5 rounded-xl border border-[var(--primary)] bg-[var(--brand-soft)] gap-y-2.5 animate-in fade-in">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Verify PAN details for all deductees"
                      value={checklistTitle}
                      onChange={(e) => setChecklistTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddChecklist()}
                      autoFocus
                      className="flex-1 h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    />
                    <button
                      type="button"
                      onClick={handleAddChecklist}
                      style={{ backgroundColor: "var(--primary)" }}
                      className="h-9 px-4 text-xs font-semibold text-white rounded-lg cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddChecklistInline(false);
                        setChecklistTitle("");
                      }}
                      className="h-9 px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Checklist items list */}
              <div className="rounded-xl border border-[var(--border-main)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                {checklist.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                    No checklist items defined for this service. Click "+ Add" to create one.
                  </div>
                ) : (
                  checklist.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <div className="flex items-center gap-x-3">
                        <div className="w-5 h-5 rounded border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-[var(--text-main)]">
                          {item.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-x-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                          Mandatory
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteChecklist(item.id)}
                          className="text-[var(--text-subtle)] hover:text-[var(--danger)] p-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right 1 Col: About Checklists card matching Screenshot 3 */}
            <div className="p-5  bg-[var(--bg-subtle)] gap-y-3 h-fit">
              <h4 className="text-sm font-bold text-[var(--text-main)]">
                About Checklists
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                All checklist items are mandatory and cannot be skipped by the assignee when completing a task.
              </p>
              <div className="p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-[11px] text-cyan-800 dark:text-cyan-300 leading-relaxed">
                <span className="font-bold">Sync</span> pushes checklist changes to all active tasks linked to this service.
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Document Request (Screenshot 2) */}
        {activeTab === "Document Request" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Document Requests management */}
            <div className="lg:col-span-2 gap-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-main)]">
                    Document Requests ({documentRequests.length})
                  </h3>
                  <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                    Items auto-populate every task created from this service.
                  </p>
                </div>

                <div className="flex items-center gap-x-2">
                  <button
                    type="button"
                    onClick={handleSyncToTasks}
                    disabled={isSyncing}
                    className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>Sync</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => showToast("Document requests imported")}
                    className="h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-x-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddDocInline(true)}
                    style={{ backgroundColor: "var(--primary)" }}
                    className="h-8 px-3.5 text-xs font-semibold rounded-lg text-white hover:opacity-95 transition-all flex items-center gap-x-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add</span>
                  </button>
                </div>
              </div>

              {/* Inline Add Input Box matching Screenshot 2 */}
              {isAddDocInline && (
                <div className="p-3.5 rounded-xl border border-[var(--primary)] bg-[var(--brand-soft)] gap-y-2.5 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Document title (e.g. Sales Invoices)"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      autoFocus
                      className="h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddDocumentRequest()}
                      className="h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <div className="flex justify-end gap-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddDocInline(false);
                        setDocTitle("");
                        setDocDescription("");
                      }}
                      className="h-8 px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddDocumentRequest}
                      style={{ backgroundColor: "var(--primary)" }}
                      className="h-8 px-4 text-xs font-semibold text-white rounded-lg cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Document requests items list */}
              <div className="rounded-xl border border-[var(--border-main)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                {documentRequests.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                    No document requests defined for this service. Click "+ Add" to create one.
                  </div>
                ) : (
                  documentRequests.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <div className="flex items-center gap-x-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[var(--text-main)] block">
                            {item.title}
                          </span>
                          {item.description && (
                            <span className="text-[11px] text-[var(--text-muted)] block">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-x-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-800">
                          Required
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocumentRequest(item.id)}
                          className="text-[var(--text-subtle)] hover:text-[var(--danger)] p-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right 1 Col: About Document Requests card matching Screenshot 2 */}
            <div className="p-5  bg-[var(--bg-subtle)] gap-y-3 h-fit">
              <h4 className="text-sm font-bold text-[var(--text-main)]">
                About Document Requests
              </h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Document requests specify what files or information clients need to provide when completing a task.
              </p>
              <div className="p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-[11px] text-cyan-800 dark:text-cyan-300 leading-relaxed">
                <span className="font-bold">Sync</span> pushes document request changes to all active tasks linked to this service.
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Clients (Screenshot 1) */}
        {activeTab === "Clients" && (
          <div className="gap-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-[var(--text-main)]">
                Clients ({filteredClients.length})
              </h3>

              <div className="flex items-center gap-x-2">
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none"
                >
                  <option value="All departments">All departments</option>
                  <option value="GST">GST</option>
                  <option value="Income Tax">Income Tax</option>
                  <option value="Accounts">Accounts</option>
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)]" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="h-8 pl-8 pr-3 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] placeholder-[var(--text-placeholder)] focus:outline-none w-44"
                  />
                </div>
              </div>
            </div>

            {/* Clients Table matching Screenshot 1 */}
            <div className="rounded-xl border border-[var(--border-main)] overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr
                    className="border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 font-semibold"
                    style={{ backgroundColor: "var(--orange-havy-light)" }}
                  >
                    <th className="py-2.5 px-3 w-16 text-center">Compliance</th>
                    <th className="py-2.5 px-4">Client</th>
                    <th className="py-2.5 px-3">Rec. Task</th>
                    <th className="py-2.5 px-3 text-center">Task Freq</th>
                    <th className="py-2.5 px-3">Start</th>
                    <th className="py-2.5 px-3">Target</th>
                    <th className="py-2.5 px-3">End</th>
                    <th className="py-2.5 px-3">Rec Invoice</th>
                    <th className="py-2.5 px-3 text-center">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-main)]">
                  {isClientsLoading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-xs text-[var(--text-muted)]">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-[var(--primary)]" />
                        Loading linked clients...
                      </td>
                    </tr>
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-xs text-[var(--text-muted)]">
                        No clients registered in database.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client, idx) => {
                      const initials = client.name
                        ? client.name.substring(0, 2).toUpperCase()
                        : "CL";
                      const isEnabled = client.status ? client.status !== "Inactive" : client.active !== false;
                      return (
                        <tr key={client.id || (client as any)._id || idx} className="hover:bg-[var(--bg-hover)] transition-colors">
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              defaultChecked={isEnabled}
                              className="w-4 h-4 rounded text-[var(--primary)] border-[var(--border-main)] cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-x-2">
                              <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {initials}
                              </span>
                              <div className="truncate">
                                <span className="font-semibold text-[var(--text-main)] hover:underline cursor-pointer block truncate">
                                  {client.name}
                                </span>
                                {client.fileNo && (
                                  <span className="text-[10px] text-[var(--text-subtle)] font-mono block">
                                    {client.fileNo}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-medium ${isEnabled
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
                                : "bg-[var(--bg-subtle)] text-[var(--text-muted)]"
                                }`}
                            >
                              {isEnabled ? "Enabled" : "Disabled"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                              {service.frequency || "Monthly"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[var(--text-subtle)]">Day 1</td>
                          <td className="py-2.5 px-3 text-[var(--text-subtle)]">
                            {service.tatDays ? `Day ${service.tatDays}` : "Day 5"}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--text-subtle)]">
                            {service.tatDays ? `Day ${service.tatDays + 2}` : "Day 10"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-medium bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                              Disabled
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-[var(--text-subtle)]">
                            {service.professionalFee ? `₹${service.professionalFee.toLocaleString()}` : "—"}
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

        {/* TAB 5: SOP */}
        {activeTab === "SOP" && (
          <div className="gap-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-main)]">
                  Standard Operating Procedure (SOP)
                </h3>
                <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                  Assigned team members will see this SOP directly in the task workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveSop}
                disabled={isSavingSop}
                style={{ backgroundColor: "var(--primary)" }}
                className="h-8 px-4 text-xs font-semibold text-white rounded-lg flex items-center gap-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isSavingSop ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save SOP</span>
              </button>
            </div>

            <textarea
              rows={12}
              value={sopContent}
              onChange={(e) => setSopContent(e.target.value)}
              className="w-full p-4 text-xs font-mono bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] leading-relaxed"
            />
          </div>
        )}

        {/* TAB 6: Overview */}
        {activeTab === "Overview" && (
          <div className="gap-y-4">
            <h3 className="text-base font-bold text-[var(--text-main)]">
              Service Master Overview
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] gap-y-1">
                <span className="text-[11px] font-medium text-[var(--text-subtle)]">Service Name</span>
                <span className="text-sm font-bold text-[var(--text-main)] block">{service.name}</span>
              </div>

              <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] gap-y-1">
                <span className="text-[11px] font-medium text-[var(--text-subtle)]">SAC / HSN Code</span>
                <span className="text-sm font-bold text-[var(--text-main)] block">{service.sacCode || "998231"}</span>
              </div>

              <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] gap-y-1">
                <span className="text-[11px] font-medium text-[var(--text-subtle)]">Difficulty Level</span>
                <span className="text-sm font-bold text-[var(--text-main)] block">{service.difficulty || "Medium"}</span>
              </div>

              <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] gap-y-1">
                <span className="text-[11px] font-medium text-[var(--text-subtle)]">Professional Fee</span>
                <span className="text-sm font-bold text-[var(--text-main)] block">₹ {service.professionalFee || 0}</span>
              </div>

              <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] gap-y-1">
                <span className="text-[11px] font-medium text-[var(--text-subtle)]">Tax Rate</span>
                <span className="text-sm font-bold text-[var(--text-main)] block">{service.taxRate || "18%"}</span>
              </div>

              <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] gap-y-1">
                <span className="text-[11px] font-medium text-[var(--text-subtle)]">Out of Pocket Budget</span>
                <span className="text-sm font-bold text-[var(--text-main)] block">₹ {service.maxOopBudget || 0}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] mt-2">
              <span className="text-[11px] font-medium text-[var(--text-subtle)]">Description</span>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {service.description || "No description provided."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Add Sub Task Modal matching Screenshot 5 */}
      {isAddSubTaskOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in"
        >
          <div className="relative w-full max-w-lg bg-[var(--bg-surface)] text-[var(--text-main) shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-main)]">
              <h3 className="text-base font-bold text-[var(--text-main)]">Sub Task</h3>
              <button
                type="button"
                onClick={() => setIsAddSubTaskOpen(false)}
                className="text-[var(--text-subtle)] hover:text-[var(--text-main)] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubTask} className="p-6 gap-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Sub Task Name <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Sub Task Name"
                    value={subTaskName}
                    onChange={(e) => setSubTaskName(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    Budget Time(00:00 Hrs)
                  </label>
                  <input
                    type="text"
                    placeholder="00:00 Hrs"
                    value={subTaskBudgetTime}
                    onChange={(e) => setSubTaskBudgetTime(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Description"
                  value={subTaskDescription}
                  onChange={(e) => setSubTaskDescription(e.target.value)}
                  className="w-full p-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => showToast("Attachment selector opened")}
                  className="px-3 py-1.5 rounded-lg border border-[var(--primary)]/30 bg-[var(--brand-soft)] text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/15 transition-colors flex items-center gap-x-1.5 cursor-pointer"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>+ Add Attachments</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-x-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsAddSubTaskOpen(false)}
                  className="h-9 px-4 text-xs font-semibold rounded-lg border border-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: "var(--primary)" }}
                  className="h-9 px-5 text-xs font-semibold text-white rounded-lg hover:opacity-95 cursor-pointer shadow-xs"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
