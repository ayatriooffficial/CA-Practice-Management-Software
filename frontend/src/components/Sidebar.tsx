"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
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
  LucideIcon,
  UserRoundGroup,
  ShoppingCart,
  ReceiptText,
  Folder,
  Grip,
  X,
  Building,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "home", label: "Home", href: "/", icon: Home },
  { id: "proposal", label: "Proposal", href: "/proposal", icon: FileText },
  { id: "leads", label: "Leads", href: "/leads", icon: UserCheck },
  { id: "client", label: "Client", href: "/client", icon: Users },
  { id: "groups", label: "Groups", href: "/groups", icon: UserRoundGroup },
  { id: "services", label: "Services", href: "/services", icon: ShoppingCart },
  { id: "task", label: "Task", href: "/task", icon: ClipboardList },
  { id: "invoice", label: "Invoice", href: "/invoice", icon: ReceiptText },
  { id: "team", label: "Team", href: "/team", icon: UsersRound },
  { id: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
  { id: "drive", label: "Drive", href: "/drive", icon: Folder },
  { id: "registry", label: "Registry", href: "/registry", icon: Grip },
];

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, visible on md+) */}
      <aside
        className="hidden md:flex app-sidebar sticky top-[var(--header-height)] h-[calc(100vh-var(--header-height))] z-30 shrink-0 flex-col justify-start overflow-visible select-none transition-colors"
        style={{
          width: "var(--sidebar-width)",
          backgroundColor: "var(--bg-surface)",
          borderRight: "1px solid var(--border-main)",
        }}
        aria-label="Sidebar Navigation"
      >
        <div className="flex flex-col items-center py-2 gap-0.5 w-full">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex flex-col items-center justify-center py-1.5 px-0.5 text-center transition-all group relative cursor-pointer font-semibold ${isActive
                  ? ""
                  : "hover:bg-gray-100/70 dark:hover:bg-gray-800/40"
                  }`}
                style={{
                  color: isActive ? "var(--primary)" : "var(--text-main)",
                  backgroundColor: isActive ? "var(--primary-light)" : "transparent",
                }}
                title={item.label}
              >
                {/* Active left indicator bar */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r"
                    style={{ backgroundColor: "var(--primary)" }}
                  />
                )}

                <Icon
                  className={`w-4 h-4 mb-0.5 transition-transform group-hover:scale-110 ${isActive
                    ? ""
                    : "text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white"
                    }`}
                  style={{
                    color: isActive ? "var(--primary)" : undefined,
                  }}
                />
                <span
                  className="text-[10px] font-semibold leading-tight tracking-tight truncate max-w-full px-0.5"
                  style={{
                    color: isActive ? "var(--primary)" : "var(--text-main)",
                  }}
                >
                  {item.label}
                </span>

                {/* Floating Label Tooltip on Hover */}
                <div
                  className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight whitespace-nowrap shadow-md border opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50 select-none"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-main)",
                    color: "var(--text-main)",
                  }}
                >
                  {item.label}
                  {/* Triangular arrow pointing back to sidebar icon */}
                  <div
                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 border-l border-b"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-main)",
                    }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Mobile Drawer (Visible when isMobileOpen is true on mobile) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Dimmed Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-out Sidebar Drawer */}
          <aside
            className="fixed inset-y-0 left-0 w-68 max-w-[85vw] flex flex-col shadow-2xl border-r select-none animate-in slide-in-from-left duration-200"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-main)",
            }}
            aria-label="Mobile Navigation Drawer"
          >
            {/* Drawer Header */}
            <div
              className="flex items-center justify-between px-4 py-3.5 border-b shrink-0"
              style={{ borderColor: "var(--border-main)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--text-inverse)",
                  }}
                >
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <div
                    className="text-[13.5px] font-semibold tracking-tight"
                    style={{ color: "var(--text-main)" }}
                  >
                    Dipak Sahani
                  </div>
                  <div className="text-[10.5px] text-gray-500 dark:text-gray-400">
                    Practice Management
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                aria-label="Close sidebar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Items */}
            <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Navigation
              </div>
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold transition-colors ${
                      isActive
                        ? "font-bold"
                        : "hover:bg-gray-100/70 dark:hover:bg-gray-800/40"
                    }`}
                    style={{
                      color: isActive ? "var(--primary)" : "var(--text-main)",
                      backgroundColor: isActive ? "var(--primary-light)" : "transparent",
                    }}
                  >
                    <Icon
                      className={`w-4.5 h-4.5 shrink-0 ${
                        isActive
                          ? ""
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                      style={{
                        color: isActive ? "var(--primary)" : undefined,
                      }}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer with Theme Toggle */}
            <div
              className="p-3 border-t shrink-0 flex items-center justify-between"
              style={{ borderColor: "var(--border-main)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Appearance</span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer"
                style={{
                  borderColor: "var(--border-main)",
                  backgroundColor: "var(--bg-subtle)",
                  color: "var(--text-main)",
                }}
              >
                {theme === "light" ? (
                  <Moon className="w-3.5 h-3.5" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="capitalize">{theme}</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
