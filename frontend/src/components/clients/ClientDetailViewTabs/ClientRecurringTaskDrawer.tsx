import React, { useState, useEffect, useMemo } from "react";
import {
  Tag,
  Pencil,
  Check,
  X,
  Loader2,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { ClientServiceSetting } from "@/data/crmData";
import { teamStore } from "@/components/team/teamStore";

export interface TeamUserOption {
  id: string;
  name: string;
  role?: string;
  email?: string;
}

export interface ClientRecurringTaskDrawerProps {
  editingService: ClientServiceSetting;
  setEditingService: React.Dispatch<React.SetStateAction<ClientServiceSetting | null>>;
  onSave: (updatedSetting: ClientServiceSetting, keepDrawerOpen?: boolean) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  availableUsers?: Array<string | TeamUserOption>;
}

const STANDARD_DAYS = [
  "Day 1",
  "Day 2",
  "Day 3",
  "Day 5",
  "Day 7",
  "Day 10",
  "Day 15",
  "Day 20",
  "Day 25",
  "Day 30",
  "Day 45",
  "Day 59",
  "Day 60",
  "Day 61",
  "Day 75",
  "Day 90",
];

export function calculateDateFromDayStr(
  dayStr: string | number | undefined,
  baseMonth: number = 3, // April
  baseYear: number = 2026
): string {
  if (!dayStr) return "—";
  const num =
    typeof dayStr === "number"
      ? dayStr
      : parseInt(String(dayStr).replace(/\D/g, ""), 10);
  if (isNaN(num) || num < 1) return "—";

  const d = new Date(baseYear, baseMonth, num);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const m = months[d.getMonth()];
  const day = d.getDate();
  const y = d.getFullYear();

  const getSuffix = (n: number) => {
    if (n > 3 && n < 21) return `${n}th`;
    switch (n % 10) {
      case 1:
        return `${n}st`;
      case 2:
        return `${n}nd`;
      case 3:
        return `${n}rd`;
      default:
        return `${n}th`;
    }
  };

  return `(${m} ${getSuffix(day)} ${y})`;
}

export const ClientRecurringTaskDrawer: React.FC<ClientRecurringTaskDrawerProps> = ({
  editingService,
  setEditingService,
  onSave,
  onCancel,
  isSaving,
  availableUsers,
}) => {
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState<string>(
    String(editingService.amount ?? 0)
  );

  // Load real team members from store and backend API
  const [teamMembers, setTeamMembers] = useState<TeamUserOption[]>(() => {
    try {
      const emps = teamStore.getEmployees();
      if (emps && emps.length > 0) {
        return emps
          .filter((e) => e.status !== "Deactivated" && e.status !== "Resigned")
          .map((e) => ({
            id: e.id,
            name: e.name,
            role: e.role,
            email: e.email,
          }));
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingTeam(true);
    teamStore
      .loadEmployeesFromBackend()
      .then((emps) => {
        if (isMounted && emps && emps.length > 0) {
          const active = emps
            .filter((e) => e.status !== "Deactivated" && e.status !== "Resigned")
            .map((e) => ({
              id: e.id,
              name: e.name,
              role: e.role,
              email: e.email,
            }));
          setTeamMembers(active);
        }
      })
      .catch((err) => {
        console.warn("Failed to load real team members:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingTeam(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const taskName = editingService.taskName || editingService.serviceName;
  const frequency = editingService.frequency || "Quarterly";
  const priority = editingService.priority || "Low";
  const startDay = editingService.start || "Day 1";
  const targetDay = editingService.target || "Day 59";
  const endDay = editingService.end || "Day 61";
  const assignee = editingService.assignee || "";
  const reviewer = editingService.reviewer || "";

  // Combine real team members with optional prop & ensure existing assignee/reviewer stay visible
  const memberList: TeamUserOption[] = useMemo(() => {
    const map = new Map<string, TeamUserOption>();

    if (availableUsers && availableUsers.length > 0) {
      availableUsers.forEach((u) => {
        if (typeof u === "string") {
          map.set(u.toLowerCase(), { id: u, name: u });
        } else if (u && u.name) {
          map.set(u.name.toLowerCase(), {
            id: u.id || u.name,
            name: u.name,
            role: u.role,
            email: u.email,
          });
        }
      });
    }

    teamMembers.forEach((m) => {
      if (m.name && !map.has(m.name.toLowerCase())) {
        map.set(m.name.toLowerCase(), m);
      }
    });

    if (assignee && !map.has(assignee.toLowerCase())) {
      map.set(assignee.toLowerCase(), { id: assignee, name: assignee });
    }
    if (reviewer && !map.has(reviewer.toLowerCase())) {
      map.set(reviewer.toLowerCase(), { id: reviewer, name: reviewer });
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [availableUsers, teamMembers, assignee, reviewer]);

  const startDateText = calculateDateFromDayStr(startDay);
  const targetDateText = calculateDateFromDayStr(targetDay);
  const endDateText = calculateDateFromDayStr(endDay);

  const [isSavingRate, setIsSavingRate] = useState(false);

  const handleConfirmRate = async () => {
    const parsed = parseFloat(tempRate);
    const newAmount = isNaN(parsed) ? 0 : parsed;
    const updated: ClientServiceSetting = {
      ...editingService,
      amount: newAmount,
    };
    setEditingService(updated);
    setIsEditingRate(false);

    try {
      setIsSavingRate(true);
      await onSave(updated, true); // keep drawer open!
    } catch (err) {
      console.error("Failed to update service rate for client:", err);
    } finally {
      setIsSavingRate(false);
    }
  };

  const handleFieldChange = (key: keyof ClientServiceSetting, val: any) => {
    setEditingService((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: val,
      };
    });
  };

  const handleSaveAll = async () => {
    let finalAmount = editingService.amount ?? 0;
    if (isEditingRate || tempRate !== String(editingService.amount ?? 0)) {
      const parsed = parseFloat(tempRate);
      if (!isNaN(parsed)) {
        finalAmount = parsed;
      }
    }

    const isRecTaskEnabled = editingService.recTask !== "Disabled";
    const updated: ClientServiceSetting = {
      ...editingService,
      amount: finalAmount,
      taskName,
      frequency,
      priority,
      start: startDay,
      target: targetDay,
      end: endDay,
      startDate: startDateText.replace(/[()]/g, ""),
      targetDate: targetDateText.replace(/[()]/g, ""),
      endDate: endDateText.replace(/[()]/g, ""),
      assignee,
      reviewer,
      recTask: isRecTaskEnabled ? "Enabled" : "Disabled",
      recInvoice: editingService.recInvoice === "Enabled" ? "Enabled" : "Disabled",
    };
    await onSave(updated, false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
      {/* CARD 1: SERVICE RATE (Left ~2.5 cols) */}
      <div className="lg:col-span-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 p-5 flex flex-col justify-between shadow-2xs">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-[#31719B] dark:text-[#6db0db]">
              <Tag className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold tracking-wider uppercase">
                SERVICE RATE
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isEditingRate && (
                <button
                  type="button"
                  disabled={isSavingRate}
                  onClick={() => {
                    setTempRate(String(editingService.amount ?? 0));
                    setIsEditingRate(false);
                  }}
                  title="Cancel rate edit"
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                disabled={isSavingRate}
                onClick={() => {
                  if (isEditingRate) {
                    handleConfirmRate();
                  } else {
                    setTempRate(String(editingService.amount ?? 0));
                    setIsEditingRate(true);
                  }
                }}
                title={isEditingRate ? "Save rate for this client" : "Edit rate"}
                className="p-1 rounded-md text-[#31719B] dark:text-[#6db0db] hover:bg-blue-100/50 dark:hover:bg-blue-900/40 cursor-pointer transition-colors"
              >
                {isSavingRate ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isEditingRate ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Pencil className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {isEditingRate ? (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-lg font-bold text-gray-500">₹</span>
              <input
                type="number"
                min={0}
                value={tempRate}
                onChange={(e) => setTempRate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmRate();
                  else if (e.key === "Escape") {
                    setTempRate(String(editingService.amount ?? 0));
                    setIsEditingRate(false);
                  }
                }}
                autoFocus
                className="w-full h-9 px-2.5 rounded-md border border-[#31719B] bg-white dark:bg-gray-900 font-bold text-lg text-gray-900 dark:text-white outline-none"
              />
            </div>
          ) : (
            <div
              onClick={() => {
                setTempRate(String(editingService.amount ?? 0));
                setIsEditingRate(true);
              }}
              title="Click to edit rate for this client"
              className="text-2xl lg:text-3xl font-extrabold text-[#31719B] dark:text-[#6db0db] tracking-tight mt-1 cursor-pointer hover:opacity-85 transition-opacity"
            >
              ₹ {editingService.amount ? editingService.amount.toLocaleString() : "0"}
            </div>
          )}
        </div>

        <div className="pt-4 text-[11px] text-gray-400 dark:text-gray-500">
          Base fee billed to client for this service
        </div>
      </div>

      {/* CARD 2: RECURRING TASK (Middle ~6 cols matching Screenshot) */}
      <div className="lg:col-span-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
              RECURRING TASK
            </span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <input
                type="checkbox"
                checked={editingService.recTask !== "Disabled"}
                onChange={(e) => {
                  const checked = e.target.checked;
                  handleFieldChange("recTask", checked ? "Enabled" : "Disabled");
                }}
                className="w-3.5 h-3.5 accent-[#31719B] rounded cursor-pointer"
              />
              <span className={editingService.recTask !== "Disabled" ? "text-[#31719B] font-medium" : "text-gray-400"}>
                {editingService.recTask !== "Disabled" ? "Enabled" : "Disabled"}
              </span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-white px-2 py-1 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
              className="px-4 py-1.5 rounded-md text-xs font-semibold text-white hover:opacity-90 shadow-xs cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Row 1: Task Name, Frequency, Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Task Name */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Task Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => handleFieldChange("taskName", e.target.value)}
              placeholder="e.g. TDS Return - Form 26Q"
              className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none focus:border-[#31719B]"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              value={frequency}
              onChange={(e) => handleFieldChange("frequency", e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none focus:border-[#31719B] cursor-pointer"
            >
              <option value="Quarterly">Quarterly</option>
              <option value="Monthly">Monthly</option>
              <option value="Half-Yearly">Half-Yearly</option>
              <option value="Annually">Annually</option>
              <option value="Weekly">Weekly</option>
              <option value="One-Time">One-Time</option>
              <option value="As-Needed">As-Needed</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Priority <span className="text-red-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => handleFieldChange("priority", e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none focus:border-[#31719B] cursor-pointer"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Row 2: Start Day, Target Day, End Day */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Start Day */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Start Day <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={startDay}
                onChange={(e) => handleFieldChange("start", e.target.value)}
                placeholder="Day 1"
                className="w-full h-8 px-2.5 pr-6 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none focus:border-[#31719B]"
              />
              {startDay && (
                <button
                  type="button"
                  onClick={() => handleFieldChange("start", "Day 1")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="block text-[10.5px] text-gray-400 dark:text-gray-500 mt-1 font-medium">
              {startDateText}
            </span>
          </div>

          {/* Target Day */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Target Day
            </label>
            <input
              type="text"
              value={targetDay}
              onChange={(e) => handleFieldChange("target", e.target.value)}
              placeholder="Day 59"
              className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none focus:border-[#31719B]"
            />
            <span className="block text-[10.5px] text-gray-400 dark:text-gray-500 mt-1 font-medium">
              {targetDateText}
            </span>
          </div>

          {/* End Day */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
              End Day
            </label>
            <input
              type="text"
              value={endDay}
              onChange={(e) => handleFieldChange("end", e.target.value)}
              placeholder="Day 61"
              className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none focus:border-[#31719B]"
            />
            <span className="block text-[10.5px] text-gray-400 dark:text-gray-500 mt-1 font-medium">
              {endDateText}
            </span>
          </div>
        </div>

        {/* Row 3: Assignee & Reviewer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Assignee */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Assignee <span className="text-red-500">*</span>
            </label>
            <select
              value={assignee}
              onChange={(e) => handleFieldChange("assignee", e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none focus:border-[#31719B] cursor-pointer"
            >
              <option value="">
                {isLoadingTeam && memberList.length === 0 ? "Loading team..." : "Assignee"}
              </option>
              {memberList.map((u) => (
                <option key={u.id || u.name} value={u.name}>
                  {u.name} {u.role ? `(${u.role})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Reviewer */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Reviewer
            </label>
            <select
              value={reviewer}
              onChange={(e) => handleFieldChange("reviewer", e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none focus:border-[#31719B] cursor-pointer"
            >
              <option value="">Reviewer</option>
              {memberList.map((u) => (
                <option key={u.id || u.name} value={u.name}>
                  {u.name} {u.role ? `(${u.role})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CARD 3: RECURRING INVOICE (Right ~3 cols) */}
      <div className="lg:col-span-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                RECURRING INVOICE
              </span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <input
                  type="checkbox"
                  checked={editingService.recInvoice === "Enabled"}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditingService({
                      ...editingService,
                      recInvoice: checked ? "Enabled" : "Disabled",
                      invFreq: editingService.invFreq || editingService.frequency || "Monthly",
                      invDay: editingService.invDay || 1,
                    });
                  }}
                  className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
                />
                <span className={editingService.recInvoice === "Enabled" ? "text-emerald-600" : "text-gray-400"}>
                  {editingService.recInvoice === "Enabled" ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextRec =
                  editingService.recInvoice === "Enabled" ? "Disabled" : "Enabled";
                setEditingService({
                  ...editingService,
                  recInvoice: nextRec,
                  invFreq: editingService.invFreq || editingService.frequency || "Monthly",
                  invDay: editingService.invDay || 1,
                });
              }}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer"
            >
              {editingService.recInvoice === "Enabled" ? "Remove" : "Add"}
            </button>
          </div>

          {editingService.recInvoice === "Enabled" ? (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Invoice Frequency
                </label>
                <select
                  value={editingService.invFreq || "Monthly"}
                  onChange={(e) => handleFieldChange("invFreq", e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none focus:border-[#31719B] cursor-pointer"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Annually">Annually</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Invoice Day
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={editingService.invDay || 1}
                  onChange={(e) =>
                    handleFieldChange(
                      "invDay",
                      parseInt(e.target.value, 10) || 1
                    )
                  }
                  className="w-full h-8 px-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none focus:border-[#31719B]"
                />
              </div>

              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  <Check className="w-3 h-3" /> Auto-invoice active
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-xs">
              <p>No recurring invoice rule configured.</p>
              <p className="text-[11px] mt-1 text-gray-400">
                Click &quot;Add&quot; to automate billing for this service.
              </p>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 dark:text-gray-500">
          Auto-generates draft invoice for client
        </div>
      </div>
    </div>
  );
};
