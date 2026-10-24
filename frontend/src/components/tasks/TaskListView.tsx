"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Hourglass,
  Clock,
  Eye,
  Edit2,
  Flame,
  CheckCircle2,
  DollarSign,
  XCircle,
  ListTodo,
  Search,
  Filter,
  RotateCcw,
  ArrowUpDown,
  MoreVertical,
  Repeat,
  ReceiptText,
} from "lucide-react";
import { taskApi } from "@/services/taskApi";
import {
  TaskItem,
  TaskStats,
  TASK_CATEGORIES,
  TASK_DEPARTMENTS,
} from "@/data/taskData";
import { TeamMember } from "@/data/teamData";
import { teamStore } from "@/components/team/teamStore";
import { useAuth } from "../auth/AuthContext";

interface TaskListViewProps {
  onOpenAddTask: () => void;
  onOpenTaskDetail: (taskId: string) => void;
  selectedAssigneeFilter?: string | null;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  onOpenAddTask,
  onOpenTaskDetail,
  selectedAssigneeFilter,
}) => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const isEmployee = (currentUser?.role || "").toLowerCase() === "employee";
  const employeeName = currentUser?.name || "";

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    wip: 0,
    pending: 0,
    inProgress: 0,
    sentForReview: 0,
    requestChanges: 0,
    overdue: 0,
    completed: 0,
    readyToBill: 0,
    cancelled: 0,
    allTasks: 0,
  });

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories");
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>("All Tasks");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>("All Dept");
  const [selectedAssignee, setSelectedAssignee] = useState<string>(
    isEmployee ? (currentUser?.name || "") : (selectedAssigneeFilter || "All Assignees")
  );
  const [selectedSort, setSelectedSort] = useState<string>("Created Date");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("All Period");
  const [search, setSearch] = useState<string>("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Column resizing state
  const [colWidths, setColWidths] = useState<{ [key: string]: number }>({
    checkbox: 44,
    id: 110,
    taskName: 140,
    businessName: 280,
    pan: 130,
    legalName: 160,
    category: 120,
    service: 220,
    taskType: 140,
    billingStatus: 110,
    actions: 60,
  });

  const resizingCol = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const startResize = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingCol.current = {
      col,
      startX: e.clientX,
      startWidth: colWidths[col] || 120,
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const delta = e.clientX - resizingCol.current.startX;
    const newWidth = Math.max(50, resizingCol.current.startWidth + delta);
    setColWidths((prev) => ({
      ...prev,
      [resizingCol.current!.col]: newWidth,
    }));
  };

  const onMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  // Fetch tasks and KPI stats
  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const activeAssignee = isEmployee
        ? (currentUser?.name || employeeName)
        : selectedAssignee;

      const [tasksRes, statsRes] = await Promise.all([
        taskApi.getTasks({
          category: selectedCategory,
          quickFilter: selectedQuickFilter,
          status: selectedStatusFilter || undefined,
          assigneeName: activeAssignee,
          department: selectedDept,
          period: selectedPeriod !== "All Period" ? selectedPeriod : undefined,
          search,
          sortBy: selectedSort === "Created Date" ? "createdAt" : "targetDueDate",
          sortOrder: "desc",
        }),
        taskApi.getTaskStats(selectedCategory),
      ]);

      if (tasksRes.data) {
        setTasks(tasksRes.data);
      }
      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch {
      // Handled in api fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInvoice = (task: TaskItem) => {
    const trackedHrs = Number(task.trackedHours) || 3.5;
    const hrRate = Number(task.hourlyRate) || 1200;
    const hourlyBilling = Math.round(trackedHrs * hrRate);
    const baseFee = Number(task.serviceFee) || 5000;
    const totalProfessionalFee = baseFee + hourlyBilling;

    const draftInvoice = {
      type: "invoice",
      taskId: task.taskId,
      clientBusinessName: task.clientName,
      clientLegalName: task.legalName || task.clientName,
      clientId: task.clientId || "client-prefilled",
      clientGroup: task.groupName || "Clients",
      clientGstin: task.clientGstin || "",
      clientAddress: task.clientAddress || "",
      placeOfSupply: "27-Maharashtra",
      date: new Date().toLocaleDateString("en-GB"),
      dueDate: new Date(Date.now() + 15 * 86400000).toLocaleDateString("en-GB"),
      subTotal: totalProfessionalFee + (task.reimbursements ? 1500 : 0),
      totalPayable: totalProfessionalFee + (task.reimbursements ? 1500 : 0),
      services: [
        {
          id: "srv-from-task-1",
          serviceName: task.serviceName || task.taskName,
          description: `Professional execution fees for ${task.serviceName || task.taskName} (${trackedHrs} tracked hours @ ₹${hrRate}/hr + base fee ₹${baseFee})`,
          compliancePeriod: task.period || "FY 2026-27",
          frequency: task.frequency || "Monthly",
          periodLabel: task.period || "FY 2026-27",
          quantity: 1,
          price: totalProfessionalFee,
          amount: totalProfessionalFee,
          total: totalProfessionalFee,
        },
        ...(task.reimbursements
          ? [
              {
                id: "srv-from-task-reimb",
                serviceName: "Statutory MCA/ROC Filing Fee",
                description: "Government portal statutory charges",
                compliancePeriod: task.period || "FY 2026-27",
                frequency: "One-Time",
                periodLabel: "One-Time",
                quantity: 1,
                price: 1500,
                amount: 1500,
                total: 1500,
              },
            ]
          : []),
      ],
      notes: `Pre-filled from task ${task.taskId} - ${task.taskName}. Client: ${task.clientName}.`,
    };

    sessionStorage.setItem("turia_draft_invoice_from_task", JSON.stringify(draftInvoice));
    router.push("/invoice?fromTask=1");
  };

  const displayTasks = isEmployee
    ? tasks.filter((t) => {
        const myName = (currentUser?.name || employeeName).toLowerCase().trim();
        const tAssignee = (t.assigneeName || "").toLowerCase().trim();
        const myId = currentUser?.id || (currentUser as any)?._id;
        return (
          (myName && (tAssignee.includes(myName) || myName.includes(tAssignee))) ||
          (myId && t.assigneeId === myId)
        );
      })
    : tasks;

  useEffect(() => {
    if (isEmployee) {
      setSelectedAssignee(currentUser?.name || employeeName);
    }
  }, [isEmployee, currentUser?.name, employeeName]);

  useEffect(() => {
    fetchTasks();
  }, [
    selectedCategory,
    selectedQuickFilter,
    selectedStatusFilter,
    selectedDept,
    selectedAssignee,
    selectedSort,
    selectedPeriod,
    search,
  ]);

  useEffect(() => {
    teamStore
      .loadEmployeesFromBackend()
      .then((emps) => {
        if (emps && emps.length > 0) {
          const activeEmps = emps.filter((e) => e.status === "Active");
          setTeamMembers(
            activeEmps.map((e) => ({
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
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedAssigneeFilter) {
      setSelectedAssignee(selectedAssigneeFilter);
    }
  }, [selectedAssigneeFilter]);

  const handleClearFilters = () => {
    setSelectedCategory("All Categories");
    setSelectedQuickFilter("All Tasks");
    setSelectedStatusFilter(null);
    setSelectedDept("All Dept");
    setSelectedAssignee("All Assignees");
    setSelectedSort("Created Date");
    setSelectedPeriod("All Period");
    setSearch("");
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTaskIds(tasks.map((t) => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const handleToggleSelectTask = (id: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // 10 KPI Metric Cards definitions matching Image 4
  const KPI_CARDS = [
    {
      id: "wip",
      label: "WIP",
      value: stats.wip,
      icon: Zap,
      color: "text-[var(--primary)]",
      bg: "bg-[var(--brand-soft)]",
      filterStatus: "WIP",
    },
    {
      id: "pending",
      label: "Pending",
      value: stats.pending,
      icon: Hourglass,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      filterStatus: "Pending",
    },
    {
      id: "in-progress",
      label: "In Progress",
      value: stats.inProgress,
      icon: Clock,
      color: "text-cyan-500",
      bg: "bg-cyan-50 dark:bg-cyan-950/40",
      filterStatus: "In Progress",
    },
    {
      id: "sent-for-review",
      label: "Sent for Review",
      value: stats.sentForReview,
      icon: Eye,
      color: "text-[var(--primary)]",
      bg: "bg-[var(--brand-soft)]",
      filterStatus: "Sent for Review",
    },
    {
      id: "request-changes",
      label: "Request Changes",
      value: stats.requestChanges,
      icon: Edit2,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-950/40",
      filterStatus: "Request Changes",
    },
    {
      id: "overdue",
      label: "Overdue",
      value: stats.overdue,
      icon: Flame,
      color: "text-[var(--danger)]",
      bg: "bg-red-50 dark:bg-red-950/40",
      filterStatus: "Overdue",
    },
    {
      id: "completed",
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      filterStatus: "Completed",
    },
    {
      id: "ready-to-bill",
      label: "Ready to Bill",
      value: stats.readyToBill,
      icon: DollarSign,
      color: "text-teal-500",
      bg: "bg-teal-50 dark:bg-teal-950/40",
      filterStatus: "Ready to Bill",
    },
    {
      id: "cancelled",
      label: "Cancelled",
      value: stats.cancelled,
      icon: XCircle,
      color: "text-[var(--danger)]",
      bg: "bg-red-50 dark:bg-red-950/40",
      filterStatus: "Cancelled",
    },
    {
      id: "all-task",
      label: "All Task",
      value: stats.allTasks,
      icon: ListTodo,
      color: "text-[var(--primary)]",
      bg: "bg-[var(--brand-soft)]",
      filterStatus: null,
    },
  ];

  const QUICK_FILTERS = ["All Tasks", "My Tasks", "Due Today", "Live Task"];

  return (
    <div className="py-2">
      {/* 1. Category Chips Bar matching Image 4 */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs px-2">
        {TASK_CATEGORIES.slice(0, 6).map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedStatusFilter(null);
              }}
              style={{
                backgroundColor: isSelected ? "var(--primary)" : undefined,
                color: isSelected ? "#ffffff" : undefined,
              }}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${isSelected
                ? "shadow-xs"
                : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-main)] hover:bg-[var(--bg-hover)]"
                }`}
            >
              {cat}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => { }}
          className="px-3 py-1.5 rounded-full font-medium text-[var(--text-subtle)] bg-[var(--bg-surface)] border border-[var(--border-main)] hover:bg-[var(--bg-hover)] whitespace-nowrap flex items-center space-x-1"
        >
          <span>✢ Manage</span>
        </button>
      </div>

      {/* 2. 10 KPI Metric Cards matching Image 4 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 px-2">
        {KPI_CARDS.map((kpi) => {
          const Icon = kpi.icon;
          const isCardActive =
            kpi.filterStatus === selectedStatusFilter ||
            (kpi.filterStatus === null && selectedStatusFilter === null);

          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => setSelectedStatusFilter(kpi.filterStatus)}
              className={`p-2 rounded-sm border text-left transition-all ${isCardActive
                ? "border-[var(--primary)] ring-1 ring-[var(--primary)] bg-[var(--bg-surface)] shadow-xs"
                : "border-[var(--border-main)] bg-[var(--bg-surface)] hover:border-gray-300 dark:hover:border-gray-700"
                }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg font-bold text-[var(--text-main)]">
                  {kpi.value}
                </span>
                <span className={`p-1 rounded-md ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-[11px] font-medium text-[var(--text-subtle)] truncate">
                {kpi.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* 3. Secondary Filter Bar matching reference image with proper padding */}
      <div className="bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs space-y-3 px-2">
        {/* Top Row: Quick Filter Pills, Divider, Dropdown Filters, and Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1.5">
              {QUICK_FILTERS.map((qf) => {
                const isActive = selectedQuickFilter === qf;
                return (
                  <button
                    key={qf}
                    type="button"
                    onClick={() => setSelectedQuickFilter(qf)}
                    style={{
                      backgroundColor: isActive ? "var(--primary)" : "transparent",
                      color: isActive ? "#ffffff" : undefined,
                    }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${isActive
                      ? "shadow-xs"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                      }`}
                  >
                    {qf}
                  </button>
                );
              })}
            </div>

            {/* Vertical Separator */}
            <div className="h-5 w-[1px] bg-[var(--border-main)] mx-1 hidden sm:block" />

            {/* Dropdown Filters */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="h-9 px-3 py-1.5 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
            >
              {TASK_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={isEmployee ? employeeName : selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              disabled={isEmployee}
              className="h-9 px-3 py-1.5 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer disabled:opacity-85"
            >
              {isEmployee ? (
                <option value={employeeName}>{employeeName} (My Queue)</option>
              ) : (
                <>
                  <option value="All Assignees">All Assignees</option>
                  {teamMembers.map((tm) => (
                    <option key={tm.id} value={tm.name}>
                      {tm.name}
                    </option>
                  ))}
                </>
              )}
            </select>

            <select
              className="h-9 px-3 py-1.5 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none cursor-pointer"
            >
              <option value="">Group</option>
              <option value="Category">Category</option>
              <option value="Service">Service</option>
            </select>

            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="h-9 px-3 py-1.5 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
            >
              <option value="Created Date">Sort: Created Date</option>
              <option value="Due Date">Sort: Due Date</option>
            </select>

            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="h-9 px-3 py-1.5 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
            >
              <option value="All Period">Period</option>
              <option value="Jun 2026">Jun 2026</option>
              <option value="Jul 2026">Jul 2026</option>
              <option value="FY 2026 - 2027">FY 2026 - 2027</option>
            </select>
          </div>

          {/* Right Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)]" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 pr-3 text-xs bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg text-[var(--text-main)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] w-full lg:w-64"
            />
          </div>
        </div>

        {/* Bottom Row: Filter and Clear Filter Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            className="h-8 px-3 text-xs font-medium text-[var(--text-main)] bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
            <span>Filter</span>
          </button>

          <button
            type="button"
            onClick={handleClearFilters}
            className="h-8 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 border cursor-pointer"
            style={{
              color: "var(--danger)",
              borderColor: "var(--danger)",
              backgroundColor: "transparent",
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>
        </div>
      </div>

      {/* 4. Resizable Dense Data Table matching Image 4 */}
      <div className="bg-[var(--bg-surface)] overflow-hidden shadow-xs">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300 font-semibold select-none border-b border-[#dde2e8] dark:border-[#334155]"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                {/* Checkbox */}
                <th
                  style={{ width: `${colWidths.checkbox}px` }}
                  className="py-2.5 px-3 text-center"
                >
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      tasks.length > 0 && selectedTaskIds.length === tasks.length
                    }
                    className="w-3.5 h-3.5 rounded text-[var(--primary)] border-[var(--border-main)]"
                  />
                </th>

                {/* ID */}
                <th
                  style={{ width: `${colWidths.id}px` }}
                  className="relative py-2.5 px-3 group/th"
                >
                  <div className="flex items-center space-x-1 cursor-pointer">
                    <span>ID</span>
                    <ArrowUpDown className="w-3 h-3 text-[var(--text-subtle)]" />
                  </div>
                  <div
                    onMouseDown={(e) => startResize("id", e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--primary)] transition-colors"
                  />
                </th>

                {/* Task Name */}
                <th
                  style={{ width: `${colWidths.taskName}px` }}
                  className="relative py-2.5 px-3 group/th"
                >
                  <span>Task Name</span>
                  <div
                    onMouseDown={(e) => startResize("taskName", e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--primary)] transition-colors"
                  />
                </th>

                {/* Business Name */}
                <th
                  style={{ width: `${colWidths.businessName}px` }}
                  className="relative py-2.5 px-3 group/th"
                >
                  <span>Business Name</span>
                  <div
                    onMouseDown={(e) => startResize("businessName", e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--primary)] transition-colors"
                  />
                </th>

                {/* PAN Number */}
                <th
                  style={{ width: `${colWidths.pan}px` }}
                  className="relative py-2.5 px-3 group/th"
                >
                  <span>PAN Number</span>
                  <div
                    onMouseDown={(e) => startResize("pan", e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--primary)] transition-colors"
                  />
                </th>

                {/* Legal Name */}
                <th
                  style={{ width: `${colWidths.legalName}px` }}
                  className="relative py-2.5 px-3 group/th"
                >
                  <span>Legal Name</span>
                  <div
                    onMouseDown={(e) => startResize("legalName", e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--primary)] transition-colors"
                  />
                </th>

                {/* Category */}
                <th
                  style={{ width: `${colWidths.category}px` }}
                  className="relative py-2.5 px-3 group/th"
                >
                  <span>Category</span>
                  <div
                    onMouseDown={(e) => startResize("category", e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--primary)] transition-colors"
                  />
                </th>

                {/* Service */}
                <th
                  style={{ width: `${colWidths.service}px` }}
                  className="relative py-2.5 px-3 group/th"
                >
                  <span>Service</span>
                  <div
                    onMouseDown={(e) => startResize("service", e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--primary)] transition-colors"
                  />
                </th>

                {/* Task Type */}
                <th
                  style={{ width: `${colWidths.taskType}px` }}
                  className="relative py-2.5 px-3 group/th"
                >
                  <span>Task Type</span>
                  <div
                    onMouseDown={(e) => startResize("taskType", e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--primary)] transition-colors"
                  />
                </th>

                {/* Billing Status */}
                <th
                  style={{ width: `${colWidths.billingStatus}px` }}
                  className="relative py-2.5 px-3 group/th"
                >
                  <span>Billing St...</span>
                  <div
                    onMouseDown={(e) => startResize("billingStatus", e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--primary)] transition-colors"
                  />
                </th>

                {/* Actions */}
                <th
                  style={{ width: `${colWidths.actions}px` }}
                  className="py-2.5 px-3 text-center"
                >
                  <MoreVertical className="w-3.5 h-3.5 text-[var(--text-subtle)] mx-auto" />
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-main)]">
              {displayTasks.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[var(--text-placeholder)] text-xs">
                    No tasks found matching your filters.
                  </td>
                </tr>
              ) : (
                displayTasks.map((task) => {
                  const isChecked = selectedTaskIds.includes(task.id);
                  const isHexId = (val?: string) => Boolean(val && /^[0-9a-fA-F]{24}$/.test(val));
                  const properClientName =
                    task.clientName && !isHexId(task.clientName)
                      ? task.clientName
                      : (task.legalName && !isHexId(task.legalName)
                          ? task.legalName
                          : (task.clientFileNo ? `Client #${task.clientFileNo}` : "Client"));
                  const clientInitials = properClientName.substring(0, 2).toUpperCase();

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-[var(--bg-hover)] transition-colors ${isChecked ? "bg-[var(--brand-soft)]" : ""
                        }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectTask(task.id)}
                          className="w-3.5 h-3.5 rounded text-[var(--primary)] border-[var(--border-main)]"
                        />
                      </td>

                      {/* ID (Clickable Link to View) */}
                      <td className="py-2.5 px-3 font-semibold text-[var(--text-main)]">
                        <button
                          type="button"
                          onClick={() => onOpenTaskDetail(task.id)}
                          className="hover:underline transition-colors cursor-pointer text-left font-mono"
                          style={{ color: "var(--primary)" }}
                        >
                          {task.taskId}
                        </button>
                      </td>

                      {/* Task Name */}
                      <td className="py-2.5 px-3 text-[var(--text-main)] truncate max-w-[140px]">
                        {task.taskName}
                      </td>

                      {/* Business Name (Avatar + Code) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-x-2">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{
                              backgroundColor: "var(--brand-soft)",
                              color: "var(--primary)",
                            }}
                          >
                            {clientInitials}
                          </span>
                          <div className="truncate">
                            <span className="font-medium text-[var(--text-main)] block truncate">
                              {properClientName}
                            </span>
                            {task.clientFileNo && (
                              <span className="text-[10px] text-[var(--text-subtle)] font-mono block">
                                {task.clientFileNo}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* PAN Number */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-subtle)]">
                        {task.clientPan || "-"}
                      </td>

                      {/* Legal Name */}
                      <td className="py-2.5 px-3 text-[var(--text-muted)] truncate max-w-[160px]">
                        {task.legalName || "-"}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <span className="text-[var(--text-main)]">
                          {task.category || "-"}
                        </span>
                      </td>

                      {/* Service */}
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-[var(--text-main)] truncate block">
                          {task.serviceName}
                        </span>
                      </td>

                      {/* Task Type */}
                      <td className="py-2.5 px-3">
                        {task.taskType === "One-Time Task" ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-medium bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                            One-Time Task
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-medium bg-[var(--bg-subtle)] text-[var(--text-muted)] whitespace-nowrap">
                            <Repeat className="w-2.5 h-2.5 mr-1" />
                            Recurring Task
                          </span>
                        )}
                      </td>

                      {/* Billing Status */}
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                          {task.billingType === "Billable" ? "Billable" : "Non Billable"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {task.status === "Ready to Bill" && !isEmployee && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateInvoice(task);
                              }}
                              title="Generate Invoice from task"
                              className="px-2.5 py-1 rounded bg-[var(--brand-soft)] hover:bg-[var(--primary-light)] text-[var(--primary)] font-bold text-[10.5px] inline-flex items-center space-x-1 transition-all shadow-2xs whitespace-nowrap cursor-pointer"
                            >
                              <ReceiptText className="w-3.5 h-3.5" />
                              <span>Generate Invoice</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenTaskDetail(task.id)}
                            aria-label={`View details for task ${task.taskId}`}
                            className="text-[var(--text-subtle)] hover:text-[var(--text-main)] p-1 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
