"use client";

import React from "react";
import type { NoticeStatus } from "../../types/notices";
import type { ComplianceCellStatus } from "../../types/compliance";
import {
  Sparkles,
  Clock,
  CheckCircle,
  Eye,
  Calendar,
  FileText,
  Archive,
  MinusCircle,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Clock,
  CheckCircle,
  Eye,
  Calendar,
  FileText,
  Archive,
  MinusCircle,
  AlertTriangle,
};

export interface StatusPillProps {
  status?: NoticeStatus | ComplianceCellStatus | string;
  label?: string;
  showIcon?: boolean;
  showDot?: boolean;
  className?: string;
}

interface StatusTheme {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: LucideIcon;
}

const THEMES: Record<string, StatusTheme> = {
  new: {
    label: "New",
    color: "var(--badge-addon-text)",
    bg: "var(--badge-addon-bg)",
    border: "var(--border-main)",
    icon: Sparkles,
  },
  response_preparing: {
    label: "Response Preparing",
    color: "var(--banner-text)",
    bg: "var(--banner-bg)",
    border: "var(--banner-border)",
    icon: Clock,
  },
  response_filed: {
    label: "Response Filed",
    color: "var(--badge-new-text)",
    bg: "var(--badge-new-bg)",
    border: "var(--border-main)",
    icon: CheckCircle,
  },
  under_dept_review: {
    label: "Under Dept Review",
    color: "var(--primary)",
    bg: "var(--primary-light)",
    border: "var(--primary-border)",
    icon: Eye,
  },
  hearing_scheduled: {
    label: "Hearing Scheduled",
    color: "var(--primary)",
    bg: "var(--primary-light)",
    border: "var(--primary-border)",
    icon: Calendar,
  },
  appeal_filed: {
    label: "Appeal Filed",
    color: "var(--text-main)",
    bg: "var(--bg-subtle)",
    border: "var(--border-main)",
    icon: FileText,
  },
  closed: {
    label: "Closed",
    color: "var(--text-muted)",
    bg: "var(--bg-subtle)",
    border: "var(--border-main)",
    icon: Archive,
  },
  no_status: {
    label: "No Status",
    color: "var(--text-subtle)",
    bg: "var(--bg-subtle)",
    border: "var(--border-main)",
    icon: MinusCircle,
  },
  FILED: {
    label: "Filed",
    color: "var(--badge-new-text)",
    bg: "var(--badge-new-bg)",
    border: "var(--border-main)",
    icon: CheckCircle,
  },
  MISSED: {
    label: "Missed",
    color: "var(--danger)",
    bg: "var(--credits-bg)",
    border: "var(--credits-border)",
    icon: AlertTriangle,
  },
  PENDING: {
    label: "Pending",
    color: "var(--banner-text)",
    bg: "var(--banner-bg)",
    border: "var(--banner-border)",
    icon: Clock,
  },
};

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  showIcon = false,
  showDot = true,
  className = "",
}) => {
  const normalizedKey = status ? String(status) : "no_status";
  const theme = THEMES[normalizedKey] || {
    label: label || normalizedKey,
    color: "var(--text-muted)",
    bg: "var(--bg-subtle)",
    border: "var(--border-main)",
    icon: MinusCircle,
  };

  const displayLabel = label || theme.label;
  const IconComponent = theme.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${className}`}
      style={{
        color: theme.color,
        backgroundColor: theme.bg,
        borderColor: theme.border,
      }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: theme.color }}
        />
      )}
      {showIcon && IconComponent && (
        <IconComponent className="w-3 h-3 shrink-0" />
      )}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
};
