"use client";

import React from "react";
import { MoreVertical, Clock } from "lucide-react";
import { TaskSubTask } from "@/data/taskData";

interface TaskSubTasksListProps {
  subTasks: TaskSubTask[];
  handleToggleSubTask: (id: string) => Promise<void>;
}

export const TaskSubTasksList: React.FC<TaskSubTasksListProps> = ({
  subTasks,
  handleToggleSubTask,
}) => {
  return (
    <div className="pt-2 border-t border-[var(--border-main)]">
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-[var(--text-main)]">
          <span>Sub Tasks</span>
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{
              backgroundColor: "var(--brand-soft)",
              color: "var(--primary)",
            }}
          >
            {subTasks?.length || 0}
          </span>
        </div>
        <button
          type="button"
          aria-label="More options"
          className="text-[var(--text-subtle)] hover:text-[var(--text-main)] p-0.5 cursor-pointer"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        {subTasks?.map((st) => (
          <div
            key={st.id}
            onClick={() => handleToggleSubTask(st.id)}
            className="flex items-center justify-between p-2 rounded-md hover:bg-[var(--bg-hover)] cursor-pointer transition-colors group"
          >
            <div className="flex items-center space-x-2 text-xs">
              <input
                type="checkbox"
                checked={st.completed}
                onChange={() => { }}
                className="w-3.5 h-3.5 rounded text-[var(--primary)] border-[var(--border-main)] pointer-events-none"
              />
              <span
                className={`${
                  st.completed
                    ? "line-through text-[var(--text-placeholder)]"
                    : "text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors"
                }`}
              >
                {st.title}
              </span>
            </div>
            <Clock className="w-3.5 h-3.5 text-[var(--text-subtle)] group-hover:text-[var(--primary)]" />
          </div>
        ))}
      </div>
    </div>
  );
};
