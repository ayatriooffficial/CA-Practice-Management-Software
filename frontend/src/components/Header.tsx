"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  ShieldCheck,
  PhoneCall,
  Mail,
  Zap,
  MessageSquare,
  Layers,
  Send,
  Calendar,
  CheckSquare,
  Search,
  Moon,
  Sun,
  Building,
  LucideIcon,
  Menu,
  User,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "../context/ThemeContext";
import { useAuth, computeInitials } from "./auth/AuthContext";
import { usePermission } from "./team/usePermission";

const SearchModal = dynamic(
  () => import("./SearchModal").then((m) => m.SearchModal),
  { ssr: false }
);

const ProfileDrawer = dynamic(
  () => import("./ProfileDrawer").then((m) => m.ProfileDrawer),
  { ssr: false }
);

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    type: "addon" | "new";
  };
}

const HEADER_NAV_ITEMS: NavItem[] = [
  {
    id: "notices",
    label: "Notices",
    href: "/notices",
    icon: FileText,
    // badge: { text: "ADD ON", type: "addon" },
  },
  {
    id: "compliance",
    label: "Compliance",
    href: "/compliance",
    icon: ShieldCheck,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: "/whatsapp",
    icon: PhoneCall,
  },
  {
    id: "email",
    label: "Email",
    href: "/email",
    icon: Mail,
  },
  {
    id: "agents",
    label: "Agents",
    href: "/agents",
    icon: Zap,
    // badge: { text: "NEW", type: "new" },
  },
  {
    id: "chat",
    label: "Chat",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    id: "sprints",
    label: "Sprints",
    href: "/sprints",
    icon: Layers,
  },
  {
    id: "action-center",
    label: "Action-Center",
    href: "/action-center",
    icon: Send,
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/calendar",
    icon: Calendar,
  },
  {
    id: "to-do",
    label: "To-Do",
    href: "/to-do",
    icon: CheckSquare,
  },
];

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { currentUser } = useAuth();
  const { canView } = usePermission();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <header
        className="app-header sticky top-0 z-40 w-full flex items-center justify-between px-3 md:px-4 select-none transition-colors"
        style={{
          height: "var(--header-height)",
          backgroundColor: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-main)",
        }}
      >
        {/* Left Side: 3-Bar Menu (Mobile) + Brand Logo + User Name */}
        <div className="flex items-center gap-2 shrink-0 pr-2 md:pr-4">
          {/* Mobile 3-bar hamburger button */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-1.5 -ml-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
            title="Open navigation menu"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-hidden"
            title="Practice Management Home"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 shrink-0"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--text-inverse)",
              }}
            >
              <Building className="w-4 h-4" />
            </div>
            <span
              suppressHydrationWarning
              className="text-[13.5px] font-semibold tracking-tight whitespace-nowrap"
              style={{ color: "var(--text-main)" }}
            >
              {currentUser?.name || "Ayatrio CA"}
            </span>
            {currentUser?.role && (
              <span
                suppressHydrationWarning
                className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                  (currentUser.role || "").toLowerCase() === "employee"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300"
                    : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300"
                }`}
              >
                {currentUser.role}
              </span>
            )}
          </Link>
        </div>

        {/* Center: Top Navigation Tabs (Hidden on mobile) */}
        <nav
          className="hidden md:flex flex-1 items-center justify-center gap-0.5 xl:gap-1 overflow-x-auto no-scrollbar h-full px-4 xl:px-6 mx-2"
          aria-label="Primary Header Navigation"
        >
          {HEADER_NAV_ITEMS.map((item) => {
            if (
              (item.id === "notices" && !canView("notice_management")) ||
              (item.id === "chat" && !canView("chat")) ||
              (item.id === "sprints" && !canView("sprint_planner")) ||
              (item.id === "action-center" && !canView("action_center")) ||
              (item.id === "calendar" && !canView("calendar")) ||
              (item.id === "to-do" && !canView("todo"))
            ) {
              return null;
            }

            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/notices" && pathname === "/") ||
              pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`relative flex items-center gap-1 px-1.5 xl:px-2 h-full text-[11.5px] font-semibold whitespace-nowrap transition-colors group ${item.badge ? "pt-2.5" : ""
                  }`}
                style={{
                  color: isActive ? "var(--primary)" : "var(--text-main)",
                }}
              >
                {/* Floating Badge (ADD ON or NEW) - positioned cleanly at top */}
                {item.badge && (
                  <span
                    className={`absolute top-1 left-1/2 -translate-x-1/2 transform text-[7.5px] font-bold px-1 py-0.2 rounded-xs leading-none tracking-tight shadow-2xs transition-transform group-hover:scale-105 ${item.badge.type === "addon" ? "badge-addon" : "badge-new"
                      }`}
                  >
                    {item.badge.text}
                  </span>
                )}

                <Icon
                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive
                    ? ""
                    : "text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white"
                    }`}
                  style={{
                    color: isActive ? "var(--primary)" : undefined,
                  }}
                />
                <span className="font-semibold tracking-tight">{item.label}</span>

                {/* Active Underline Indicator */}
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t"
                    style={{ backgroundColor: "var(--primary)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Side: Search, Theme Toggle, Profile Avatar (Visible on all screen sizes) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pl-1 md:pl-3">
          {/* Search Trigger */}
          <button
            id="global-search-btn"
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-normal transition-all hover:border-gray-400 cursor-pointer"
            style={{
              backgroundColor: "var(--bg-subtle)",
              border: "1px solid var(--border-main)",
              color: "var(--text-subtle)",
            }}
            title="Search (Ctrl + K)"
            aria-label="Open search dialog (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-[12px] text-gray-500">Search</span>
            <kbd
              className="text-[10px] font-medium px-1 rounded ml-0.5 hidden xs:inline"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-main)",
                color: "var(--text-subtle)",
              }}
            >
              Ctrl K
            </kbd>
          </button>

          {/* Theme Toggle (Light / Dark) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer shrink-0"
            style={{ color: "var(--text-muted)" }}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* User Profile Avatar / Login Entry Point */}
          <div className="relative shrink-0">
            {!mounted ? (
              <button
                type="button"
                className="relative flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold tracking-tight transition-transform focus:outline-hidden"
                style={{
                  backgroundColor: "var(--avatar-bg)",
                  color: "var(--avatar-text)",
                }}
                title="User Account"
                aria-label="User Account"
              >
                <span>DS</span>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-gray-900"
                  style={{ backgroundColor: "var(--status-online)" }}
                />
              </button>
            ) : currentUser ? (
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="relative flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold tracking-tight transition-transform hover:scale-105 focus:outline-hidden cursor-pointer"
                style={{
                  backgroundColor: "var(--avatar-bg)",
                  color: "var(--avatar-text)",
                }}
                title={`User Account: ${currentUser.name}`}
                aria-label={`User Account: ${currentUser.name}`}
                aria-expanded={isProfileOpen}
              >
                <span suppressHydrationWarning>{currentUser.initials || computeInitials(currentUser.name)}</span>
                {/* Online Green Dot */}
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-gray-900"
                  style={{ backgroundColor: "var(--status-online)" }}
                />
              </button>
            ) : (
              <Link
                href="/login"
                className="relative flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold tracking-tight transition-transform hover:scale-105 focus:outline-hidden cursor-pointer"
                style={{
                  backgroundColor: "var(--avatar-bg)",
                  color: "var(--avatar-text)",
                }}
                title="Login"
                aria-label="Login"
              >
                <User className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Dialog - Lazy loaded */}
      {isSearchOpen && (
        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      )}

      {/* Right Slide-out Profile Drawer - Lazy loaded */}
      {isProfileOpen && (
        <ProfileDrawer
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </>
  );
};
