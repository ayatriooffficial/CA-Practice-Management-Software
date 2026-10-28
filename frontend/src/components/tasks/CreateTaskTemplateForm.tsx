"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  X,
  Repeat,
  Plus,
  Trash2,
  AlertCircle,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
  Smile,
} from "lucide-react";
import { taskApi } from "@/services/taskApi";
import { teamStore } from "@/components/team/teamStore";
import { TeamMember } from "@/data/teamData";
import {
  TASK_DEPARTMENTS,
  TaskPriority,
  TaskTemplateChecklistItem,
  TaskTemplateItem,
} from "@/data/taskData";

const FREQUENCY_OPTIONS = [
  "One-time",
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Annual",
];

const PRIORITY_OPTIONS: TaskPriority[] = ["Low", "Medium", "High"];

const ACCENT_COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#10B981", // Green
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
];

export interface CreateTaskTemplateFormProps {
  templateId?: string;
  initialTemplate?: TaskTemplateItem | null;
  onSuccess?: (template: TaskTemplateItem) => void;
  onCancel?: () => void;
}

export const CreateTaskTemplateForm: React.FC<CreateTaskTemplateFormProps> = ({
  templateId,
  initialTemplate,
  onSuccess,
  onCancel,
}) => {
  const router = useRouter();

  const [templateName, setTemplateName] = useState(initialTemplate?.templateName || "");
  const [taskTitle, setTaskTitle] = useState(initialTemplate?.taskTitle || "");
  const [category, setCategory] = useState(initialTemplate?.category || initialTemplate?.department || "GST");
  const [priority, setPriority] = useState<TaskPriority>(initialTemplate?.priority || "Medium");
  const [estimatedHours, setEstimatedHours] = useState(initialTemplate?.estimatedHours || "");
  const [defaultAssigneeId, setDefaultAssigneeId] = useState(initialTemplate?.defaultAssigneeId || "");
  const [defaultReviewerId, setDefaultReviewerId] = useState(initialTemplate?.defaultReviewerId || "");
  const [labels, setLabels] = useState("");
  const [frequency, setFrequency] = useState(initialTemplate?.frequency || "One-time");
  const [accentColor, setAccentColor] = useState("#3B82F6");
  const [description, setDescription] = useState(initialTemplate?.description || "");
  const [checklist, setChecklist] = useState<TaskTemplateChecklistItem[]>(initialTemplate?.checklist || []);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const searchParams = useSearchParams();
  const urlEditId = searchParams?.get("edit") || undefined;
  const effectiveId = templateId || initialTemplate?.id || initialTemplate?._id || urlEditId;
  const isEditing = Boolean(effectiveId);

  // If templateId or urlEditId is provided but initialTemplate isn't, fetch template details
  useEffect(() => {
    const idToFetch = templateId || urlEditId;
    if (idToFetch && !initialTemplate) {
      taskApi.getTaskTemplateById(idToFetch).then((res) => {
        if (res.data) {
          const tpl = res.data;
          setTemplateName(tpl.templateName || "");
          setTaskTitle(tpl.taskTitle || "");
          setCategory(tpl.category || tpl.department || "GST");
          setPriority(tpl.priority || "Medium");
          setEstimatedHours(tpl.estimatedHours || "");
          setDefaultAssigneeId(tpl.defaultAssigneeId || "");
          setDefaultReviewerId(tpl.defaultReviewerId || "");
          setFrequency(tpl.frequency || "One-time");
          setDescription(tpl.description || "");
          if (tpl.checklist) {
            setChecklist(tpl.checklist);
          }
        }
      }).catch(() => {});
    }
  }, [templateId, urlEditId, initialTemplate]);

  // Load team members
  useEffect(() => {
    let isMounted = true;
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
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddStep = () => {
    setChecklist((prev) => [
      ...prev,
      {
        id: `step_${Date.now()}_${prev.length + 1}`,
        title: "",
        isMandatory: true,
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    setChecklist((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateStepTitle = (index: number, title: string) => {
    setChecklist((prev) =>
      prev.map((step, idx) => (idx === index ? { ...step, title } : step))
    );
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!templateName.trim()) {
      errs.templateName = "Template Name is required";
    }
    if (!taskTitle.trim()) {
      errs.taskTitle = "Task Title is required";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedAssignee = teamMembers.find(
        (m) => m.id === defaultAssigneeId || m.name === defaultAssigneeId
      );
      const selectedReviewer = teamMembers.find(
        (m) => m.id === defaultReviewerId || m.name === defaultReviewerId
      );

      const cleanChecklist = checklist
        .filter((step) => step.title.trim() !== "")
        .map((step, idx) => ({
          id: step.id || `c_${Date.now()}_${idx}`,
          title: step.title.trim(),
          isMandatory: step.isMandatory !== false,
        }));

      const payload = {
        templateName: templateName.trim(),
        taskTitle: taskTitle.trim(),
        category: category || "GST",
        department: category || "GST",
        priority,
        frequency,
        estimatedHours: estimatedHours.trim(),
        defaultAssigneeId: selectedAssignee?.id || defaultAssigneeId || null,
        defaultAssigneeName: selectedAssignee?.name || "",
        defaultReviewerId: selectedReviewer?.id || defaultReviewerId || null,
        defaultReviewerName: selectedReviewer?.name || "",
        billingType: "Billable" as const,
        description: description.trim(),
        checklist: cleanChecklist,
      };

      let res;
      if (effectiveId) {
        res = await taskApi.updateTaskTemplate(effectiveId, payload);
      } else {
        res = await taskApi.createTaskTemplate(payload);
      }

      if (res.data || res.success) {
        if (onSuccess && res.data) {
          onSuccess(res.data);
        } else if (onSuccess) {
          onSuccess((res.data || { ...payload, id: `tpl_${Date.now()}` }) as any);
        } else {
          router.push("/task/templates");
        }
      } else {
        setErrorMessage(res.message || "Failed to save task template");
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || "An error occurred while saving the template"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push("/task/templates");
    }
  };

  return (
    <div className="w-full max-w-[720px] bg-[var(--bg-surface)] text-[var(--text-main)] rounded-lg shadow-2xl border border-[var(--border-main)] overflow-hidden animate-in fade-in duration-150">
      {/* 1. Header matching Reference Screenshot */}
      <div className="px-5 py-3.5 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-muted)]/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          <h2 className="text-sm font-semibold text-[var(--text-main)]">
            {isEditing ? "Edit template" : "Create template"}
          </h2>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="text-[var(--text-subtle)] hover:text-[var(--text-main)] p-1 rounded-md transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Error Banner */}
      {errorMessage && (
        <div className="mx-5 mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* 3. Form Body matching Reference Screenshot */}
      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        {/* Row 1: Template name * & Default task title * */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Template name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value);
                if (errors.templateName) {
                  setErrors((prev) => ({ ...prev, templateName: "" }));
                }
              }}
              placeholder="e.g. Standard Monthly GST"
              className={`w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border rounded-md text-[var(--text-main)] focus:outline-none transition-all ${
                errors.templateName
                  ? "border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-[var(--border-main)] focus:border-[var(--primary)]"
              }`}
            />
            {errors.templateName && (
              <p className="text-[11px] text-red-500 mt-0.5">
                {errors.templateName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Default task title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => {
                setTaskTitle(e.target.value);
                if (errors.taskTitle) {
                  setErrors((prev) => ({ ...prev, taskTitle: "" }));
                }
              }}
              placeholder="e.g. GSTR-1 & 3B Filing"
              className={`w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border rounded-md text-[var(--text-main)] focus:outline-none transition-all ${
                errors.taskTitle
                  ? "border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-[var(--border-main)] focus:border-[var(--primary)]"
              }`}
            />
            {errors.taskTitle && (
              <p className="text-[11px] text-red-500 mt-0.5">
                {errors.taskTitle}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Category *, Priority, Estimated hours */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 px-2.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            >
              {TASK_DEPARTMENTS.filter((d) => d !== "All Dept").map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full h-9 px-2.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Estimated hours
            </label>
            <input
              type="text"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="e.g. 4-6"
              className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Row 3: Default assignee, Default reviewer, Labels (comma separated) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Default assignee
            </label>
            <select
              value={defaultAssigneeId}
              onChange={(e) => setDefaultAssigneeId(e.target.value)}
              className="w-full h-9 px-2.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Default reviewer
            </label>
            <select
              value={defaultReviewerId}
              onChange={(e) => setDefaultReviewerId(e.target.value)}
              className="w-full h-9 px-2.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="">None</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Labels (comma separated)
            </label>
            <input
              type="text"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="e.g. gst, monthly"
              className="w-full h-9 px-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Row 4: Recurrence & scheduling box matching Reference Screenshot */}
        <div className="border border-[var(--border-main)] rounded-md p-3.5 space-y-2.5 bg-[var(--bg-muted)]/15">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-main)]">
            <Repeat className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
            <span>Recurrence & scheduling</span>
          </div>

          <div className="w-full md:w-1/2 max-w-sm">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full h-9 px-2.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            >
              {FREQUENCY_OPTIONS.map((freq) => (
                <option key={freq} value={freq}>
                  {freq}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 5: Accent color matching Reference Screenshot */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Accent color
          </label>
          <div className="flex items-center gap-2">
            {ACCENT_COLORS.map((col) => {
              const isSelected = accentColor === col;
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => setAccentColor(col)}
                  style={{ backgroundColor: col }}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                    isSelected
                      ? "ring-2 ring-offset-2 ring-[var(--text-main)] scale-110"
                      : ""
                  }`}
                  aria-label={`Select color ${col}`}
                />
              );
            })}
            <button
              type="button"
              className="w-6 h-6 rounded-full border border-dashed border-[var(--border-main)] text-[var(--text-subtle)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors"
              title="Add color"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Row 6: Description with rich toolbar matching Reference Screenshot */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Description
          </label>
          <div className="border border-[var(--border-main)] rounded-md overflow-hidden">
            {/* Rich text formatting bar */}
            <div className="px-3 py-1.5 bg-[var(--bg-muted)]/30 border-b border-[var(--border-main)] flex items-center gap-3 text-xs text-[var(--text-subtle)] select-none">
              <span className="cursor-pointer hover:text-[var(--text-main)] font-semibold text-[11px]">H1</span>
              <span className="cursor-pointer hover:text-[var(--text-main)] font-semibold text-[11px]">H2</span>
              <span className="cursor-pointer hover:text-[var(--text-main)] font-semibold text-[11px]">H3</span>
              <span className="text-[var(--border-main)]">|</span>
              <Bold className="w-3 h-3 cursor-pointer hover:text-[var(--text-main)]" />
              <Italic className="w-3 h-3 cursor-pointer hover:text-[var(--text-main)]" />
              <Underline className="w-3 h-3 cursor-pointer hover:text-[var(--text-main)]" />
              <Strikethrough className="w-3 h-3 cursor-pointer hover:text-[var(--text-main)]" />
              <span className="text-[var(--border-main)]">|</span>
              <List className="w-3 h-3 cursor-pointer hover:text-[var(--text-main)]" />
              <ListOrdered className="w-3 h-3 cursor-pointer hover:text-[var(--text-main)]" />
              <span className="text-[var(--border-main)]">|</span>
              <Code className="w-3 h-3 cursor-pointer hover:text-[var(--text-main)]" />
              <span className="text-[var(--border-main)]">|</span>
              <LinkIcon className="w-3 h-3 cursor-pointer hover:text-[var(--text-main)]" />
              <Smile className="w-3 h-3 cursor-pointer hover:text-[var(--text-main)]" />
            </div>

            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write description..."
              className="w-full p-3 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none resize-y min-h-[90px]"
            />
          </div>
        </div>

        {/* Row 7: Checklist steps matching Reference Screenshot */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-[var(--text-muted)]">
            Checklist steps
          </label>

          {checklist.length > 0 && (
            <div className="space-y-1.5 pb-1">
              {checklist.map((step, idx) => (
                <div
                  key={step.id || idx}
                  className="flex items-center gap-2 bg-[var(--bg-muted)]/20 px-2.5 py-1.5 border border-[var(--border-main)] rounded-md"
                >
                  <span className="text-xs font-medium text-[var(--text-subtle)] w-5 text-center shrink-0">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => handleUpdateStepTitle(idx, e.target.value)}
                    placeholder={`Step ${idx + 1} description...`}
                    className="flex-1 h-7 px-2 text-xs bg-transparent border-0 text-[var(--text-main)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-1 text-[var(--text-subtle)] hover:text-red-500 transition-colors shrink-0"
                    title="Remove step"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleAddStep}
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
            <span>Add step</span>
          </button>
        </div>

        {/* Modal Footer matching Reference Screenshot */}
        <div className="pt-3 border-t border-[var(--border-main)] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundColor: "var(--primary)" }}
            className="px-4 py-1.5 text-xs font-semibold text-white rounded-md shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create template"}
          </button>
        </div>
      </form>
    </div>
  );
};
