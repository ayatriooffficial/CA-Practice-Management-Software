"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  PhoneCall,
  Mail,
  Zap,
  MessageSquare,
  Layers,
  Send,
  Calendar,
  CheckSquare,
  FileText,
  UserCheck,
  Users,
  Network,
  Briefcase,
  ClipboardList,
  Receipt,
  UsersRound,
  BarChart3,
  HardDrive,
  LayoutGrid,
  Plus,
  ChevronRight,
  Inbox,
  Home,
  LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  ShieldCheck,
  PhoneCall,
  Mail,
  Zap,
  MessageSquare,
  Layers,
  Send,
  Calendar,
  CheckSquare,
  FileText,
  UserCheck,
  Users,
  Network,
  Briefcase,
  ClipboardList,
  Receipt,
  UsersRound,
  BarChart3,
  HardDrive,
  LayoutGrid,
};

export interface QuickLinkItem {
  label: string;
  description?: string;
  href: string;
  iconName?: string;
}

interface EmptyPagePlaceholderProps {
  title: string;
  category: "Header" | "Sidebar";
  description: string;
  iconName: string;
  actionText?: string;
  showWarningBanner?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  quickLinks?: QuickLinkItem[];
}

export const EmptyPagePlaceholder: React.FC<EmptyPagePlaceholderProps> = ({
  title,
  category,
  description,
  iconName,
  actionText,
  showWarningBanner = true,
  emptyTitle,
  emptyDescription,
  quickLinks,
}) => {
  const Icon = ICON_MAP[iconName] || Inbox;

  return (
    <div className="flex flex-col w-full min-h-screen">

      {/* Page Header Bar */}
      <div
        className="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        <div>
          {/* Breadcrumbs */}
          <nav
            className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="hover:underline hover:text-gray-700 transition-colors"
            >
              Practice
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className="text-gray-400">{category}</span>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span
              className="font-medium"
              style={{ color: "var(--text-main)" }}
            >
              {title}
            </span>
          </nav>

          {/* Heading */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
              style={{
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
              }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h1
                className="text-lg font-bold tracking-tight"
                style={{ color: "var(--text-main)" }}
              >
                {title}
              </h1>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {actionText && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert(`${actionText} triggered`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all hover:opacity-90 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--text-inverse)",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{actionText}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Empty State Content Area */}
      <div className="flex-1 p-6 md:p-8 flex flex-col items-center justify-center">
        <div
          className="max-w-md w-full p-8 rounded-xl border border-dashed text-center flex flex-col items-center justify-center shadow-xs"
          style={{
            borderColor: "var(--border-main)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-xs"
            style={{
              backgroundColor: "var(--primary-light)",
              color: "var(--primary)",
            }}
          >
            <Icon className="w-6 h-6" />
          </div>

          <h2
            className="text-sm font-semibold mb-1"
            style={{ color: "var(--text-main)" }}
          >
            {emptyTitle || `No ${title} records yet`}
          </h2>
          <p className="text-xs text-gray-500 max-w-xs mb-5">
            {emptyDescription ||
              "This module is connected and navigatable. New entries and synchronized records will appear here automatically."}
          </p>

          {actionText && (
            <button
              type="button"
              onClick={() => alert(`${actionText} triggered`)}
              className="px-3.5 py-1.5 text-xs font-medium rounded-md border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              style={{
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
            >
              {actionText}
            </button>
          )}
        </div>

        {/* Quick Links Section for Dashboard/Home Navigation */}
        {quickLinks && quickLinks.length > 0 && (
          <div className="mt-8 w-full max-w-lg">
            <p
              className="text-xs font-semibold mb-3 text-center sm:text-left"
              style={{ color: "var(--text-subtle)" }}
            >
              Quick Navigation
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickLinks.map((item) => {
                const ItemIcon =
                  (item.iconName && ICON_MAP[item.iconName]) || ChevronRight;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-xs group cursor-pointer"
                    style={{
                      borderColor: "var(--border-main)",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: "var(--primary-light)",
                        color: "var(--primary)",
                      }}
                    >
                      <ItemIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs font-semibold truncate transition-colors group-hover:text-[var(--primary)]"
                        style={{ color: "var(--text-main)" }}
                      >
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-gray-500 truncate">
                          {item.description}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
