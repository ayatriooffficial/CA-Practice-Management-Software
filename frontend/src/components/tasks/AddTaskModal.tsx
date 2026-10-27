"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Paperclip, Loader2, Mail, AlertCircle, FileText } from "lucide-react";
import { clientApi } from "@/services/clientApi";
import { serviceApi } from "@/services/serviceApi";
import { taskApi } from "@/services/taskApi";
import { TeamMember } from "@/data/teamData";
import { teamStore } from "@/components/team/teamStore";
import { TaskItem, FINANCIAL_YEARS, TASK_DEPARTMENTS, LinkedEmail, TaskTemplateItem, TaskChecklistItem } from "@/data/taskData";
import { Client } from "@/data/crmData";
import { Service } from "@/data/serviceData";
import { appSyncService } from "@/services/appSyncService";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";

export interface AddTaskInitialData {
  taskName?: string;
  description?: string;
  linkedEmail?: LinkedEmail;
}

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: TaskItem) => void;
  initialData?: AddTaskInitialData;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  initialData,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [templates, setTemplates] = useState<TaskTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [customChecklist, setCustomChecklist] = useState<TaskChecklistItem[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Form Fields matching Screenshot 1
  const [clientId, setClientId] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [frequency, setFrequency] = useState("Monthly");
  const [period, setPeriod] = useState("");
  const [taskName, setTaskName] = useState("");
  const [financialYear, setFinancialYear] = useState("");
  const [department, setDepartment] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Low");
  const [startDate, setStartDate] = useState("");
  const [targetDueDate, setTargetDueDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [billingType, setBillingType] = useState<"Billable" | "Non Billable">("Billable");
  const [isSprintPlanner, setIsSprintPlanner] = useState(false);
  const [description, setDescription] = useState("");
  const [createProformaInvoice, setCreateProformaInvoice] = useState(false);

  const isDirty = useMemo(() => {
    return Boolean(
      taskName ||
      description ||
      startDate ||
      targetDueDate ||
      endDate
    );
  }, [taskName, description, startDate, targetDueDate, endDate]);

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedTemplateId("");
      setCustomChecklist(null);
      if (initialData) {
        if (initialData.taskName) {
          setTaskName(initialData.taskName);
        }
        if (initialData.description) {
          setDescription(initialData.description);
        }
      }
    }
  }, [isOpen, initialData]);

  // Fetch clients and services from DB
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingClients(true);
    setIsLoadingServices(true);

    clientApi
      .getClients({ limit: 100 })
      .then((res) => {
        if (isMounted && res.data) {
          const realClients = res.data.filter((c: any) => c.fileNo !== 'CLT-2026-MOCK');
          setClients(realClients);
          if (realClients.length > 0) {
            setClientId((prev) => {
              const exists = realClients.some(
                (c: any) =>
                  (c.id && c.id === prev) ||
                  (c._id && c._id === prev) ||
                  (c.fileNo && c.fileNo === prev)
              );
              return exists && prev
                ? prev
                : (realClients[0].id || (realClients[0] as any)._id || realClients[0].fileNo || "");
            });
          }
        }
      })
      .catch(() => { })
      .finally(() => {
        if (isMounted) setIsLoadingClients(false);
      });

    serviceApi
      .getServices({ limit: 100 })
      .then((res) => {
        if (isMounted && res.data) {
          setServices(res.data);
          if (res.data.length > 0 && !serviceId) {
            setServiceId(res.data[0].id);
            setFrequency(res.data[0].frequency || "Monthly");
          }
        }
      })
      .catch(() => { })
      .finally(() => {
        if (isMounted) setIsLoadingServices(false);
      });

    setIsLoadingTeam(true);
    teamStore
      .loadEmployeesFromBackend()
      .then((emps) => {
        if (isMounted && emps && emps.length > 0) {
          const activeEmps = emps.filter((e) => e.status === "Active");
          const mapped: TeamMember[] = activeEmps.map((e) => ({
            id: e.id,
            name: e.name,
            initials: e.initials || e.name.slice(0, 2).toUpperCase(),
            email: e.email,
            phone: e.mobile,
            role: e.role,
            position: e.designation,
            department: e.department,
            permissions: [],
            avatarColor: "#31719B",
            active: true,
          }));
          setTeamMembers(mapped);
          if (mapped.length > 0 && !assigneeId) {
            setAssigneeId(mapped[0].id);
          }
        }
      })
      .catch(() => { })
      .finally(() => {
        if (isMounted) setIsLoadingTeam(false);
      });

    setIsLoadingTemplates(true);
    taskApi
      .getTaskTemplates()
      .then((res) => {
        if (isMounted && res.data) {
          setTemplates(res.data);
        }
      })
      .catch(() => { })
      .finally(() => {
        if (isMounted) setIsLoadingTemplates(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = templates.find((t) => t.id === templateId || t._id === templateId);
    if (!tpl) return;

    if (tpl.taskTitle) setTaskName(tpl.taskTitle);
    if (tpl.department || tpl.category) setDepartment(tpl.department || tpl.category || "GST");
    if (tpl.priority) setPriority(tpl.priority);
    if (tpl.frequency) setFrequency(tpl.frequency);
    if (tpl.defaultAssigneeId) setAssigneeId(tpl.defaultAssigneeId);
    if (tpl.defaultReviewerId) setReviewerId(tpl.defaultReviewerId);
    if (tpl.billingType) setBillingType(tpl.billingType);
    if (tpl.description) setDescription(tpl.description);
    if (tpl.checklist && tpl.checklist.length > 0) {
      setCustomChecklist(
        tpl.checklist.map((item, idx) => ({
          id: item.id || `c_${Date.now()}_${idx}`,
          title: item.title,
          completed: false,
          isMandatory: item.isMandatory !== false,
        }))
      );
    }
  };

  const handleClearTemplate = () => {
    setSelectedTemplateId("");
    setCustomChecklist(null);
  };

  // When selected service changes, auto-update frequency and department
  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setServiceId(sId);
    const selected = services.find((s) => s.id === sId || s.name === sId);
    if (selected) {
      if (selected.frequency) {
        setFrequency(selected.frequency);
      }
      if (selected.category && !department) {
        setDepartment(selected.category);
      }
      if (!taskName) {
        setTaskName(selected.name);
      }
    }
  };

  // Generate period choices based on frequency
  const getPeriodOptions = () => {
    if (frequency === "Quarterly") {
      return ["Q1 (Apr - Jun 2026)", "Q2 (Jul - Sep 2026)", "Q3 (Oct - Dec 2026)", "Q4 (Jan - Mar 2027)"];
    }
    if (frequency === "Annually") {
      return ["FY 2026 - 2027", "FY 2025 - 2026", "FY 2024 - 2025"];
    }
    if (frequency === "One-Time") {
      return ["Jul 2026", "Immediate", "Current Period"];
    }
    return [
      "Jun 2026",
      "Jul 2026",
      "Aug 2026",
      "Sep 2026",
      "Oct 2026",
      "Nov 2026",
      "Dec 2026",
      "Jan 2027",
      "Feb 2027",
      "Mar 2027",
      "Apr 2026",
      "May 2026",
    ];
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    let selectedClient = clients.find(
      (c) =>
        (c.id && c.id === clientId) ||
        ((c as any)._id && (c as any)._id === clientId) ||
        (c.fileNo && c.fileNo === clientId) ||
        (c.name && c.name.toLowerCase() === clientId.toLowerCase())
    );
    if (!selectedClient && clients.length > 0) {
      selectedClient = clients[0];
    }

    if (!selectedClient && clients.length === 0 && !isLoadingClients) {
      errs.clientId = "Please select or create a client first.";
    }

    if (startDate && targetDueDate && new Date(startDate) > new Date(targetDueDate)) {
      errs.targetDueDate = "Target Due Date cannot be earlier than Start Date.";
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      errs.endDate = "End Date cannot be earlier than Start Date.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validate()) {
      setTimeout(() => {
        const firstErrorEl = document.querySelector(
          ".border-rose-500, .border-\\[\\#e8655a\\], .border-red-500"
        );
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
          (firstErrorEl as HTMLElement)?.focus?.();
        }
      }, 50);
      return;
    }

    const selectedClient = clients.find(
      (c) =>
        (c.id && c.id === clientId) ||
        ((c as any)._id && (c as any)._id === clientId) ||
        (c.fileNo && c.fileNo === clientId) ||
        (c.name && c.name.toLowerCase() === clientId.toLowerCase())
    );
    const selectedService = services.find((s) => s.id === serviceId || s.name === serviceId);
    const selectedAssignee = teamMembers.find((m) => m.id === assigneeId || m.name === assigneeId);
    const selectedReviewer = teamMembers.find((m) => m.id === reviewerId || m.name === reviewerId);

    if (!selectedClient) {
      setErrorMessage("Please select a client from the database.");
      return;
    }

    const clientName = selectedClient.name;
    const clientFileNo = selectedClient.fileNo || "";
    const clientPan = selectedClient.pan || "";
    const legalName = selectedClient.legalName || selectedClient.name || clientName;
    const storedClientId = selectedClient.id || (selectedClient as any)._id;

    const serviceName = selectedService ? selectedService.name : serviceId;
    const assigneeName = selectedAssignee ? selectedAssignee.name : (assigneeId || "");
    const assigneeInitials = selectedAssignee?.initials || (assigneeName ? assigneeName.slice(0, 2).toUpperCase() : "TM");
    const assigneeColor = selectedAssignee?.avatarColor || "#31719B";
    const reviewerName = selectedReviewer ? selectedReviewer.name : (reviewerId || "");

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "27/07/2026";
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };

    setIsSubmitting(true);
    try {
      // Inherit subTasks, checklist, and documentRequests from service
      const subTasks = selectedService?.subTasks?.map((st: any, idx: number) => {
        if (typeof st === "string") {
          return {
            id: String(idx + 1),
            title: st,
            completed: false,
            timeSpent: "00:00:00",
          };
        }
        return {
          id: st.id || String(idx + 1),
          title: st.name || st.title || `Step ${idx + 1}`,
          completed: false,
          timeSpent: st.totalHours || "00:00:00",
        };
      });

      const checklist = (customChecklist && customChecklist.length > 0)
        ? customChecklist
        : selectedService?.checklist?.map((c: any, idx: number) => {
        if (typeof c === "string") {
          return {
            id: `c${idx + 1}`,
            title: c,
            completed: false,
            isMandatory: true,
          };
        }
        return {
          id: c.id || `c${idx + 1}`,
          title: c.title || c.name || `Checklist ${idx + 1}`,
          completed: false,
          isMandatory: c.isMandatory !== false,
        };
      }) || [];

      const documentRequests = selectedService?.documentRequests?.map((d: any, idx: number) => {
        if (typeof d === "string") {
          return {
            id: `d${idx + 1}`,
            title: d,
            status: "Pending" as const,
            isMandatory: true,
          };
        }
        return {
          id: d.id || `d${idx + 1}`,
          title: d.title || d.name || `Document ${idx + 1}`,
          status: "Pending" as const,
          isMandatory: d.isMandatory !== false,
        };
      });

      const payload: Partial<TaskItem> = {
        taskName: taskName.trim() || "-",
        clientId: storedClientId,
        clientName,
        clientFileNo,
        clientPan,
        legalName,
        serviceId: selectedService?.id || serviceId,
        serviceName,
        frequency,
        period: period || getPeriodOptions()[0] || "Current Period",
        financialYear: financialYear || FINANCIAL_YEARS[0] || "FY 2026 - 2027",
        department: department || "GST",
        assigneeId: selectedAssignee?.id || assigneeId,
        assigneeName,
        assigneeInitials,
        assigneeColor,
        reviewerId: selectedReviewer?.id || reviewerId,
        reviewerName,
        priority,
        startDate: formatDate(startDate),
        targetDueDate: formatDate(targetDueDate),
        endDate: formatDate(endDate),
        billingType,
        isSprintPlanner,
        category: selectedService?.category || department || "GST",
        taskType: frequency === "One-Time" ? "One-Time Task" : "Recurring Task",
        status: "Pending",
        description,
        createProformaInvoice,
        creatorName: "",
        adminId: "",
        subTasks,
        checklist,
        documentRequests,
        linkedEmails: initialData?.linkedEmail ? [initialData.linkedEmail] : [],
      };

      // console.log(payload);


      const res = await taskApi.createTask(payload);
      if (res.data) {
        onTaskCreated(res.data);
        onClose();
      } else {
        setErrorMessage(res.message || "Failed to create task");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while creating task");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-task-title"
      className="fixed inset-0 z-[9990] w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-5xl bg-[var(--bg-surface)] text-[var(--text-main)] rounded-lg shadow-2xl border border-[var(--border-main)] overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--border-main)] bg-[var(--bg-muted)]">
          <h2
            id="add-task-title"
            className="text-base font-semibold text-[var(--text-main)]"
          >
            Add Task Details
          </h2>
          <button
            type="button"
            onClick={handleCloseAttempt}
            aria-label="Close modal"
            className="text-[var(--text-subtle)] hover:text-[var(--text-main)] transition-colors p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Linked Email Banner */}
        {initialData?.linkedEmail && (
          <div className="mx-6 mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs rounded-md border border-blue-200 dark:border-blue-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <Mail className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="truncate">
                <span className="font-semibold">Converting Email to Task: </span>
                <span className="font-medium text-[var(--text-main)]">{initialData.linkedEmail.subject || "(No Subject)"}</span>
                <span className="text-xs text-[var(--text-muted)] ml-2">— From {initialData.linkedEmail.sender}</span>
              </div>
            </div>
            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200">
              Auto-Linking Email
            </span>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div
            id="task-form-error-banner"
            className="mx-6 mt-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/95 dark:bg-rose-950/50 p-3.5 text-rose-800 dark:text-rose-200 shadow-sm animate-in fade-in duration-200 flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="text-xs font-medium text-rose-800 dark:text-rose-200">{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 gap-y-3">
          {/* Template Selector Banner */}
          <div className="mb-4 p-3 bg-[var(--bg-muted)]/50 border border-[#dde2e8] dark:border-[#334155] rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-none bg-[#31719B]/10 text-[#31719B] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-2">
                  <span>Apply Task Template</span>
                  <span className="text-[10px] font-medium text-[var(--text-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 border border-[#dde2e8] dark:border-[#334155]">
                    Optional
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-subtle)]">
                  Load pre-configured SOP checklist, department, priority, and guidelines without overwriting client or date selections.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                id="task-template-selector"
                value={selectedTemplateId}
                onChange={(e) => handleApplyTemplate(e.target.value)}
                className="h-8 px-2.5 text-xs bg-[var(--bg-surface)] border border-[#dde2e8] dark:border-[#334155] rounded-none text-[var(--text-main)] focus:outline-none focus:border-[#31719B] min-w-[200px]"
              >
                <option value="">
                  {isLoadingTemplates
                    ? "Loading templates..."
                    : templates.length === 0
                    ? "-- No Templates Created Yet --"
                    : "-- Select Template (Optional) --"}
                </option>
                {templates.map((tpl) => (
                  <option key={tpl.id || tpl._id} value={tpl.id || tpl._id}>
                    {tpl.templateName} ({tpl.category || "General"})
                  </option>
                ))}
              </select>

              {selectedTemplateId && (
                <button
                  type="button"
                  onClick={handleClearTemplate}
                  className="h-8 px-2.5 text-xs font-medium text-[var(--text-subtle)] hover:text-rose-500 border border-[#dde2e8] dark:border-[#334155] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors"
                  title="Clear selected template"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Row 1: Client*, Service*, Frequency, Select Period*, Task Name */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {/* Client * */}
            <div>
              <label
                htmlFor="task-client"
                className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
              >
                Client <span className="text-[var(--danger)]">*</span>
              </label>
              <select
                id="task-client"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  clearError("clientId");
                }}
                className={`w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border rounded-md text-[var(--text-main)] focus:outline-none transition-all truncate ${
                  errors.clientId
                    ? "border-[#e8655a] focus:ring-1 focus:ring-[#e8655a]"
                    : "border-[var(--border-main)] focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                }`}
              >
                {isLoadingClients ? (
                  <option value="">Loading clients...</option>
                ) : clients.length > 0 ? (
                  clients.map((c) => {
                    const cVal = c.id || (c as any)._id || c.fileNo;
                    return (
                      <option key={cVal} value={cVal}>
                        {c.name} {c.fileNo ? `(${c.fileNo})` : ""}
                      </option>
                    );
                  })
                ) : (
                  <option value="" disabled>No clients found in database</option>
                )}
              </select>
              {errors.clientId && (
                <span className="text-[11px] text-[#e8655a] dark:text-rose-400 font-medium block mt-1">
                  {errors.clientId}
                </span>
              )}
            </div>

            {/* Service * */}
            <div>
              <label
                htmlFor="task-service"
                className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
              >
                Service <span className="text-[var(--danger)]">*</span>
              </label>
              <select
                id="task-service"
                value={serviceId}
                onChange={(e) => {
                  handleServiceChange(e);
                  clearError("serviceId");
                }}
                className={`w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border rounded-md text-[var(--text-main)] focus:outline-none transition-all truncate ${
                  errors.serviceId
                    ? "border-[#e8655a] focus:ring-1 focus:ring-[#e8655a]"
                    : "border-[var(--border-main)] focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                }`}
              >
                {isLoadingServices ? (
                  <option value="">Loading services...</option>
                ) : services.length > 0 ? (
                  services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No services found in database</option>
                )}
              </select>
              {errors.serviceId && (
                <span className="text-[11px] text-[#e8655a] dark:text-rose-400 font-medium block mt-1">
                  {errors.serviceId}
                </span>
              )}
            </div>

            {/* Frequency */}
            <div>
              <label
                htmlFor="task-frequency"
                className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
              >
                Frequency
              </label>
              <select
                id="task-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-[var(--bg-muted)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annually">Annually</option>
                <option value="One-Time">One-Time</option>
                <option value="As-Needed">As-Needed</option>
              </select>
            </div>

            {/* Select Period * */}
            <div>
              <label
                htmlFor="task-period"
                className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
              >
                Select Period <span className="text-[var(--danger)]">*</span>
              </label>
              <select
                id="task-period"
                value={period || getPeriodOptions()[0] || ""}
                onChange={(e) => setPeriod(e.target.value)}
                required
                className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
              >
                {getPeriodOptions().map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Task Name */}
            <div>
              <label
                htmlFor="task-name"
                className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
              >
                Task Name <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                id="task-name"
                type="text"
                placeholder="Enter task name"
                value={taskName}
                onChange={(e) => {
                  setTaskName(e.target.value);
                  clearError("taskName");
                }}
                className={`w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border rounded-md text-[var(--text-main)] placeholder-[var(--text-placeholder)] focus:outline-none transition-all ${
                  errors.taskName
                    ? "border-[#e8655a] focus:ring-1 focus:ring-[#e8655a]"
                    : "border-[var(--border-main)] focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                }`}
              />
              {errors.taskName && (
                <span className="text-[11px] text-[#e8655a] dark:text-rose-400 font-medium block mt-1">
                  {errors.taskName}
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Financial Year*, Department, Assignee*, Reviewer, Priority */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {/* Financial Year * */}
            <div>
              <label
                htmlFor="task-fy"
                className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
              >
                Financial Year <span className="text-[var(--danger)]">*</span>
              </label>
              <select
                id="task-fy"
                value={financialYear || FINANCIAL_YEARS[0] || ""}
                onChange={(e) => setFinancialYear(e.target.value)}
                required
                className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
              >
                {FINANCIAL_YEARS.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label
                htmlFor="task-dept"
                className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
              >
                Department
              </label>
              <select
                id="task-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
              >
                <option value="">Select Department</option>
                {TASK_DEPARTMENTS.filter((d) => d !== "All Dept").map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label
                htmlFor="task-assignee"
                className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
              >
                Assignee <span className="text-[var(--danger)]">*</span>
              </label>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(e) => {
                  setAssigneeId(e.target.value);
                  clearError("assigneeId");
                }}
                className={`w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border rounded-md text-[var(--text-main)] focus:outline-none transition-all ${
                  errors.assigneeId
                    ? "border-[#e8655a] focus:ring-1 focus:ring-[#e8655a]"
                    : "border-[var(--border-main)] focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                }`}
              >
                <option value="">Select Assignee</option>
                {teamMembers.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.initials} - {tm.name} ({tm.role})
                  </option>
                ))}
              </select>
              {errors.assigneeId && (
                <span className="text-[11px] text-[#e8655a] dark:text-rose-400 font-medium block mt-1">
                  {errors.assigneeId}
                </span>
              )}
            </div>

            {/* Reviewer */}
            <div>
              <label
                htmlFor="task-reviewer"
                className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
              >
                Reviewer
              </label>
              <select
                id="task-reviewer"
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
              >
                <option value="">Select Reviewer</option>
                {teamMembers.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.initials} - {tm.name} ({tm.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label
                htmlFor="task-priority"
                className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as "Low" | "Medium" | "High" | "Urgent")
                }
                className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Row 3: Start Date*, Target Due Date*, End Date*, Billing Type, Sprint Planner */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-start mt-3
          ">
            {/* Start Date * */}
            <div>
              <label
                htmlFor="task-start-date"
                className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
              >
                Start Date <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                id="task-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  clearError("startDate");
                }}
                className={`w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border rounded-md text-[var(--text-main)] focus:outline-none transition-all ${
                  errors.startDate
                    ? "border-[#e8655a] focus:ring-1 focus:ring-[#e8655a]"
                    : "border-[var(--border-main)] focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                }`}
              />
              {errors.startDate && (
                <span className="text-[11px] text-[#e8655a] dark:text-rose-400 font-medium block mt-1">
                  {errors.startDate}
                </span>
              )}
            </div>

            {/* Target Due Date * */}
            <div>
              <label
                htmlFor="task-due-date"
                className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
              >
                Target Due Date <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                id="task-due-date"
                type="date"
                value={targetDueDate}
                onChange={(e) => {
                  setTargetDueDate(e.target.value);
                  clearError("targetDueDate");
                }}
                className={`w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border rounded-md text-[var(--text-main)] focus:outline-none transition-all ${
                  errors.targetDueDate
                    ? "border-[#e8655a] focus:ring-1 focus:ring-[#e8655a]"
                    : "border-[var(--border-main)] focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                }`}
              />
              {errors.targetDueDate && (
                <span className="text-[11px] text-[#e8655a] dark:text-rose-400 font-medium block mt-1">
                  {errors.targetDueDate}
                </span>
              )}
            </div>

            {/* End Date * */}
            <div>
              <label
                htmlFor="task-end-date"
                className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
              >
                End Date <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                id="task-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  clearError("endDate");
                }}
                className={`w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border rounded-md text-[var(--text-main)] focus:outline-none transition-all ${
                  errors.endDate
                    ? "border-[#e8655a] focus:ring-1 focus:ring-[#e8655a]"
                    : "border-[var(--border-main)] focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                }`}
              />
              {errors.endDate && (
                <span className="text-[11px] text-[#e8655a] dark:text-rose-400 font-medium block mt-1">
                  {errors.endDate}
                </span>
              )}
            </div>

            {/* Billing Type (Radio buttons) */}
            <div>
              <span className="block text-xs font-semibold text-[var(--text-muted)] p-1.5">
                Billing Type
              </span>
              <div className="flex items-center gap-x-4 h-9">
                <label className="inline-flex items-center text-xs text-[var(--text-main)] cursor-pointer">
                  <input
                    type="radio"
                    name="billingType"
                    value="Billable"
                    checked={billingType === "Billable"}
                    onChange={() => setBillingType("Billable")}
                    className="w-4 h-4 text-[var(--primary)] focus:ring-[var(--primary)] border-[var(--border-main)]"
                  />
                  <span className="ml-1.5">Billable</span>
                </label>
                <label className="inline-flex items-center text-xs text-[var(--text-main)] cursor-pointer">
                  <input
                    type="radio"
                    name="billingType"
                    value="Non Billable"
                    checked={billingType === "Non Billable"}
                    onChange={() => setBillingType("Non Billable")}
                    className="w-4 h-4 text-[var(--primary)] focus:ring-[var(--primary)] border-[var(--border-main)]"
                  />
                  <span className="ml-1.5">Non Billable</span>
                </label>
              </div>
            </div>

            {/* Sprint Planner Checkbox */}
            <div>
              <span className="block text-xs font-semibold text-[var(--text-muted)] p-1.5">
                Sprint Planner
              </span>
              <div className="flex items-center h-9">
                <label className="inline-flex items-center text-xs text-[var(--text-main)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSprintPlanner}
                    onChange={(e) => setIsSprintPlanner(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)] border-[var(--border-main)]"
                  />
                  <span className="ml-2">Add to Sprint Planner</span>
                </label>
              </div>
            </div>
          </div>

          {/* Row 4: Description (Textarea with paperclip) */}
          <div>
            <label
              htmlFor="task-description"
              className="block text-xs font-semibold text-[var(--text-muted)] p-1.5"
            >
              Description
            </label>
            <div className="relative border border-[var(--border-main)] rounded-md bg-[var(--bg-surface)] focus-within:ring-1 focus-within:ring-[var(--primary)] focus-within:border-[var(--primary)] transition-all">
              <textarea
                id="task-description"
                rows={3}
                placeholder="Add description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs bg-transparent border-0 text-[var(--text-main)] placeholder-[var(--text-placeholder)] focus:outline-none resize-none"
              />
              <div className="px-3 p-2 flex items-center">
                <button
                  type="button"
                  title="Attach file"
                  aria-label="Attach file"
                  className="text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors p-1"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Row 5: Create Proforma Invoice Checkbox */}
          <div className="my-4">
            <label className="inline-flex items-center text-xs text-[var(--text-main)] cursor-pointer">
              <input
                type="checkbox"
                checked={createProformaInvoice}
                onChange={(e) => setCreateProformaInvoice(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)] border-[var(--border-main)]"
              />
              <span className="ml-2">Create Proforma Invoice for this Task</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-x-3 pt-3.5 border-t border-[var(--border-main)]">
            <button
              type="button"
              onClick={handleCloseAttempt}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md hover:bg-[var(--bg-subtle)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white rounded-md shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-x-1.5"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit</span>
              )}
            </button>
          </div>
        </form>
      </div>

      <DiscardConfirmationModal
        isOpen={showDiscardModal}
        onKeepEditing={() => setShowDiscardModal(false)}
        onDiscard={() => {
          setShowDiscardModal(false);
          onClose();
        }}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
};
