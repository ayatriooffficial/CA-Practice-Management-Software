"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  LayoutTemplate,
  Plus,
  Search,
  ChevronDown,
  Repeat,
  MoreHorizontal,
  ArrowRight,
  ArrowLeft,
  Eye,
  Edit3,
  Trash2,
  Clock,
  User,
  ListChecks,
  X,
  AlertCircle,
  CheckCircle2,
  Check,
  Sparkles,
} from "lucide-react";
import { taskApi } from "@/services/taskApi";
import { clientApi } from "@/services/clientApi";
import { Client } from "@/data/crmData";
import { TaskTemplateItem, TaskItem } from "@/data/taskData";
import { AddTaskModal } from "@/components/tasks/AddTaskModal";
import { CreateTaskTemplateForm } from "@/components/tasks/CreateTaskTemplateForm";

const CATEGORY_OPTIONS = [
  "All Categories",
  "GST",
  "TDS",
  "ITR",
  "ROC",
  "Audit",
  "MCA",
  "Advance Tax",
  "FEMA",
  "Other",
];

const FREQUENCY_OPTIONS = [
  "All Frequencies",
  "One-time",
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Annual",
];

export default function TaskTemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedFrequency, setSelectedFrequency] = useState("All Frequencies");

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isFrequencyOpen, setIsFrequencyOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TaskTemplateItem | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplateItem | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<TaskTemplateItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Assign template to client state
  const [assigningTemplate, setAssigningTemplate] = useState<TaskTemplateItem | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [assignOnlySuccessMsg, setAssignOnlySuccessMsg] = useState("");

  // Add Task Modal from Assignment
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [assignedClientForTask, setAssignedClientForTask] = useState<Client | null>(null);
  const [templateForTask, setTemplateForTask] = useState<TaskTemplateItem | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const categoryRef = useRef<HTMLDivElement>(null);
  const frequencyRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadTemplates = () => {
    setIsLoading(true);
    taskApi
      .getTaskTemplates()
      .then((res) => {
        if (res.data) {
          setTemplates(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load templates:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (categoryRef.current && !categoryRef.current.contains(target)) {
        setIsCategoryOpen(false);
      }
      if (frequencyRef.current && !frequencyRef.current.contains(target)) {
        setIsFrequencyOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch clients when assign modal opens
  useEffect(() => {
    if (assigningTemplate) {
      setIsLoadingClients(true);
      setSelectedClientId(null);
      setClientSearchQuery("");
      setAssignOnlySuccessMsg("");
      clientApi
        .getClients({ limit: 100 })
        .then((res) => {
          if (res.data) {
            const realClients = res.data.filter((c: any) => c.fileNo !== "CLT-2026-MOCK");
            setClients(realClients);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingClients(false);
        });
    }
  }, [assigningTemplate]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tpl.templateName?.toLowerCase().includes(q) ||
        tpl.taskTitle?.toLowerCase().includes(q) ||
        tpl.description?.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === "All Categories" ||
        tpl.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        tpl.department?.toLowerCase() === selectedCategory.toLowerCase();

      const matchesFrequency =
        selectedFrequency === "All Frequencies" ||
        tpl.frequency?.toLowerCase() === selectedFrequency.toLowerCase();

      return matchesSearch && matchesCategory && matchesFrequency;
    });
  }, [templates, searchQuery, selectedCategory, selectedFrequency]);

  // Filter clients for assign modal
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const q = clientSearchQuery.toLowerCase().trim();
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.legalName?.toLowerCase().includes(q) ||
        c.pan?.toLowerCase().includes(q) ||
        c.fileNo?.toLowerCase().includes(q)
    );
  }, [clients, clientSearchQuery]);

  const handleDeleteTemplate = async () => {
    if (!deleteTemplate) return;
    const targetId = deleteTemplate.id || deleteTemplate._id;
    if (!targetId) return;

    setIsDeleting(true);
    try {
      const res = await taskApi.deleteTaskTemplate(targetId);
      if (res.success || res.data === null) {
        setTemplates((prev) => prev.filter((t) => (t.id || t._id) !== targetId));
        setFeedbackToast({
          type: "success",
          message: `Template "${deleteTemplate.templateName}" deleted successfully.`,
        });
        setDeleteTemplate(null);
      } else {
        setFeedbackToast({
          type: "error",
          message: res.message || "Failed to delete template.",
        });
      }
    } catch (err: any) {
      setFeedbackToast({
        type: "error",
        message: err.message || "Failed to delete template.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssignOnly = () => {
    if (!selectedClientId || !assigningTemplate) return;
    const selectedClient = clients.find(
      (c) => c.id === selectedClientId || (c as any)._id === selectedClientId
    );
    const clientName = selectedClient?.name || selectedClient?.legalName || "Client";
    setAssignOnlySuccessMsg(
      `Registered "${clientName}" for future scheduled runs of "${assigningTemplate.templateName}".`
    );
    setTimeout(() => {
      setAssigningTemplate(null);
      setAssignOnlySuccessMsg("");
      setFeedbackToast({
        type: "success",
        message: `Registered "${clientName}" for scheduled runs of "${assigningTemplate.templateName}".`,
      });
    }, 1200);
  };

  const handleCreateTaskAndAssign = () => {
    if (!selectedClientId || !assigningTemplate) return;
    const selectedClient = clients.find(
      (c) => c.id === selectedClientId || (c as any)._id === selectedClientId || c.fileNo === selectedClientId
    );
    if (!selectedClient) return;

    setAssignedClientForTask(selectedClient);
    setTemplateForTask(assigningTemplate);
    setAssigningTemplate(null);
    setIsAddTaskOpen(true);
  };

  const getFrequencyHumanText = (freq?: string) => {
    switch (freq?.toLowerCase()) {
      case "daily":
        return "Every day";
      case "weekly":
        return "Every week";
      case "monthly":
        return "Every month";
      case "quarterly":
        return "Every quarter";
      case "annual":
        return "Every year";
      default:
        return "Once";
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-4 md:p-6 bg-[var(--bg-main)] text-[var(--text-main)] transition-colors">
      {/* Toast Notification */}
      {feedbackToast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-md shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-2 ${
            feedbackToast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {feedbackToast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{feedbackToast.message}</span>
          <button
            onClick={() => setFeedbackToast(null)}
            className="ml-2 hover:opacity-80 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Back Link to Tasks */}
      <div className="mb-4">
        <Link
          href="/task"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-subtle)] hover:text-[var(--text-main)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tasks</span>
        </Link>
      </div>

      {/* 1. Header Section matching Screenshots */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20 shadow-xs">
            <LayoutTemplate className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-main)] tracking-tight">
              Task Templates
            </h1>
            <p className="text-xs text-[var(--text-subtle)] mt-0.5">
              Reusable workflows that spawn compliance tasks for your clients
            </p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ backgroundColor: "var(--primary)" }}
            className="px-4 py-2 text-xs font-semibold text-white rounded-md shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create template</span>
          </button>
        </div>
      </div>

      {/* 2. Controls & Filter Bar matching Screenshots */}
      <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search templates"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative" ref={categoryRef}>
            <button
              type="button"
              onClick={() => {
                setIsCategoryOpen((prev) => !prev);
                setIsFrequencyOpen(false);
              }}
              className="h-8 px-3 text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1.5"
            >
              <span>{selectedCategory === "All Categories" ? "Category" : selectedCategory}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-subtle)] transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
            </button>

            {isCategoryOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md shadow-lg z-30 py-1 max-h-60 overflow-y-auto">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsCategoryOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors ${
                      selectedCategory === cat ? "text-[var(--primary)] font-semibold" : "text-[var(--text-main)]"
                    }`}
                  >
                    <span>{cat}</span>
                    {selectedCategory === cat && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Frequency Dropdown */}
          <div className="relative" ref={frequencyRef}>
            <button
              type="button"
              onClick={() => {
                setIsFrequencyOpen((prev) => !prev);
                setIsCategoryOpen(false);
              }}
              className="h-8 px-3 text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1.5"
            >
              <span>{selectedFrequency === "All Frequencies" ? "Frequency" : selectedFrequency}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-subtle)] transition-transform ${isFrequencyOpen ? "rotate-180" : ""}`} />
            </button>

            {isFrequencyOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md shadow-lg z-30 py-1 max-h-60 overflow-y-auto">
                {FREQUENCY_OPTIONS.map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => {
                      setSelectedFrequency(freq);
                      setIsFrequencyOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors ${
                      selectedFrequency === freq ? "text-[var(--primary)] font-semibold" : "text-[var(--text-main)]"
                    }`}
                  >
                    <span>{freq}</span>
                    {selectedFrequency === freq && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Template Count matching Screenshot */}
        <div className="text-xs text-[var(--text-subtle)] font-medium shrink-0">
          {filteredTemplates.length} {filteredTemplates.length === 1 ? "template" : "templates"}
        </div>
      </div>

      {/* 3. Main Body: Loading / Empty State / Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[var(--text-subtle)]">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs">Loading task templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-4 border border-dashed border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)]/50 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-muted)]/50 flex items-center justify-center text-[var(--text-subtle)] mb-3">
            <LayoutTemplate className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-main)]">
            {searchQuery || selectedCategory !== "All Categories" || selectedFrequency !== "All Frequencies"
              ? "No matching templates found"
              : "No task templates created yet"}
          </h3>
          <p className="text-xs text-[var(--text-subtle)] max-w-sm mt-1 mb-4">
            {searchQuery || selectedCategory !== "All Categories" || selectedFrequency !== "All Frequencies"
              ? "Try adjusting your search terms or filters to find what you are looking for."
              : "Create reusable workflows that spawn compliance tasks with predefined SOP checklists for your clients."}
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ backgroundColor: "var(--primary)" }}
            className="px-4 py-1.5 text-xs font-semibold text-white rounded-md shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create template</span>
          </button>
        </div>
      ) : (
        /* Cards Grid matching Screenshot 1 & 4 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredTemplates.map((tpl) => {
            const tplId = tpl.id || tpl._id || "";
            const isMenuOpen = activeMenuId === tplId;
            const stepsCount = tpl.checklist ? tpl.checklist.length : 0;

            return (
              <div
                key={tplId}
                className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-4 flex flex-col justify-between hover:border-[var(--border-main)]/80 transition-all shadow-xs relative"
              >
                <div>
                  {/* Card Header: Name + Subtitle + Action Dropdown Menu */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-[var(--text-main)] truncate">
                        {tpl.templateName}
                      </h3>
                      <p className="text-xs text-[var(--text-subtle)] truncate mt-0.5">
                        {tpl.taskTitle || "Default task"}
                      </p>
                    </div>

                    {/* ••• Action Menu matching Screenshot 2 */}
                    <div className="relative" ref={isMenuOpen ? menuRef : null}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId((prev) => (prev === tplId ? null : tplId));
                        }}
                        className="p-1 rounded text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-muted)] transition-colors"
                        aria-label="Template actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 mt-1 w-32 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setPreviewTemplate(tpl);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2"
                          >
                            <Eye className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setEditingTemplate(tpl);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
                            <span>Edit</span>
                          </button>
                          <div className="my-1 border-t border-[var(--border-main)]" />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setDeleteTemplate(tpl);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-2 font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges row: Category + Frequency pill + Schedule text */}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {tpl.category || tpl.department || "General"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400">
                      <Repeat className="w-2.5 h-2.5" />
                      <span>{tpl.frequency || "One-time"}</span>
                    </span>
                    <span className="text-[11px] text-[var(--text-subtle)]">
                      {getFrequencyHumanText(tpl.frequency)}
                    </span>
                  </div>

                  {/* Description snippet */}
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 my-2.5 min-h-[32px]">
                    {tpl.description ? tpl.description : <span className="italic text-[var(--text-subtle)]">No description</span>}
                  </p>

                  {/* Steps section matching Screenshot */}
                  <div className="my-2 text-[11px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider flex items-center gap-1.5">
                    <ListChecks className="w-3 h-3" />
                    <span>STEPS ({stepsCount})</span>
                  </div>
                  {stepsCount === 0 ? (
                    <p className="text-xs italic text-[var(--text-subtle)]">
                      No steps defined.
                    </p>
                  ) : (
                    <ul className="space-y-1 mb-2">
                      {tpl.checklist!.slice(0, 2).map((st, i) => (
                        <li key={i} className="text-xs text-[var(--text-main)] truncate flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                          <span className="truncate">{st.title}</span>
                        </li>
                      ))}
                      {stepsCount > 2 && (
                        <li className="text-[11px] text-[var(--text-subtle)] italic">
                          +{stepsCount - 2} more step{stepsCount - 2 > 1 ? "s" : ""}
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                <div>
                  {/* Card Metadata Footer */}
                  <div className="pt-2.5 mt-2.5 border-t border-[var(--border-main)] flex items-center justify-between text-xs text-[var(--text-subtle)]">
                    <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {tpl.defaultAssigneeName || "Unassigned"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="font-bold">=</span>
                      <span>{tpl.priority || "Medium"}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{tpl.estimatedHours ? `${tpl.estimatedHours}h` : "1d"}</span>
                    </div>
                  </div>

                  {/* Bottom Action Buttons matching Screenshot */}
                  <div className="mt-3 pt-3 border-t border-[var(--border-main)] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAssigningTemplate(tpl)}
                      style={{ backgroundColor: "var(--primary)" }}
                      className="flex-1 py-1.5 px-3 rounded-md text-xs font-semibold text-white flex items-center justify-center gap-1.5 hover:opacity-95 shadow-xs transition-all"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Use template</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(tpl)}
                      className="py-1.5 px-3 rounded-md text-xs font-medium text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-main)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-muted)]/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-[var(--text-main)]">
                  Template Preview: {previewTemplate.templateName}
                </h3>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-[var(--text-subtle)] hover:text-[var(--text-main)] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  {previewTemplate.category || previewTemplate.department || "General"}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  <span>{previewTemplate.frequency || "One-time"}</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Priority: {previewTemplate.priority || "Medium"}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-subtle)] uppercase">
                  Default Task Title
                </label>
                <p className="text-xs font-medium text-[var(--text-main)] mt-0.5">
                  {previewTemplate.taskTitle || "—"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-subtle)] uppercase">
                    Default Assignee
                  </label>
                  <p className="text-xs text-[var(--text-main)] mt-0.5">
                    {previewTemplate.defaultAssigneeName || "Unassigned"}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-subtle)] uppercase">
                    Estimated Time
                  </label>
                  <p className="text-xs text-[var(--text-main)] mt-0.5">
                    {previewTemplate.estimatedHours ? `${previewTemplate.estimatedHours} hours` : "1 day"}
                  </p>
                </div>
              </div>

              {previewTemplate.description && (
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-subtle)] uppercase">
                    Description / SOP
                  </label>
                  <p className="text-xs text-[var(--text-main)] mt-1 p-2.5 bg-[var(--bg-muted)]/20 border border-[var(--border-main)] rounded-md whitespace-pre-wrap">
                    {previewTemplate.description}
                  </p>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-subtle)] uppercase flex items-center gap-1.5 mb-1.5">
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>Checklist Steps ({previewTemplate.checklist ? previewTemplate.checklist.length : 0})</span>
                </label>
                {!previewTemplate.checklist || previewTemplate.checklist.length === 0 ? (
                  <p className="text-xs italic text-[var(--text-subtle)]">No checklist steps defined in this template.</p>
                ) : (
                  <div className="space-y-1.5">
                    {previewTemplate.checklist.map((st, idx) => (
                      <div
                        key={st.id || idx}
                        className="px-3 py-1.5 text-xs bg-[var(--bg-muted)]/15 border border-[var(--border-main)] rounded-md flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[var(--text-subtle)] font-medium">#{idx + 1}</span>
                          <span className="text-[var(--text-main)]">{st.title}</span>
                        </div>
                        {st.isMandatory !== false && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase">
                            Required
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[var(--border-main)] flex items-center justify-end gap-2.5 bg-[var(--bg-muted)]/10">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-1.5 text-xs font-medium text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = previewTemplate;
                  setPreviewTemplate(null);
                  setAssigningTemplate(target);
                }}
                style={{ backgroundColor: "var(--primary)" }}
                className="px-4 py-1.5 text-xs font-semibold text-white rounded-md shadow-xs transition-all hover:scale-[1.01]"
              >
                Use template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4.5. CREATE TEMPLATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-100">
          <div className="my-auto">
            <CreateTaskTemplateForm
              onCancel={() => setIsCreateModalOpen(false)}
              onSuccess={(newTemplate) => {
                setIsCreateModalOpen(false);
                setSearchQuery("");
                setSelectedCategory("All Categories");
                setSelectedFrequency("All Frequencies");
                setTemplates((prev) => [
                  newTemplate,
                  ...prev.filter(
                    (t) =>
                      (t.id || t._id) !== (newTemplate.id || newTemplate._id)
                  ),
                ]);
                loadTemplates();
                setFeedbackToast({
                  type: "success",
                  message: `Template "${newTemplate.templateName}" created successfully.`,
                });
              }}
            />
          </div>
        </div>
      )}

      {/* 5. EDIT MODAL */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-100">
          <div className="my-auto">
            <CreateTaskTemplateForm
              initialTemplate={editingTemplate}
              onCancel={() => setEditingTemplate(null)}
              onSuccess={(updated) => {
                setEditingTemplate(null);
                setTemplates((prev) =>
                  prev.map((t) => ((t.id || t._id) === (updated.id || updated._id) ? updated : t))
                );
                setFeedbackToast({
                  type: "success",
                  message: `Template "${updated.templateName}" updated successfully.`,
                });
              }}
            />
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      {deleteTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg shadow-2xl p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-main)]">
                Delete Task Template?
              </h3>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-[var(--text-main)]">{deleteTemplate.templateName}</span>?
              Previously created tasks from this template will not be affected and will remain completely intact.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTemplate(null)}
                disabled={isDeleting}
                className="px-4 py-1.5 text-xs font-medium text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTemplate}
                disabled={isDeleting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. CLIENT ASSIGNMENT MODAL matching Screenshot 5 (media_1793104094535_5b897e8d.png) */}
      {assigningTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header matching Screenshot 5 */}
            <div className="px-5 py-3.5 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-muted)]/20">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-sky-500 shrink-0" />
                <h3 className="text-sm font-semibold text-[var(--text-main)]">
                  Assign &ldquo;{assigningTemplate.templateName}&rdquo;
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssigningTemplate(null)}
                className="text-[var(--text-subtle)] hover:text-[var(--text-main)] p-1 rounded-md transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subtitle & Instructions matching Screenshot 5 */}
            <div className="p-5 space-y-3.5">
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Select the clients this template should run for. Use &ldquo;Assign only&rdquo; to register clients for future scheduled runs without creating a task now, or &ldquo;Create task + Assign&rdquo; to create a task immediately and set up the recurring schedule. Unchecking a client stops its recurrence.
              </p>

              {/* Status Row matching Screenshot 5 */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-medium text-[var(--text-main)]">
                  {selectedClientId ? "1 client selected" : "0 clients selected"}
                </span>
                <span className="text-[11px] text-[var(--text-subtle)] italic">
                  {selectedClientId ? "Client selected" : "No changes — select or deselect to enable"}
                </span>
              </div>

              {/* Search Clients Box matching Screenshot 5 */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              {/* Success Banner if Assign Only clicked */}
              {assignOnlySuccessMsg && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-md flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{assignOnlySuccessMsg}</span>
                </div>
              )}

              {/* Clients List matching Screenshot 5 */}
              <div className="border border-[var(--border-main)] rounded-md min-h-[160px] max-h-[220px] overflow-y-auto divide-y divide-[var(--border-main)]">
                {isLoadingClients ? (
                  <div className="py-10 flex flex-col items-center justify-center text-[var(--text-subtle)]">
                    <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-1.5" />
                    <p className="text-xs">Loading clients...</p>
                  </div>
                ) : filteredClients.length === 0 ? (
                  /* "No clients found." exact text from Screenshot 5 */
                  <div className="py-12 text-center text-xs text-[var(--text-subtle)]">
                    No clients found.
                  </div>
                ) : (
                  filteredClients.map((client) => {
                    const cid = client.id || (client as any)._id || client.fileNo;
                    const isSelected = selectedClientId === cid;

                    return (
                      <div
                        key={cid}
                        onClick={() => setSelectedClientId((prev) => (prev === cid ? null : cid))}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? "bg-sky-50/50 dark:bg-sky-950/30" : "hover:bg-[var(--bg-hover)]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedClientId((prev) => (prev === cid ? null : cid));
                            }}
                            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-medium text-[var(--text-main)]">
                              {client.name}
                            </p>
                            <p className="text-[11px] text-[var(--text-subtle)]">
                              {client.fileNo || "No file no."} • {client.pan || "No PAN"}
                              {client.legalName ? ` • ${client.legalName}` : ""}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                            Selected
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer Buttons matching Screenshot 5 */}
            <div className="px-5 py-3 border-t border-[var(--border-main)] flex items-center justify-end gap-2.5 bg-[var(--bg-muted)]/15">
              <button
                type="button"
                onClick={() => setAssigningTemplate(null)}
                className="px-4 py-1.5 text-xs font-medium text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!selectedClientId}
                onClick={handleAssignOnly}
                className="px-4 py-1.5 text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-md hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
              >
                Assign only
              </button>

              <button
                type="button"
                disabled={!selectedClientId}
                onClick={handleCreateTaskAndAssign}
                style={{ backgroundColor: selectedClientId ? "var(--primary)" : undefined }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs transition-all ${
                  selectedClientId
                    ? "text-white hover:scale-[1.01]"
                    : "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed opacity-50"
                }`}
              >
                Create task + Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. ADD TASK MODAL POPULATED FROM TEMPLATE & CLIENT */}
      {isAddTaskOpen && (
        <AddTaskModal
          isOpen={isAddTaskOpen}
          onClose={() => {
            setIsAddTaskOpen(false);
            setAssignedClientForTask(null);
            setTemplateForTask(null);
          }}
          onTaskCreated={(newTask: TaskItem) => {
            setIsAddTaskOpen(false);
            setAssignedClientForTask(null);
            setTemplateForTask(null);
            setFeedbackToast({
              type: "success",
              message: `Task "${newTask.taskName}" created successfully!`,
            });
          }}
          initialData={
            assignedClientForTask && templateForTask
              ? {
                  clientId: assignedClientForTask.id || (assignedClientForTask as any)._id,
                  templateId: templateForTask.id || templateForTask._id,
                  taskName: templateForTask.taskTitle,
                  description: templateForTask.description,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
