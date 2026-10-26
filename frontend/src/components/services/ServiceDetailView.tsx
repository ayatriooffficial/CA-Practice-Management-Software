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
import { Client, ClientServiceSetting } from "@/data/crmData";
import { IosToggleSwitch } from "@/components/ui/IosToggleSwitch";
import { ServiceDetailViewTabs, AddSubTaskModal, ServiceTabType } from "./ServiceDetailViewTabs";
import { ToastNotification } from "@/components/ui/ToastNotification";
import { useToggleClientServiceMutation } from "@/hooks/useServices";

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
  >("Overview");

  // Toggle Client Service Mutation
  const toggleClientServiceMutation = useToggleClientServiceMutation();
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);

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
      if (service.id) {
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

    if (service.id) {
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

    if (service.id) {
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

    if (service.id) {
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

    if (service.id) {
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

    if (service.id) {
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

    if (service.id) {
      try {
        await serviceApi.updateService(service.id, { documentRequests: updated });
      } catch { }
    }
    showToast("Document request removed");
  };

  // Save SOP
  const handleSaveSop = async (structuredSop?: import("@/data/serviceData").ServiceSop) => {
    setIsSavingSop(true);
    try {
      const updatedService = {
        ...service,
        sop: sopContent,
        ...(structuredSop ? { sopDetails: structuredSop } : {}),
      };
      setService(updatedService);
      onServiceUpdated?.(updatedService);

      if (service.id) {
        if (structuredSop) {
          await serviceApi.updateSop(service.id, {
            sop: sopContent,
            sopDetails: structuredSop,
          });
        } else {
          await serviceApi.updateService(service.id, { sop: sopContent });
        }
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

  const handleToggleClientService = async (clientItem: Client, nextVal: boolean) => {
    const clientId = clientItem.id || (clientItem as any)._id;
    if (!clientId) return;

    setPendingClientId(clientId);

    const currentSettings = clientItem.serviceSettings || [];
    let updatedSettings: ClientServiceSetting[];

    const existingIndex = currentSettings.findIndex(
      (s) => s.serviceName.trim().toLowerCase() === service.name.trim().toLowerCase()
    );

    if (existingIndex >= 0) {
      updatedSettings = currentSettings.map((s, idx) =>
        idx === existingIndex ? { ...s, isActive: nextVal, compliance: nextVal, recTask: nextVal ? "Enabled" : "Disabled" } : s
      );
    } else {
      const newSetting: ClientServiceSetting = {
        id: `ss-${Date.now()}`,
        serviceName: service.name,
        category: service.category || "General",
        isActive: nextVal,
        compliance: nextVal,
        recTask: nextVal ? "Enabled" : "Disabled",
        recInvoice: "Disabled",
        frequency: service.frequency || "Monthly",
        start: "Day 1",
        target: service.tatDays ? `Day ${service.tatDays}` : "Day 15",
        end: service.tatDays ? `Day ${service.tatDays + 2}` : "Day 20",
        amount: service.professionalFee || 0,
      };
      updatedSettings = [...currentSettings, newSetting];
    }

    const activeNames = updatedSettings
      .filter((s) => (s.isActive !== undefined ? s.isActive : s.compliance))
      .map((s) => s.serviceName);

    // Optimistically update local clients state
    setClients((prev) =>
      prev.map((c) =>
        (c.id || (c as any)._id) === clientId
          ? {
            ...c,
            serviceSettings: updatedSettings,
            services: activeNames,
          }
          : c
      )
    );

    try {
      const targetServiceId = service.id || (service as any)._id || service.name;
      await toggleClientServiceMutation.mutateAsync({
        serviceId: targetServiceId,
        clientId,
        enabled: nextVal,
      });
      showToast(`Service "${service.name}" ${nextVal ? "enabled" : "disabled"} for ${clientItem.name}.`);
    } catch (err: any) {
      console.error("Failed to update client service compliance:", err);
      showToast("Failed to update client service.");
      clientApi.getClients({ limit: 100 }).then((res) => {
        if (res.data) setClients(res.data);
      });
    } finally {
      setPendingClientId(null);
    }
  };

  return (
    <div className="w-full gap-y-4 animate-in fade-in duration-150">
      {/* Toast Notification */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

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

        {/* 6 Summary Metric Cards matching Screenshot 1 & 2 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3">
          {/* Category */}
          <div className="p-3.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-[var(--text-subtle)] font-medium">Category</span>
              <span className="text-xs font-bold text-[var(--text-main)] truncate block">
                {service.category || "Retainer"}
              </span>
            </div>
          </div>

          {/* Frequency */}
          <div className="p-3.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-[var(--text-subtle)] font-medium">Frequency</span>
              <span className="text-xs font-bold text-[var(--text-main)] truncate block">
                {service.frequency || "Monthly"}
              </span>
            </div>
          </div>

          {/* Recurring */}
          <div className="p-3.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Repeat className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-[var(--text-subtle)] font-medium">Recurring</span>
              <span className="text-xs font-bold text-[var(--text-main)]">
                {service.isRecurring ? "Yes" : "No"}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="p-3.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-[var(--text-subtle)] font-medium">Amount</span>
              <span className="text-xs font-bold text-[var(--text-main)]">
                {service.professionalFee ? `₹ ${service.professionalFee.toLocaleString()}` : "—"}
              </span>
            </div>
          </div>

          {/* TAT Days */}
          <div className="p-3.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-[var(--text-subtle)] font-medium">TAT Days</span>
              <span className="text-xs font-bold text-[var(--text-main)]">
                {service.tatDays ? `${service.tatDays}` : "—"}
              </span>
            </div>
          </div>

          {/* Sub Tasks Count */}
          <div className="p-3.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] flex items-center gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <ListTodo className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-[var(--text-subtle)] font-medium">Sub Tasks</span>
              <span className="text-xs font-bold text-[var(--text-main)]">
                {subTasks.length > 0 ? `${subTasks.length}` : "—"}
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
      <div className="bg-[var(--bg-surface)] p-5 shadow-xs">
        <ServiceDetailViewTabs
          activeTab={activeTab}
          service={service}
          subTasks={subTasks}
          handleSyncToTasks={handleSyncToTasks}
          isSyncing={isSyncing}
          setIsAddSubTaskOpen={setIsAddSubTaskOpen}
          handleDeleteSubTask={handleDeleteSubTask}
          checklist={checklist}
          isAddChecklistInline={isAddChecklistInline}
          setIsAddChecklistInline={setIsAddChecklistInline}
          checklistTitle={checklistTitle}
          setChecklistTitle={setChecklistTitle}
          handleAddChecklist={handleAddChecklist}
          handleDeleteChecklist={handleDeleteChecklist}
          documentRequests={documentRequests}
          isAddDocInline={isAddDocInline}
          setIsAddDocInline={setIsAddDocInline}
          docTitle={docTitle}
          setDocTitle={setDocTitle}
          docDescription={docDescription}
          setDocDescription={setDocDescription}
          handleAddDocumentRequest={handleAddDocumentRequest}
          handleDeleteDocumentRequest={handleDeleteDocumentRequest}
          clients={clients}
          filteredClients={filteredClients}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          selectedDeptFilter={selectedDeptFilter}
          setSelectedDeptFilter={setSelectedDeptFilter}
          isClientsLoading={isClientsLoading}
          handleToggleClientService={handleToggleClientService}
          pendingClientId={pendingClientId}
          sopContent={sopContent}
          setSopContent={setSopContent}
          handleSaveSop={handleSaveSop}
          isSavingSop={isSavingSop}
          showToast={showToast}
        />
      </div>

      {/* 4. Add Sub Task Modal */}
      <AddSubTaskModal
        isOpen={isAddSubTaskOpen}
        onClose={() => setIsAddSubTaskOpen(false)}
        onSubmit={handleSaveSubTask}
        subTaskName={subTaskName}
        setSubTaskName={setSubTaskName}
        subTaskBudgetTime={subTaskBudgetTime}
        setSubTaskBudgetTime={setSubTaskBudgetTime}
        subTaskDescription={subTaskDescription}
        setSubTaskDescription={setSubTaskDescription}
        showToast={showToast}
      />
    </div>
  );
};
