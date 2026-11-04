"use client";

import React from "react";
import {
  Inbox,
  Star,
  Repeat,
  CheckSquare,
  Trash2,
  Plus,
  Tag,
  Hash,
  X,
} from "lucide-react";

export type TuriaNavSection =
  | "my-todo"
  | "important"
  | "recurring"
  | "completed"
  | "deleted";

export interface TuriaSidebarCounts {
  myTodo: number;
  important: number;
  recurring: number;
  completed: number;
  deleted: number;
}

interface TuriaTodoSidebarProps {
  activeSection: TuriaNavSection;
  onSelectSection: (section: TuriaNavSection) => void;
  counts: TuriaSidebarCounts;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  tags?: string[];
  onAddTagClick?: () => void;
}

export const TuriaTodoSidebar: React.FC<TuriaTodoSidebarProps> = ({
  activeSection,
  onSelectSection,
  counts,
  selectedTag,
  onSelectTag,
  tags = [
    "General",
    "GST",
    "Income Tax",
    "Audit",
    "Compliance",
    "ROC",
    "Personal",
  ],
  onAddTagClick,
}) => {
  const navItems: Array<{
    id: TuriaNavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
    iconClass?: string;
  }> = [
    {
      id: "my-todo",
      label: "My To-Do",
      icon: Inbox,
      count: counts.myTodo,
    },
    {
      id: "important",
      label: "Important",
      icon: Star,
      count: counts.important,
      iconClass: activeSection === "important" ? "fill-amber-400 text-amber-500" : "text-gray-400 group-hover:text-amber-500",
    },
    {
      id: "recurring",
      label: "Recurring Master",
      icon: Repeat,
      count: counts.recurring,
    },
    {
      id: "completed",
      label: "Completed",
      icon: CheckSquare,
      count: counts.completed,
    },
    {
      id: "deleted",
      label: "Deleted",
      icon: Trash2,
      count: counts.deleted,
    },
  ];

  return (
    <aside
      className="w-full md:w-56 shrink-0 md:border-r border-gray-200 dark:border-border bg-white dark:bg-card flex flex-col justify-between py-4 px-3 select-none transition-colors"
      aria-label="To-Do Navigation"
    >
      <div className="space-y-6">
        {/* Main TO-DO Section */}
        <div>
          <div className="px-3 pb-2">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              TO-DO
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id && !selectedTag;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectSection(item.id);
                    onSelectTag(null);
                  }}
                  className={`w-full group flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                    isActive
                      ? "bg-indigo-50/90 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-semibold shadow-xs"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-slate-800/60 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        item.iconClass ||
                        (isActive
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-gray-400 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200")
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-100/80 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                        : "text-gray-400 dark:text-gray-500 group-hover:bg-gray-200/60 dark:group-hover:bg-slate-700/60"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAGS Section */}
        <div>
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              TAGS
            </span>
            <button
              type="button"
              onClick={onAddTagClick}
              title="Add or Manage Tags"
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {tags.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSelectTag(isSelected ? null : tag)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/80 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-semibold"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        tag === "GST"
                          ? "bg-emerald-500"
                          : tag === "Income Tax"
                          ? "bg-blue-500"
                          : tag === "Audit"
                          ? "bg-purple-500"
                          : tag === "Compliance"
                          ? "bg-amber-500"
                          : tag === "ROC"
                          ? "bg-rose-500"
                          : "bg-gray-400"
                      }`}
                    />
                    <span className="truncate">{tag}</span>
                  </div>

                  {isSelected && (
                    <X className="w-3 h-3 text-indigo-500 hover:text-indigo-700" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-3 pt-3 border-t border-gray-100 dark:border-border/60">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
          Turia Practice To-Do Suite
        </p>
      </div>
    </aside>
  );
};
