"use client";

import React from "react";
import type { Portal } from "../../types/notices";

export interface PortalBadgeProps {
  portal: Portal | string;
  className?: string;
}

const PORTAL_CONFIG: Record<string, { label: string; token: string }> = {
  GST: { label: "GST", token: "--primary" },
  IT: { label: "Income Tax", token: "--primary-hover" },
  TDS: { label: "TDS", token: "--badge-addon-text" },
};

export const PortalBadge: React.FC<PortalBadgeProps> = ({ portal, className = "" }) => {
  const meta = PORTAL_CONFIG[portal] || {
    label: portal,
    token: "--primary",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${className}`}
      style={{
        color: `var(${meta.token})`,
        backgroundColor: `var(--bg-active)`,
        borderColor: `var(--border-main)`,
      }}
    >
      {meta.label}
    </span>
  );
};
