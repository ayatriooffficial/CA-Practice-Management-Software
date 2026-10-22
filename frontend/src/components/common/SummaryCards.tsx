"use client";

import React from "react";
import {
  Sparkles,
  Clock,
  CheckCircle,
  CheckCircle2,
  Eye,
  Calendar,
  FileText,
  Archive,
  MinusCircle,
  AlertTriangle,
  AlertCircle,
  Inbox,
  Layers,
  Send,
  Search,
  Edit3,
  Scale,
  Receipt,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Clock,
  CheckCircle,
  CheckCircle2,
  Eye,
  Calendar,
  FileText,
  Archive,
  MinusCircle,
  AlertTriangle,
  AlertCircle,
  Inbox,
  Layers,
  Send,
  Search,
  Edit3,
  Scale,
  Receipt,
};

export interface SummaryCardItem {
  label: string;
  count: number;
  colorToken?: string;
  icon?: string | LucideIcon | React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export interface SummaryCardsProps {
  items: SummaryCardItem[];
  className?: string;
  onItemClick?: (item: SummaryCardItem) => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  items,
  className = "",
  onItemClick,
}) => {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3 w-full ${className}`}
    >
      {items.map((item) => {
        const IconComponent =
          typeof item.icon === "string"
            ? ICON_MAP[item.icon] || Inbox
            : item.icon || null;

        const isClickable = Boolean(onItemClick);

        return (
          <div
            key={item.label}
            onClick={() => onItemClick?.(item)}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
              isClickable ? "cursor-pointer hover:shadow-xs" : ""
            }`}
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-main)",
            }}
          >
            <div className="flex flex-col min-w-0 pr-1">
              <span
                className="text-2xl font-bold tracking-tight leading-none"
                style={{
                  color: item.colorToken
                    ? `var(${item.colorToken})`
                    : "var(--text-main)",
                }}
              >
                {item.count}
              </span>
              <span
                className="text-xs font-medium mt-1 truncate"
                style={{ color: "var(--text-subtle)" }}
              >
                {item.label}
              </span>
            </div>

            {IconComponent && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-2"
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  color: item.colorToken
                    ? `var(${item.colorToken})`
                    : "var(--text-muted)",
                }}
              >
                <IconComponent className="w-4 h-4" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
