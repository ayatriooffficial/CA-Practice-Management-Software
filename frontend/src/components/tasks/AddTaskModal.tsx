"use client";

import React, { useState, useEffect } from "react";
import { X, Paperclip, Loader2 } from "lucide-react";
import { clientApi } from "@/services/clientApi";
import { serviceApi } from "@/services/serviceApi";
import { taskApi } from "@/services/taskApi";
import { TeamMember } from "@/data/teamData";
import { teamStore } from "@/components/team/teamStore";
import { TaskItem, FINANCIAL_YEARS, TASK_DEPARTMENTS } from "@/data/taskData";
import { Client } from "@/data/crmData";
import { Service } from "@/data/serviceData";
import { appSyncService } from "@/services/appSyncService";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: TaskItem) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      return appSyncService.getClients();
    } catch {
      return [];
    }
  });
  const [services, setServices] = useState<Service[]>(() => {
    try {
      return appSyncService.getServices();
    } catch {
      return [];
    }
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form Fields matching Screenshot 1
  const [clientId, setClientId] = useState(() => (clients.length > 0 ? (clients[0].id || clients[0].fileNo || "") : ""));
  const [serviceId, setServiceId] = useState(() => (services.length > 0 ? (services[0].id || services[0].name || "") : ""));
  const [frequency, setFrequency] = useState("Monthly");
  const [period, setPeriod] = useState("Jun 2026");
  const [taskName, setTaskName] = useState("");
  const [financialYear, setFinancialYear] = useState("FY 2026 - 2027");
  const [department, setDepartment] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Low");
  const [startDate, setStartDate] = useState("2026-07-27");
  const [targetDueDate, setTargetDueDate] = useState("2026-07-27");
  const [endDate, setEndDate] = useState("2026-07-27");
  const [billingType, setBillingType] = useState<"Billable" | "Non Billable">("Billable");
  const [isSprintPlanner, setIsSprintPlanner] = useState(false);
  const [description, setDescription] = useState("");
  const [createProformaInvoice, setCreateProformaInvoice] = useState(false);

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
          setClients(res.data);
          if (res.data.length > 0 && !clientId) {
            setClientId(res.data[0].id || res.data[0].fileNo);
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
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingTeam(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const selectedClient = clients.find((c) => c.id === clientId || c.fileNo === clientId);
    const selectedService = services.find((s) => s.id === serviceId || s.name === serviceId);
    const selectedAssignee = teamMembers.find((m) => m.id === assigneeId || m.name === assigneeId);
    const selectedReviewer = teamMembers.find((m) => m.id === reviewerId || m.name === reviewerId);

    if (!selectedClient && !clientId) {
      setErrorMessage("Please select a client from the database.");
      return;
    }

    const clientName = selectedClient ? selectedClient.name : clientId;
    const clientFileNo = selectedClient?.fileNo || "";
    const clientPan = selectedClient?.pan || "";
    const legalName = selectedClient?.legalName || selectedClient?.name || clientName;

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

      const checklist = selectedService?.checklist?.map((c: any, idx: number) => {
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
      });

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
        clientId: selectedClient?.id || clientId,
        clientName,
        clientFileNo,
        clientPan,
        legalName,
        serviceId: selectedService?.id || serviceId,
        serviceName,
        frequency,
        period,
        financialYear,
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
        creatorName: "Dipak Sahani",
        adminId: "admin-dipak-sahani",
        subTasks,
        checklist,
        documentRequests,
      };

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

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-task-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
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
            onClick={onClose}
            aria-label="Close modal"
            className="text-[var(--text-subtle)] hover:text-[var(--text-main)] transition-colors p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/40 text-[var(--danger)] text-xs rounded-md border border-red-200 dark:border-red-900">
            {errorMessage}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 gap-y-3">
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
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all truncate"
              >
                {isLoadingClients ? (
                  <option value="">Loading clients...</option>
                ) : clients.length > 0 ? (
                  clients.map((c) => (
                    <option key={c.id || c.fileNo} value={c.id || c.fileNo}>
                      {c.name} {c.fileNo ? `(${c.fileNo})` : ""}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No clients found in database</option>
                )}
              </select>
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
                onChange={handleServiceChange}
                required
                className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all truncate"
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
              {/* {(() => {
                const s = services.find((srv) => srv.id === serviceId || srv.name === serviceId);
                if (!s) return null;
                const subCount = s.subTasks?.length || 0;
                const checkCount = s.checklist?.length || 0;
                const docCount = s.documentRequests?.length || 0;
                if (subCount === 0 && checkCount === 0 && docCount === 0) return null;
                return (
                  <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-[var(--primary)] font-medium">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                    <span>Auto-integrating from service:</span>
                    <span className="font-semibold underline decoration-dotted">{subCount} Sub Tasks</span>
                    <span>•</span>
                    <span className="font-semibold underline decoration-dotted">{checkCount} Checklists</span>
                    <span>•</span>
                    <span className="font-semibold underline decoration-dotted">{docCount} Docs</span>
                  </div>
                );
              })()} */}
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
                value={period}
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
                Task Name
              </label>
              <input
                id="task-name"
                type="text"
                placeholder="Enter task name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
              />
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
                value={financialYear}
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
                onChange={(e) => setAssigneeId(e.target.value)}
                required
                className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
              >
                <option value="">Select Assignee</option>
                {teamMembers.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.initials} - {tm.name} ({tm.role})
                  </option>
                ))}
              </select>
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
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
              />
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
                onChange={(e) => setTargetDueDate(e.target.value)}
                required
                className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
              />
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
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
              />
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
              onClick={onClose}
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
    </div>
  );
};
