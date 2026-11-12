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


export const getPortalDefaultUrl = (portal?: string, explicitUrl?: string): string => {
  const url = (explicitUrl || "").trim();
  const p = (portal || "").toLowerCase();

  // If explicit URL already has specific login path, respect it unless it's a generic root/home
  if (url) {
    const isRootOrHome =
      url === "https://www.incometax.gov.in" ||
      url === "https://incometax.gov.in" ||
      url === "http://www.incometax.gov.in" ||
      url === "https://www.gst.gov.in" ||
      url === "https://gst.gov.in" ||
      url === "https://services.gst.gov.in" ||
      url === "https://www.mca.gov.in" ||
      url === "https://mca.gov.in" ||
      url === "https://contents.tdscpc.gov.in" ||
      url === "https://www.tdscpc.gov.in" ||
      url === "https://ewaybillgst.gov.in" ||
      url === "https://www.esic.in" ||
      url === "https://www.dgft.gov.in" ||
      url === "https://unifiedportal-mem.epfindia.gov.in";

    if (!isRootOrHome && url.startsWith("http")) {
      return url;
    }
  }

  // Exact direct login endpoints
  if (p.includes("income") || p.includes("tax") || p.includes("itd") || p.includes("itr") || p.includes("e-filing")) {
    return "https://eportal.incometax.gov.in/iec/foservices/#/login";
  }
  if (p.includes("eway") || p.includes("e-way")) {
    return "https://ewaybillgst.gov.in/login.aspx";
  }
  if (p.includes("gst")) {
    return "https://services.gst.gov.in/services/login";
  }
  if (p.includes("traces") || p.includes("tds")) {
    return "https://www.tdscpc.gov.in/app/login.xhtml";
  }
  if (p.includes("mca") || p.includes("roc") || p.includes("v3")) {
    return "https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html";
  }
  if (p.includes("epfo") || p.includes("pf") || p.includes("provident")) {
    return "https://unifiedportal-emp.epfindia.gov.in/epfo/";
  }
  if (p.includes("esic") || p.includes("esi")) {
    return "https://www.esic.in/EmployerPortal/ESICInsurancePortal/Portal_LoginNew.aspx";
  }
  if (p.includes("shram") || p.includes("suvidha") || p.includes("lin")) {
    return "https://shramsuvidha.gov.in/login";
  }
  if (p.includes("udyam") || p.includes("msme")) {
    return "https://udyamregistration.gov.in/Government-India/Ministry-MSME-registration.htm";
  }
  if (p.includes("nsws") || p.includes("single window")) {
    return "https://www.nsws.gov.in/login";
  }
  if (p.includes("startup")) {
    return "https://www.startupindia.gov.in/content/sih/en/login.html";
  }
  if (p.includes("ipindia") || p.includes("trademark") || p.includes("patent")) {
    return "https://ipindiaonline.gov.in/eregister/eregister.aspx";
  }
  if (p.includes("dgft") || p.includes("iec")) {
    return "https://www.dgft.gov.in/CP/?opt=login";
  }
  if (p.includes("icegate") || p.includes("customs")) {
    return "https://www.icegate.gov.in/";
  }
  if (p.includes("foscos") || p.includes("fssai") || p.includes("food")) {
    return "https://foscos.fssai.gov.in/";
  }
  if (p.includes("gem") || p.includes("marketplace")) {
    return "https://gem.gov.in/login";
  }

  return url || "https://www.google.com";
};
