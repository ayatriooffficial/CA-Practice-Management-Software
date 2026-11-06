"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Loader2, CheckCircle2, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { GroupRecord } from "@/services/groupApi";
import { taskApi } from "@/services/taskApi";
import { TaskItem } from "@/data/taskData";
import { Input } from "@/components/ui/Input";

interface GroupTasksTabProps {
  group: GroupRecord;
}

export const GroupTasksTab: React.FC<GroupTasksTabProps> = ({ group }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const clientIdsSet = useMemo(() => {
    const set = new Set<string>();
    (group.clientIds || []).forEach((c: any) => {
      const cid = typeof c === "string" ? c : c.id || c._id?.toString();
      if (cid) set.add(cid);
    });
    return set;
  }, [group.clientIds]);

  const clientNamesSet = useMemo(() => {
    const set = new Set<string>();
    (group.entities || []).forEach((e: any) => {
      if (e.name) set.add(e.name.toLowerCase().trim());
    });
    return set;
  }, [group.entities]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    taskApi
      .getTasks({ limit: 300 })
      .then((res) => {
        if (!isMounted) return;
        if (res && res.data) {
          const matched = res.data.filter((t) => {
            const matchId = t.clientId && clientIdsSet.has(t.clientId);
            const matchName = t.clientName && clientNamesSet.has(t.clientName.toLowerCase().trim());
            return matchId || matchName;
          });
          setTasks(matched);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [clientIdsSet, clientNamesSet]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all") {
        const st = (t.status || "").toLowerCase();
        if (statusFilter === "open" && (st === "completed" || st === "cancelled")) return false;
        if (statusFilter === "completed" && st !== "completed") return false;
        if (statusFilter === "hold" && st !== "hold" && st !== "on hold") return false;
      }
      if (search.trim()) {
        const term = search.toLowerCase();
        return (
          (t.taskName && t.taskName.toLowerCase().includes(term)) ||
          (t.clientName && t.clientName.toLowerCase().includes(term)) ||
          (t.assigneeName && t.assigneeName.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [tasks, statusFilter, search]);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-[#dde2e8] dark:border-[#334155]">
        <div className="flex items-center gap-2">
          {["all", "open", "completed", "hold"].map((sf) => (
            <button
              key={sf}
              type="button"
              onClick={() => setStatusFilter(sf)}
              className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors cursor-pointer ${
                statusFilter === sf
                  ? "bg-purple-50 dark:bg-purple-950/50 text-[#31719B] dark:text-[#93c5fd] border border-purple-200 dark:border-purple-800"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {sf === "all" ? `All Tasks (${tasks.length})` : sf}
            </button>
          ))}
        </div>

        <div className="min-w-[200px] sm:min-w-[260px]">
          <Input
            inputSize="sm"
            placeholder="Search group tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            leftIcon={<Search className="w-3.5 h-3.5 text-gray-400" />}
          />
        </div>
      </div>

      {/* Task Table */}
      <div className="w-full bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] rounded-none overflow-x-auto shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/70 dark:bg-slate-800/60 border-b border-[#dde2e8] dark:border-[#334155] text-gray-500 dark:text-gray-400 font-semibold select-none">
              <th className="py-2.5 px-3 min-w-[200px]">Task Name</th>
              <th className="py-2.5 px-3 min-w-[160px]">Client</th>
              <th className="py-2.5 px-3 min-w-[120px]">Assigned To</th>
              <th className="py-2.5 px-3 min-w-[90px]">Due Date</th>
              <th className="py-2.5 px-3 min-w-[90px]">Status</th>
              <th className="py-2.5 px-3 min-w-[90px]">Billing</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#31719B]" />
                  <span>Loading group tasks...</span>
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    No tasks for this Group's clients yet.
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Tasks created for any client in this group will automatically show up here.
                  </p>
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <Link
                      href={`/task?taskId=${task.id}`}
                      className="font-semibold text-[#31719B] hover:underline flex items-center gap-1"
                    >
                      <span>{task.taskName}</span>
                      <ExternalLink size={10} className="shrink-0 text-gray-400" />
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-slate-200">
                    {task.clientName}
                  </td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                    {task.assigneeName || "-"}
                  </td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{task.targetDueDate || "-"}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        task.status === "Completed"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200"
                          : task.status === "In Progress"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200"
                      }`}
                    >
                      {task.status || "Pending"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      {task.billingStatus || "Unbilled"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
