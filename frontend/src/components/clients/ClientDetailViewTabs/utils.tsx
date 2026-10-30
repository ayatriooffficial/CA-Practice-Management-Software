import React from "react";
import { Client, ClientServiceSetting } from "@/data/crmData";

export const getAvatarBadge = (text: string, index: number): React.ReactNode => {
  const palette = [
    { bg: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300" },
    { bg: "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300" },
    { bg: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" },
    { bg: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" },
    { bg: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" },
    { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
  ];
  const picked = palette[index % palette.length];
  const initials =
    text
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CL";

  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${picked.bg}`}
    >
      {initials}
    </div>
  );
};

/**
 * Checks whether GSTR-1 / GSTR-3B / GST Return filing service is active/enabled in client's Service Settings.
 * If turned off, all GST link generation UI and related functions are erased.
 */
export function isGstReturnServiceEnabled(
  client?: Client,
  services?: ClientServiceSetting[]
): boolean {
  if (!client) return false;

  // Combine live services from Service Settings with client.serviceSettings
  const candidateSettings: ClientServiceSetting[] = [
    ...(services || []),
    ...((client.serviceSettings as ClientServiceSetting[]) || []),
  ];

  const isItemActive = (s: ClientServiceSetting): boolean => {
    return Boolean(s.isActive !== undefined ? s.isActive : s.compliance);
  };

  const isGstReturnServiceName = (serviceName?: string, category?: string): boolean => {
    const name = (serviceName || "").toLowerCase().trim();
    const cat = (category || "").toLowerCase().replace(/[\.\s]/g, "");

    // 1. Direct GSTR-1 or GSTR-3B patterns
    if (
      name.includes("gstr-1") ||
      name.includes("gstr1") ||
      name.includes("gstr 1") ||
      name.includes("gstr-3b") ||
      name.includes("gstr3b") ||
      name.includes("gstr 3b")
    ) {
      return true;
    }

    // 2. GST Return / Monthly Return
    if (
      name.includes("gst monthly return") ||
      name.includes("gst return") ||
      (name.includes("gst") && name.includes("filing"))
    ) {
      return true;
    }

    // 3. Category G.S.T return services
    if (cat === "gst") {
      if (
        name.includes("return") ||
        name.includes("filing") ||
        name.includes("monthly") ||
        name.includes("quarterly")
      ) {
        return true;
      }
    }

    return false;
  };

  if (candidateSettings.length > 0) {
    const gstReturnServices = candidateSettings.filter((s) =>
      isGstReturnServiceName(s.serviceName, s.category)
    );

    if (gstReturnServices.length > 0) {
      // Returns true if at least one GSTR-1 / GSTR-3B return service is active
      return gstReturnServices.some(isItemActive);
    }

    // Fallback: check ANY service in G.S.T category
    const anyGstService = candidateSettings.filter(
      (s) => (s.category || "").toLowerCase().replace(/[\.\s]/g, "") === "gst"
    );
    if (anyGstService.length > 0) {
      return anyGstService.some(isItemActive);
    }
  }

  // Check client.services list
  const clientServicesList: string[] = client.services || [];
  if (clientServicesList.length > 0) {
    return clientServicesList.some((sName) => isGstReturnServiceName(sName));
  }

  return false;
}
