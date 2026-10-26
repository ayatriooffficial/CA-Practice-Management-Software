"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  UserCheck,
  Plus,
  Search,
  Mail,
  MessageCircle,
  Shield,
  Briefcase,
  Layers,
  Trash2,
  X,
  Users,
} from "lucide-react";
import { Client } from "@/data/crmData";
import { TaskItem } from "@/data/taskData";
import { teamStore } from "@/components/team/teamStore";
import { EmployeeRecord } from "@/components/team/types";
import { clientApi } from "@/services/clientApi";

interface ClientAssigneeTabProps {
  client: Client;
  clientTasks?: TaskItem[];
  onClientUpdated?: (client: Client) => void;
  showToast?: (msg: string) => void;
}

interface AssignedMemberDetails {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  role?: string;
  designation?: string;
  department?: string;
  isDirectAssignee: boolean;
  assignedServices: string[];
  activeTaskCount: number;
}

const getRoleBadge = (role?: string) => {
  const norm = (role || "").toLowerCase();
  if (norm === "admin") return "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300";
  if (norm === "partner") return "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300";
  if (norm === "manager") return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

const getInitials = (name: string): string => {
  if (!name) return "US";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const ClientAssigneeTab: React.FC<ClientAssigneeTabProps> = ({
  client,
  clientTasks = [],
  onClientUpdated,
  showToast,
}) => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load team employees
  useEffect(() => {
    let isMounted = true;
    const initialList = teamStore.getEmployees();
    setEmployees(initialList);

    teamStore
      .loadEmployeesFromBackend()
      .then((backendList) => {
        if (isMounted && backendList && backendList.length > 0) {
          setEmployees(backendList);
        }
      })
      .catch((err) => {
        console.warn("Could not load backend employees:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Map of employees by ID, name, email for fast lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, EmployeeRecord>();
    employees.forEach((emp) => {
      if (emp.id) map.set(emp.id.toLowerCase(), emp);
      if (emp.name) map.set(emp.name.toLowerCase(), emp);
      if (emp.email) map.set(emp.email.toLowerCase(), emp);
    });
    return map;
  }, [employees]);

  // Consolidate all assignees for this client
  const assignedList = useMemo(() => {
    const memberMap = new Map<string, AssignedMemberDetails>();

    // 1. Direct assignees in client.users
    const directUsers = client.users || [];
    directUsers.forEach((u) => {
      const uStr = String(u).trim();
      if (!uStr) return;
      const key = uStr.toLowerCase();
      const matchedEmp = employeeMap.get(key);

      memberMap.set(key, {
        id: matchedEmp?.id || uStr,
        name: matchedEmp?.name || uStr,
        email: matchedEmp?.email,
        mobile: matchedEmp?.mobile,
        role: matchedEmp?.role || "Employee",
        designation: matchedEmp?.designation || "Assigned Staff",
        department: matchedEmp?.department,
        isDirectAssignee: true,
        assignedServices: [],
        activeTaskCount: 0,
      });
    });

    // 2. Service-level assignees
    const serviceSettings = client.serviceSettings || [];
    serviceSettings.forEach((srv) => {
      const isSrvActive = srv.isActive !== undefined ? Boolean(srv.isActive) : Boolean(srv.compliance);
      if (isSrvActive && srv.assignee) {
        const aStr = srv.assignee.trim();
        if (aStr) {
          const key = aStr.toLowerCase();
          const matchedEmp = employeeMap.get(key);
          const existing = memberMap.get(key);
          if (existing) {
            if (!existing.assignedServices.includes(srv.serviceName)) {
              existing.assignedServices.push(srv.serviceName);
            }
          } else {
            memberMap.set(key, {
              id: matchedEmp?.id || aStr,
              name: matchedEmp?.name || aStr,
              email: matchedEmp?.email,
              mobile: matchedEmp?.mobile,
              role: matchedEmp?.role || "Employee",
              designation: matchedEmp?.designation || "Service Specialist",
              department: matchedEmp?.department,
              isDirectAssignee: false,
              assignedServices: [srv.serviceName],
              activeTaskCount: 0,
            });
          }
        }
      }
    });

    // 3. Task-level assignees
    clientTasks.forEach((t) => {
      if (t.status !== "Completed" && t.assigneeName) {
        const tAssignee = t.assigneeName.trim();
        const key = tAssignee.toLowerCase();
        const matchedEmp = employeeMap.get(key);
        const existing = memberMap.get(key);
        if (existing) {
          existing.activeTaskCount += 1;
        } else {
          memberMap.set(key, {
            id: matchedEmp?.id || t.assigneeId || tAssignee,
            name: matchedEmp?.name || tAssignee,
            email: matchedEmp?.email,
            mobile: matchedEmp?.mobile,
            role: matchedEmp?.role || "Employee",
            designation: matchedEmp?.designation || "Task Assignee",
            department: matchedEmp?.department,
            isDirectAssignee: false,
            assignedServices: [],
            activeTaskCount: 1,
          });
        }
      }
    });

    return Array.from(memberMap.values()).sort((a, b) => {
      if (a.isDirectAssignee && !b.isDirectAssignee) return -1;
      if (!a.isDirectAssignee && b.isDirectAssignee) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [client.users, client.serviceSettings, clientTasks, employeeMap]);

  // Filter by search query
  const filteredAssignees = useMemo(() => {
    if (!search.trim()) return assignedList;
    const q = search.toLowerCase();
    return assignedList.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.designation && m.designation.toLowerCase().includes(q)) ||
        (m.role && m.role.toLowerCase().includes(q)) ||
        m.assignedServices.some((s) => s.toLowerCase().includes(q))
    );
  }, [assignedList, search]);

  // List of team members not yet directly assigned
  const availableToAssign = useMemo(() => {
    const existingDirect = new Set((client.users || []).map((u) => u.toLowerCase()));
    return employees.filter(
      (emp) =>
        emp.status !== "Deactivated" &&
        emp.status !== "Resigned" &&
        !existingDirect.has(emp.name.toLowerCase()) &&
        !existingDirect.has((emp.id || "").toLowerCase())
    );
  }, [employees, client.users]);

  // Handle assigning a new team member
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;

    const empToAssign = employees.find((e) => e.id === selectedEmpId);
    const identifier = empToAssign?.name || selectedEmpId;

    const currentUsers = client.users || [];
    if (currentUsers.some((u) => u.toLowerCase() === identifier.toLowerCase())) {
      setIsAssignModalOpen(false);
      return;
    }

    const updatedUsers = [...currentUsers, identifier];
    setIsSaving(true);
    try {
      const res = await clientApi.updateClient(client.id, { users: updatedUsers });
      const updatedClient = res.data || { ...client, users: updatedUsers };
      onClientUpdated?.(updatedClient);
      showToast?.(`Assigned ${identifier} to ${client.name}.`);
      setIsAssignModalOpen(false);
      setSelectedEmpId("");
    } catch (err: any) {
      showToast?.(err.message || "Failed to assign team member.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle removing a direct assignee
  const handleRemoveAssignee = async (member: AssignedMemberDetails) => {
    const currentUsers = client.users || [];
    const updatedUsers = currentUsers.filter(
      (u) =>
        u.toLowerCase() !== member.name.toLowerCase() &&
        u.toLowerCase() !== member.id.toLowerCase()
    );

    try {
      const res = await clientApi.updateClient(client.id, { users: updatedUsers });
      const updatedClient = res.data || { ...client, users: updatedUsers };
      onClientUpdated?.(updatedClient);
      showToast?.(`Removed ${member.name} from client direct assignees.`);
    } catch (err: any) {
      showToast?.(err.message || "Failed to remove assignee.");
    }
  };

  const directCount = assignedList.filter((m) => m.isDirectAssignee).length;
  const serviceAssigneeCount = assignedList.filter((m) => m.assignedServices.length > 0).length;
  const totalActiveTasks = assignedList.reduce((acc, m) => acc + m.activeTaskCount, 0);

  return (
    <div className="w-full space-y-4">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#1e293b] p-3.5 rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-xs flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "var(--primary-light)", color: "var(--primary)" }}
          >
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Total Assignees</div>
            <div className="text-base font-bold text-gray-900 dark:text-white">{assignedList.length}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e293b] p-3.5 rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Account Handlers</div>
            <div className="text-base font-bold text-gray-900 dark:text-white">{directCount}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e293b] p-3.5 rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Service Handlers</div>
            <div className="text-base font-bold text-gray-900 dark:text-white">{serviceAssigneeCount}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e293b] p-3.5 rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Active Tasks</div>
            <div className="text-base font-bold text-gray-900 dark:text-white">{totalActiveTasks}</div>
          </div>
        </div>
      </div>

      {/* Header with Search and Assign Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-[#dde2e8] dark:border-[#334155]">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Client Assignees ({assignedList.length})
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Designated team members managing services and tasks for {client.name}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative min-w-[200px] md:min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search assignees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#475569] rounded-md text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-[#31719B]"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-white shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Member</span>
          </button>
        </div>
      </div>

      {/* Table Format matching client tabs design */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300 font-semibold"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] min-w-[180px]">
                  Assignee Name
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] min-w-[110px]">
                  Role
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] min-w-[150px]">
                  Designation / Dept
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] min-w-[180px]">
                  Contact
                </th>
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] min-w-[240px]">
                  Assigned Scope
                </th>
                <th className="px-4 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center min-w-[100px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {filteredAssignees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "var(--primary-light)", color: "var(--primary)" }}
                      >
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        No assignees assigned yet for {client.name}
                      </p>
                      <p className="text-[11px] text-gray-400 max-w-sm">
                        Assign team members to manage account communication, compliance services, and client tasks.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAssignModalOpen(true)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-colors cursor-pointer"
                        style={{ backgroundColor: "var(--premium-blue-dark)" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")
                        }
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Assign Team Member</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssignees.map((member) => {
                  const initials = getInitials(member.name);
                  const roleBadgeClass = getRoleBadge(member.role);

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      {/* Assignee Name */}
                      <td className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0"
                            style={{
                              backgroundColor: "var(--primary-light)",
                              color: "var(--primary)",
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white block">
                              {member.name}
                            </span>
                            {member.isDirectAssignee && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <Shield className="w-2.5 h-2.5" /> Account Handler
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleBadgeClass}`}>
                          {member.role || "Employee"}
                        </span>
                      </td>

                      {/* Designation / Dept */}
                      <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300">
                        <div className="font-medium text-xs text-gray-800 dark:text-gray-200">
                          {member.designation || "Staff"}
                        </div>
                        {member.department && (
                          <div className="text-[10px] text-gray-400">{member.department}</div>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                        <div className="space-y-0.5">
                          {member.email && (
                            <a
                              href={`mailto:${member.email}?subject=Client%20Followup%20${encodeURIComponent(client.name)}`}
                              className="text-gray-700 dark:text-gray-300 hover:text-[#31719B] flex items-center gap-1 text-[11px] truncate max-w-[160px]"
                              title={member.email}
                            >
                              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">{member.email}</span>
                            </a>
                          )}
                          {member.mobile && (
                            <span className="text-gray-500 dark:text-gray-400 text-[11px] flex items-center gap-1">
                              <span>📞</span>
                              <span>{member.mobile}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Assigned Scope */}
                      <td className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {member.isDirectAssignee && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60">
                              Client Manager
                            </span>
                          )}
                          {member.assignedServices.map((srv, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60"
                            >
                              {srv}
                            </span>
                          ))}
                          {member.activeTaskCount > 0 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 flex items-center gap-1">
                              <Briefcase className="w-2.5 h-2.5" />
                              <span>{member.activeTaskCount} task{member.activeTaskCount > 1 ? "s" : ""}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {member.email && (
                            <a
                              href={`mailto:${member.email}?subject=Client%20Followup%20${encodeURIComponent(client.name)}`}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-[#31719B] transition-colors cursor-pointer"
                              title={`Email ${member.email}`}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {member.mobile && (
                            <button
                              type="button"
                              onClick={() => {
                                const num = (member.mobile || "").replace(/[^0-9]/g, "");
                                const intl = num.length === 10 ? `91${num}` : num;
                                window.open(`https://wa.me/${intl}`, "_blank");
                              }}
                              className="p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 transition-colors cursor-pointer"
                              title={`WhatsApp ${member.mobile}`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {member.isDirectAssignee && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAssignee(member)}
                              className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Unassign from client"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Assign Member Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: "var(--primary-light)", color: "var(--primary)" }}
                >
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Assign Team Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Select Team Member <span className="text-red-500">*</span>
                </label>
                {availableToAssign.length === 0 ? (
                  <div className="text-xs text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                    All active team members are already assigned to this client.
                  </div>
                ) : (
                  <select
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#475569] rounded-md text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#31719B]"
                  >
                    <option value="">-- Choose Member --</option>
                    {availableToAssign.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role} - {emp.designation || "Staff"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-lg leading-relaxed">
                Assigning this member designates them as an account handler for {client.name}. They will be visible in client communications, service management, and workflow allocations.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-gray-700 dark:text-gray-300 border border-[#dde2e8] dark:border-[#475569] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedEmpId || isSaving}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")
                  }
                >
                  {isSaving ? "Assigning..." : "Assign to Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
