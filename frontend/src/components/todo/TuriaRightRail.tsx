"use client";

import React from "react";
import {
  Folder,
  Clock,
  User,
  CheckSquare,
  Calendar,
  LayoutGrid,
  Zap,
  Cloud,
  Moon,
  Sun,
  Palette,
  Settings,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface TuriaRightRailProps {
  onToggleCalendar?: () => void;
  isCalendarActive?: boolean;
}

export const TuriaRightRail: React.FC<TuriaRightRailProps> = ({
  onToggleCalendar,
  isCalendarActive = false,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className="w-12 shrink-0 border-l border-gray-200 dark:border-border bg-white dark:bg-card hidden lg:flex flex-col items-center justify-between py-4 select-none transition-colors"
      aria-label="Right Utility Rail"
    >
      {/* Top Utility Icons */}
      <div className="flex flex-col items-center gap-3">
        {/* Folder */}
        <button
          type="button"
          title="Documents & Folders"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Folder className="w-4 h-4" />
        </button>

        {/* Timer / Clock */}
        <button
          type="button"
          title="Time Tracker / Logs"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Clock className="w-4 h-4" />
        </button>

        {/* User / Profile */}
        <button
          type="button"
          title="Client & User Directory"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <User className="w-4 h-4" />
        </button>

        {/* Active To-Do Checklist Icon (highlighted in solid blue/indigo matching Turia reference) */}
        <button
          type="button"
          title="To-Do Manager (Active)"
          className="p-2 rounded-lg bg-[#5B50E5] text-white shadow-xs cursor-default"
        >
          <CheckSquare className="w-4 h-4" />
        </button>

        {/* Calendar View Toggle */}
        <button
          type="button"
          onClick={onToggleCalendar}
          title="Calendar View"
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isCalendarActive
              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-semibold"
              : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
        </button>

        {/* Layout Grid */}
        <button
          type="button"
          title="Board & Grid Layout"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {/* Lightning / Zap */}
        <button
          type="button"
          title="Automations & Quick Actions"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Zap className="w-4 h-4" />
        </button>

        {/* Cloud Sync */}
        <button
          type="button"
          title="Cloud Sync Active"
          className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
        >
          <Cloud className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Utility Icons */}
      <div className="flex flex-col items-center gap-3">
        {/* Dark/Light Mode Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Palette / Theme Customizer */}
        <button
          type="button"
          title="Customize Appearance"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Palette className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          type="button"
          title="Settings"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
