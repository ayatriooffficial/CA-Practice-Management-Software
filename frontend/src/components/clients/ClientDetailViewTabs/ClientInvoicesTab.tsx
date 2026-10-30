"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight, FileText, Eye, Palette, Check, Printer, Edit2, X, Download, SlidersHorizontal, PenTool, Loader2 } from "lucide-react";
import { stageAndRedirectToPdfSigner } from "@/services/stageToPdfSigner";
import { Client } from "@/data/crmData";
import { InvoiceProvider, useInvoice } from "@/components/invoice/InvoiceContext";
import { InvoiceRecord } from "@/components/invoice/types";
import { AddInvoiceForm } from "@/components/invoice/AddInvoiceForm";
import { serviceApi } from "@/services/serviceApi";
import { Service } from "@/data/serviceData";
import { organizationApi, OrganizationDetails } from "@/services/organizationApi";
import { InvoiceLivePreview, printInvoiceElement, downloadInvoicePDF } from "@/components/onboarding/tabs/InvoiceLivePreview";

interface ClientInvoicesTabProps {
  client: Client;
  showToast?: (msg: string) => void;
}

// Service badge color generator
const getServiceBadgeStyle = (name: string) => {
  const styles = [
    { bg: "bg-emerald-100 dark:bg-emerald-950/60", text: "text-emerald-700 dark:text-emerald-300" },
    { bg: "bg-rose-100 dark:bg-rose-950/60", text: "text-rose-700 dark:text-rose-300" },
    { bg: "bg-sky-100 dark:bg-sky-950/60", text: "text-sky-700 dark:text-sky-300" },
    { bg: "bg-purple-100 dark:bg-purple-950/60", text: "text-purple-700 dark:text-purple-300" },
    { bg: "bg-amber-100 dark:bg-amber-950/60", text: "text-amber-700 dark:text-amber-300" },
    { bg: "bg-indigo-100 dark:bg-indigo-950/60", text: "text-indigo-700 dark:text-indigo-300" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % styles.length;
  return styles[index];
};

const getInitials = (text: string): string => {
  if (!text) return "IN";
  const words = text.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "—";
  try {
    const dt = new Date(dateStr);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  } catch {
    // fallback
  }
  return dateStr;
};

const ClientInvoicesInner: React.FC<ClientInvoicesTabProps> = ({ client, showToast }) => {
  const { invoices, proformas, bankAccounts } = useInvoice();

  const [subTab, setSubTab] = useState<"proforma" | "invoice">("proforma");
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [formMode, setFormMode] = useState<"create" | "edit" | "view">("create");
  const [selectedRecord, setSelectedRecord] = useState<InvoiceRecord | null>(null);

  const [availableServices, setAvailableServices] = useState<Service[]>([]);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const [primaryOrgName, setPrimaryOrgName] = useState<string>("Ayatrio Practice");
  const [orgDetails, setOrgDetails] = useState<OrganizationDetails | null>(null);

  // Organization invoice branding & format state
  const [invoiceFormat, setInvoiceFormat] = useState<"classic" | "modern" | "minimal">("modern");
  const [activeInvoiceColor, setActiveInvoiceColor] = useState<string>("#3D6A9E");
  const [firmLogoUrl, setFirmLogoUrl] = useState<string | null>(null);
  const [digitalSignatureUrl, setDigitalSignatureUrl] = useState<string | null>(null);
  const [showCaLogo, setShowCaLogo] = useState<boolean>(true);

  // Full Invoice Preview modal state
  const [previewModalRecord, setPreviewModalRecord] = useState<InvoiceRecord | null>(null);
  const router = useRouter();
  const [signingInvoiceId, setSigningInvoiceId] = useState<string | null>(null);

  const handleSignInvoiceWithDsc = async (row: any) => {
    setSigningInvoiceId(row.id);
    try {
      await stageAndRedirectToPdfSigner(router, {
        fileName: `Invoice_${row.number || row.id}.pdf`,
        clientId: client.id || row.clientId,
        clientName: row.clientBusinessName || row.clientLegalName || client.name,
        invoiceData: {
          invoiceNumber: row.number || `INV-${row.id}`,
          clientName: row.clientBusinessName || row.clientLegalName || client.name || "Valued Client",
          clientId: client.id || row.clientId,
          date: row.date,
          dueDate: row.dueDate,
          totalAmount: row.totalPayable || row.amount || 0,
          services: row.services?.map((s: any) => ({
            serviceName: s.serviceName || "CA Professional Services",
            amount: s.amount || 0,
            description: s.description || "",
          })),
          billingOrg: row.billingOrg,
        },
      });
    } catch (err: any) {
      alert(err?.message || "Failed to prepare invoice for DSC signing");
    } finally {
      setSigningInvoiceId(null);
    }
  };
  const [previewModalFormat, setPreviewModalFormat] = useState<"classic" | "modern" | "minimal">("modern");
  const [isUpdatingFormat, setIsUpdatingFormat] = useState(false);

  // Column print options (HSN/SAC, QTY, Description, CGST, SGST)
  const [printColumns, setPrintColumns] = useState({
    hsnSac: true,
    qty: true,
    description: true,
    cgst: true,
    sgst: true,
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!previewModalRecord) return;
    setIsDownloadingPDF(true);
    try {
      const fileName = `Invoice_${previewModalRecord.number || previewModalRecord.id.slice(0, 8)}.pdf`;
      await downloadInvoicePDF("invoice-printable-root", fileName);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Fetch actual organization and services from DB
  useEffect(() => {
    organizationApi
      .getOrganization()
      .then((res) => {
        if (res.data) {
          setOrgDetails(res.data);
          if (res.data.name) {
            setPrimaryOrgName(res.data.name);
          }
          const invSettings = res.data.invoiceSettings;
          if (invSettings) {
            if (invSettings.template) {
              setInvoiceFormat(invSettings.template);
              setPreviewModalFormat(invSettings.template);
            }
            if (invSettings.firmLogoUrl) setFirmLogoUrl(invSettings.firmLogoUrl);
            if (invSettings.digitalSignatureUrl) setDigitalSignatureUrl(invSettings.digitalSignatureUrl);
            if (typeof invSettings.showCaLogo === "boolean") setShowCaLogo(invSettings.showCaLogo);
            const docColor = invSettings.documentColors?.find((c: any) => c.id === "invoice")?.hex;
            if (docColor) setActiveInvoiceColor(docColor);
            if (invSettings.printColumns) {
              setPrintColumns({
                hsnSac: invSettings.printColumns.hsnSac ?? true,
                qty: invSettings.printColumns.qty ?? true,
                description: invSettings.printColumns.description ?? true,
                cgst: invSettings.printColumns.cgst ?? true,
                sgst: invSettings.printColumns.sgst ?? true,
              });
            }
          }
        }
      })
      .catch(() => { });

    serviceApi
      .getServices({ limit: 100 })
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setAvailableServices(res.data);
        }
      })
      .catch(() => { });
  }, []);

  const handleChangeGlobalFormat = async (newFmt: "classic" | "modern" | "minimal") => {
    setInvoiceFormat(newFmt);
    setPreviewModalFormat(newFmt);
    setIsUpdatingFormat(true);
    try {
      await organizationApi.updateOrganization({
        invoiceSettings: {
          ...(orgDetails?.invoiceSettings || {}),
          template: newFmt,
        },
      });
      if (showToast) {
        showToast(`Default invoice format set to ${newFmt.charAt(0).toUpperCase() + newFmt.slice(1)}`);
      }
    } catch (err) {
      console.error("Failed to update invoice format:", err);
    } finally {
      setIsUpdatingFormat(false);
    }
  };

  const handleToggleColumn = async (col: "hsnSac" | "qty" | "description" | "cgst" | "sgst") => {
    const updated = {
      ...printColumns,
      [col]: !printColumns[col],
    };
    setPrintColumns(updated);
    try {
      await organizationApi.updateOrganization({
        invoiceSettings: {
          ...(orgDetails?.invoiceSettings || {}),
          printColumns: updated,
        },
      });
    } catch {
      // non-blocking
    }
  };

  // Bank map for account display
  const bankMap = useMemo(() => {
    const map = new Map<string, string>();
    bankAccounts.forEach((b) => {
      map.set(b.id, b.bankName || b.accountBusinessName);
    });
    return map;
  }, [bankAccounts]);

  // Derive actual services that this specific client is in use / has enabled
  const inUseServices = useMemo(() => {
    // 1. From client.serviceSettings where isActive is true
    if (client.serviceSettings && client.serviceSettings.length > 0) {
      const activeSettings = client.serviceSettings.filter(
        (s) => Boolean(s.isActive !== undefined ? s.isActive : s.compliance)
      );
      if (activeSettings.length > 0) {
        return activeSettings.map((s) => ({
          serviceName: s.serviceName,
          category: s.category || "Compliance",
          amount: s.amount || 0,
          frequency: s.frequency || "Monthly",
        }));
      }
      // If serviceSettings exists but all are disabled (isActive is false), client has no active services
      return [];
    }

    // 2. Fallback: from client.services array (only if serviceSettings not populated)
    if (client.services && client.services.length > 0) {
      return client.services.map((name) => ({
        serviceName: name,
        category: "Client Service",
        amount: 0,
        frequency: "Monthly",
      }));
    }

    return [];
  }, [client.serviceSettings, client.services]);

  // Filter invoices belonging specifically to this client
  const clientInvoices = useMemo(() => {
    const sourceList = subTab === "proforma" ? proformas : invoices;
    const clientNameNorm = (client.name || "").trim().toLowerCase();
    const clientLegalNorm = (client.legalName || "").trim().toLowerCase();
    const clientIdNorm = (client.id || "").trim();

    return sourceList.filter((inv) => {
      if (inv.clientId && clientIdNorm && inv.clientId === clientIdNorm) return true;
      const invClientName = (inv.clientBusinessName || "").trim().toLowerCase();
      const invLegalName = (inv.clientLegalName || "").trim().toLowerCase();
      if (clientNameNorm && (invClientName === clientNameNorm || invLegalName === clientNameNorm)) return true;
      if (clientLegalNorm && (invClientName === clientLegalNorm || invLegalName === clientLegalNorm)) return true;
      if (client.fileNo && invClientName.includes(client.fileNo.toLowerCase())) return true;
      return false;
    });
  }, [subTab, proformas, invoices, client.id, client.name, client.legalName, client.fileNo]);

  // Pagination calculation
  const totalItems = clientInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return clientInvoices.slice(start, start + rowsPerPage);
  }, [clientInvoices, page, rowsPerPage]);

  const handleOpenCreate = () => {
    // Automatically prefill client details and their actual in-use services
    const initialServices =
      inUseServices.length > 0
        ? inUseServices.map((cs, idx) => ({
          id: `srv-${Date.now()}-${idx}`,
          serviceName: cs.serviceName,
          description: `${cs.serviceName} compliance (${cs.frequency})`,
          compliancePeriod: "FY 2026-27",
          frequency: (cs.frequency as any) || "Monthly",
          periodLabel: cs.frequency || "Monthly Retainer",
          quantity: 1,
          price: cs.amount || 0,
          amount: cs.amount || 0,
          total: cs.amount || 0,
        }))
        : [
          {
            id: `srv-${Date.now()}`,
            serviceName: availableServices[0]?.name || "Accounting & Compliance",
            description: "Professional service compliance retainer",
            compliancePeriod: "FY 2026-27",
            frequency: "Monthly",
            periodLabel: "Monthly Retainer",
            quantity: 1,
            price: availableServices[0]?.professionalFee || 5000,
            amount: availableServices[0]?.professionalFee || 5000,
            total: availableServices[0]?.professionalFee || 5000,
          },
        ];

    const prefilledData: Partial<InvoiceRecord> = {
      clientId: client.id,
      clientBusinessName: client.name || "",
      clientLegalName: client.legalName || client.name || "",
      clientAddress: client.address || client.addressDetails?.addressLine1 || "",
      clientGstin: (client as any).gstin || "",
      clientPan: client.pan || "",
      clientGroup: client.group || "",
      billingOrg: primaryOrgName,
      date: new Date().toLocaleDateString("en-GB"),
      dueDate: new Date(Date.now() + 15 * 86400000).toLocaleDateString("en-GB"),
      services: initialServices,
    };

    setSelectedRecord(prefilledData as InvoiceRecord);
    setFormMode("create");
    setViewMode("form");
  };

  const handleView = (record: InvoiceRecord) => {
    setSelectedRecord(record);
    setPreviewModalRecord(record);
    setPreviewModalFormat(invoiceFormat);
  };

  // Intercept Ctrl+P / Cmd+P when invoice preview modal is open to route to high-fidelity isolated multi-page printer
  useEffect(() => {
    if (!previewModalRecord) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        printInvoiceElement("invoice-printable-root");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewModalRecord]);

  const handleEdit = (record: InvoiceRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRecord(record);
    setPreviewModalRecord(null);
    setFormMode("edit");
    setViewMode("form");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedRecord(null);
    setPreviewModalRecord(null);
    setFormMode("create");
  };

  if (viewMode === "form") {
    return (
      <div className="w-full">
        <AddInvoiceForm
          type={subTab}
          mode={formMode}
          initialData={selectedRecord || undefined}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  const subTabLabel = subTab === "proforma" ? "Proforma Invoice" : "Regular Invoice";

  return (
    <div className="w-full space-y-4">
      {/* Sub-toggle pills using global CSS variables */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setSubTab("proforma");
            setPage(1);
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${subTab === "proforma"
            ? "shadow-xs"
            : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          style={
            subTab === "proforma"
              ? {
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
                borderColor: "var(--primary-border)",
              }
              : undefined
          }
        >
          Proforma Invoice
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab("invoice");
            setPage(1);
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${subTab === "invoice"
            ? "shadow-xs"
            : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          style={
            subTab === "invoice"
              ? {
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
                borderColor: "var(--primary-border)",
              }
              : undefined
          }
        >
          Regular Invoice
        </button>
      </div>

      {/* Section Header with Title(Count), Format Selector, & + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          {subTabLabel} ({clientInvoices.length})
        </h2>
        {/* Organization Default Format Switcher */}

        <div className="flex items-center gap-3">
          {/* <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/90 p-1 rounded-xl border border-[#dde2e8] dark:border-[#334155] text-xs shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 px-1.5 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-[#3D6A9E]" />
              <span className="hidden sm:inline">Format:</span>
            </span>
            {(["modern", "classic", "minimal"] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => handleChangeGlobalFormat(fmt)}
                disabled={isUpdatingFormat}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${invoiceFormat === fmt
                    ? "bg-white dark:bg-gray-900 text-[#3D6A9E] shadow-xs border border-gray-200 dark:border-gray-700 font-bold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50"
                  }`}
                title={`Set organization default format to ${fmt}`}
              >
                {fmt}
              </button>
            ))}
          </div> */}

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-white shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className="border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 font-semibold"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                <th className="py-3 px-4 w-[120px]">ID</th>
                <th className="py-3 px-4 min-w-[220px]">Service</th>
                <th className="py-3 px-4 min-w-[200px]">Organization</th>
                <th className="py-3 px-4 min-w-[110px]">Invoice Date</th>
                <th className="py-3 px-4 text-right min-w-[110px]">Invoice Amount</th>
                <th className="py-3 px-4 text-right min-w-[110px]">Balance</th>
                <th className="py-3 px-4 text-center min-w-[110px]">Linked Users</th>
                <th className="py-3 px-4 min-w-[140px]">Payment Account</th>
                <th className="py-3 px-4 text-center min-w-[100px]">Status</th>
                <th className="py-3 px-4 text-center min-w-[130px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        No {subTabLabel.toLowerCase()}s found for {client.name}
                      </p>
                      <p className="text-[11px] text-gray-400 max-w-sm">
                        Click the &quot;+ Add&quot; button above to create a {subTabLabel.toLowerCase()} with prefilled services and rates.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-colors cursor-pointer"
                        style={{ backgroundColor: "var(--premium-blue-dark)" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")
                        }
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create {subTabLabel}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((record) => {
                  // Resolve actual services from the invoice or match client in-use services
                  const servicesList = (record.services || [])
                    .map((s) => s.serviceName)
                    .filter(Boolean);

                  const primaryService =
                    servicesList[0] ||
                    record.source ||
                    inUseServices[0]?.serviceName ||
                    "General Professional Services";

                  const additionalCount = servicesList.length > 1 ? servicesList.length - 1 : 0;

                  const sBadge = getServiceBadgeStyle(primaryService);
                  const sInitials = getInitials(primaryService);

                  const orgName = record.billingOrg || primaryOrgName;
                  const orgInitials = getInitials(orgName);

                  const paymentAccName =
                    record.bankAccountId && bankMap.has(record.bankAccountId)
                      ? bankMap.get(record.bankAccountId)
                      : "-";

                  const linkedUser = (record as any).assignee || record.clientId;

                  const status = record.status || "Pending";
                  const isPaid = status === "Paid";
                  const isPending = status === "Pending";
                  const isOverdue = status === "Overdue";
                  const isPartial = status === "Partially Paid";

                  return (
                    <tr
                      key={record.id}
                      onClick={() => handleView(record)}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer group"
                    >
                      {/* ID */}
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        <span
                          className="font-mono transition-colors"
                          style={{ color: "var(--text-main)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-main)")}
                        >
                          {record.number || `#${record.id.slice(0, 8)}`}
                        </span>
                      </td>

                      {/* Service (Actual in-use services displayed) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${sBadge.bg} ${sBadge.text}`}
                          >
                            {sInitials}
                          </span>
                          <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                            <span className="font-medium text-gray-800 dark:text-gray-200 truncate" title={servicesList.join(", ") || primaryService}>
                              {primaryService}
                            </span>
                            {additionalCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0">
                                +{additionalCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Organization */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0"
                            style={{
                              backgroundColor: "var(--primary-light)",
                              color: "var(--primary)",
                            }}
                          >
                            {orgInitials}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                            {orgName}
                          </span>
                        </div>
                      </td>

                      {/* Invoice Date */}
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(record.date)}
                      </td>

                      {/* Invoice Amount */}
                      <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {Number(record.totalPayable || 0).toFixed(2)}
                      </td>

                      {/* Balance */}
                      <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {Number(
                          record.balanceAmount !== undefined ? record.balanceAmount : record.totalPayable || 0
                        ).toFixed(2)}
                      </td>

                      {/* Linked Users */}
                      <td className="py-3 px-4 text-center">
                        {linkedUser ? (
                          <div
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-[9px]"
                            style={{
                              backgroundColor: "var(--primary-light)",
                              color: "var(--primary)",
                            }}
                          >
                            {getInitials(typeof linkedUser === "string" ? linkedUser : "User")}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Payment Account */}
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 truncate max-w-[140px]">
                        {paymentAccName}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${isPaid
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : isPending
                              ? "bg-[#fee2e2] dark:bg-[#7f1d1d]/40 text-[#b91c1c] dark:text-[#fca5a5]"
                              : isOverdue
                                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                                : isPartial
                                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                            }`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(record);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3D6A9E] hover:underline cursor-pointer"
                            title="Preview Invoice Format"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleEdit(record, e)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                            title="Edit Invoice Data"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSignInvoiceWithDsc(record);
                            }}
                            disabled={signingInvoiceId === record.id}
                            className="p-1 rounded-none text-[#31719B] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            title="Sign with DSC (PAdES)"
                          >
                            {signingInvoiceId === record.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#31719B]" />
                            ) : (
                              <PenTool className="w-3.5 h-3.5 text-[#31719B]" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Controls */}
        <div className="flex flex-wrap items-center justify-end gap-6 px-4 py-3 border-t border-[#dde2e8] dark:border-[#334155] text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="bg-transparent border border-[#dde2e8] dark:border-[#334155] rounded px-1.5 py-0.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div>
            {totalItems > 0 ? (
              <span>
                {(page - 1) * rowsPerPage + 1}-
                {Math.min(page * rowsPerPage, totalItems)} of {totalItems}
              </span>
            ) : (
              <span>0-0 of 0</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Full Invoice Preview & Format Switcher Modal */}
      {previewModalRecord && (() => {
        const selectedBankRecord = bankAccounts.find((b) => b.id === previewModalRecord.bankAccountId) || bankAccounts.find((b) => b.isPrimary) || bankAccounts[0];
        const firmAddr = orgDetails?.addressDetails
          ? [
            orgDetails.addressDetails.addressLine1,
            orgDetails.addressDetails.addressLine2,
            orgDetails.addressDetails.city,
            orgDetails.addressDetails.state,
            orgDetails.addressDetails.pincode,
          ].filter(Boolean).join(", ")
          : undefined;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150 print:static print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none print:overflow-visible">
            <div className="w-full max-w-4xl bg-[#f8fafc] dark:bg-[#0f172a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden print:max-w-none print:max-h-none print:h-auto print:shadow-none print:border-none print:m-0 print:p-0 print:overflow-visible">
              {/* Modal Header - Hidden in Print */}
              <div className="px-5 py-3.5 bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    {previewModalRecord.number || `#${previewModalRecord.id.slice(0, 8)}`}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {subTab === "proforma" ? "Proforma Invoice" : "Tax Invoice"} Preview
                  </span>
                </div>

                {/* Format Switcher Pills */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs">
                    <span className="text-[11px] font-semibold text-gray-500 px-1.5 flex items-center gap-1">
                      <Palette className="w-3 h-3 text-[#3D6A9E]" />
                      Format:
                    </span>
                    {(["modern", "classic", "minimal"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setPreviewModalFormat(fmt)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${previewModalFormat === fmt
                          ? "bg-white dark:bg-gray-900 text-[#3D6A9E] shadow-xs border border-gray-200 dark:border-gray-700"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                          }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>

                  {/* Set as Organization Default Button if different */}
                  {previewModalFormat !== invoiceFormat && (
                    <button
                      type="button"
                      onClick={() => handleChangeGlobalFormat(previewModalFormat)}
                      disabled={isUpdatingFormat}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer transition-colors"
                      title="Set this format as default for the firm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Set as Default</span>
                    </button>
                  )}

                  {/* Columns Selector Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowColumnDropdown((prev) => !prev)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold cursor-pointer border border-gray-200 dark:border-gray-700 transition-colors"
                      title="Choose which columns will print"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#3D6A9E]" />
                      <span>Columns</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#3D6A9E]/15 text-[#3D6A9E] font-bold">
                        {[printColumns.hsnSac, printColumns.qty, printColumns.description, printColumns.cgst, printColumns.sgst].filter(Boolean).length}/5
                      </span>
                    </button>

                    {showColumnDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1 mb-1 border-b border-gray-100 dark:border-gray-700">
                          Print Columns
                        </div>
                        <label className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={printColumns.hsnSac}
                            onChange={() => handleToggleColumn("hsnSac")}
                            className="rounded text-[#3D6A9E] focus:ring-[#3D6A9E] accent-[#3D6A9E] w-3.5 h-3.5"
                          />
                          <span className="font-medium">HSN / SAC</span>
                        </label>
                        <label className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={printColumns.qty}
                            onChange={() => handleToggleColumn("qty")}
                            className="rounded text-[#3D6A9E] focus:ring-[#3D6A9E] accent-[#3D6A9E] w-3.5 h-3.5"
                          />
                          <span className="font-medium">Quantity (QTY)</span>
                        </label>
                        <label className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={printColumns.description}
                            onChange={() => handleToggleColumn("description")}
                            className="rounded text-[#3D6A9E] focus:ring-[#3D6A9E] accent-[#3D6A9E] w-3.5 h-3.5"
                          />
                          <span className="font-medium">Item Description</span>
                        </label>
                        <label className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={printColumns.cgst}
                            onChange={() => handleToggleColumn("cgst")}
                            className="rounded text-[#3D6A9E] focus:ring-[#3D6A9E] accent-[#3D6A9E] w-3.5 h-3.5"
                          />
                          <span className="font-medium">CGST</span>
                        </label>
                        <label className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={printColumns.sgst}
                            onChange={() => handleToggleColumn("sgst")}
                            className="rounded text-[#3D6A9E] focus:ring-[#3D6A9E] accent-[#3D6A9E] w-3.5 h-3.5"
                          />
                          <span className="font-medium">SGST</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Print button */}
                  <button
                    type="button"
                    onClick={() => printInvoiceElement("invoice-printable-root")}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold cursor-pointer transition-colors"
                    title="Print Invoice"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#3D6A9E]" />
                    <span>Print</span>
                  </button>

                  {/* Download PDF button */}
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={isDownloadingPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                    title="Download as PDF"
                  >
                    <Download className={`w-3.5 h-3.5 text-[#3D6A9E] ${isDownloadingPDF ? "animate-bounce" : ""}`} />
                    <span>{isDownloadingPDF ? "Downloading..." : "Download PDF"}</span>
                  </button>

                  {/* Sign with DSC Button */}
                  <button
                    type="button"
                    onClick={() => handleSignInvoiceWithDsc(previewModalRecord)}
                    disabled={signingInvoiceId === previewModalRecord.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#31719B] text-white hover:opacity-90 cursor-pointer transition-colors shadow-2xs"
                    title="Sign with DSC (PAdES)"
                  >
                    {signingInvoiceId === previewModalRecord.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <PenTool className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>Sign with DSC</span>
                  </button>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => handleEdit(previewModalRecord)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#3D6A9E] text-white hover:bg-[#325884] cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Data</span>
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setPreviewModalRecord(null)}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Render InvoiceLivePreview */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 print:p-0 print:m-0 print:max-h-none print:h-auto print:overflow-visible">
                <div className="max-w-3xl mx-auto shadow-lg rounded-xl overflow-hidden print:max-w-none print:shadow-none print:rounded-none print:overflow-visible">
                  <InvoiceLivePreview
                    template={previewModalFormat}
                    accentColor={activeInvoiceColor}
                    firmName={primaryOrgName}
                    firmAddress={firmAddr}
                    firmGstin={(orgDetails?.addressDetails as any)?.gstin || (orgDetails as any)?.gstin}
                    firmPan={(orgDetails?.addressDetails as any)?.pan || (orgDetails as any)?.pan}
                    firmLogoUrl={firmLogoUrl}
                    digitalSignatureUrl={digitalSignatureUrl}
                    showCaLogo={showCaLogo}
                    showHsnSac={printColumns.hsnSac}
                    showQuantity={printColumns.qty}
                    showDescription={printColumns.description}
                    showCgst={printColumns.cgst}
                    showSgst={printColumns.sgst}
                    invoiceType={subTab === "proforma" ? "proforma" : "invoice"}
                    title={subTab === "proforma" ? "Proforma Invoice" : "Tax Invoice"}
                    invoiceNumber={previewModalRecord.number || "INV/2026-001"}
                    invoiceDate={previewModalRecord.date || new Date().toLocaleDateString("en-GB")}
                    dueDate={previewModalRecord.dueDate || new Date(Date.now() + 15 * 86400000).toLocaleDateString("en-GB")}
                    clientName={previewModalRecord.clientBusinessName || client.name}
                    clientLegalName={previewModalRecord.clientLegalName || client.legalName || client.name}
                    clientAddress={previewModalRecord.clientAddress || client.address}
                    clientGstin={previewModalRecord.clientGstin || (client as any).gstin}
                    clientPan={previewModalRecord.clientPan || client.pan}
                    clientEmail={client.email}
                    clientPhone={client.mobile || (client as any).phone}
                    clientPos={(previewModalRecord as any).placeOfSupply || (client as any).placeOfSupply || "27-Maharashtra"}
                    items={(previewModalRecord.services && previewModalRecord.services.length > 0)
                      ? previewModalRecord.services.map((s, idx) => {
                        const taxable = s.amount !== undefined ? s.amount : ((s.price || 0) * (s.quantity || 1));
                        const itemCgst = Math.round((taxable * 0.09) * 100) / 100;
                        const itemSgst = Math.round((taxable * 0.09) * 100) / 100;
                        return {
                          id: s.id || String(idx + 1),
                          name: s.serviceName,
                          description: s.description,
                          hsnSac: (s as any).hsnSac || "998211",
                          qty: s.quantity || 1,
                          rate: s.price || 0,
                          taxable,
                          gstRate: 18,
                          cgst: itemCgst,
                          sgst: itemSgst,
                          total: taxable + itemCgst + itemSgst,
                        };
                      })
                      : (previewModalRecord as any).serviceName || (previewModalRecord as any).service
                        ? (() => {
                          const taxable = previewModalRecord.subTotal || previewModalRecord.totalPayable || 0;
                          const itemCgst = Math.round((taxable * 0.09) * 100) / 100;
                          const itemSgst = Math.round((taxable * 0.09) * 100) / 100;
                          return [{
                            id: "1",
                            name: (previewModalRecord as any).serviceName || (previewModalRecord as any).service,
                            description: (previewModalRecord as any).description || (previewModalRecord as any).serviceName || (previewModalRecord as any).service,
                            hsnSac: (previewModalRecord as any).hsnSac || "998211",
                            qty: 1,
                            rate: taxable,
                            taxable,
                            gstRate: 18,
                            cgst: itemCgst,
                            sgst: itemSgst,
                            total: taxable + itemCgst + itemSgst,
                          }];
                        })()
                        : undefined}
                    subtotal={previewModalRecord.subTotal}
                    totalAmount={
                      previewModalRecord.totalPayable && previewModalRecord.totalPayable > (previewModalRecord.subTotal || 0)
                        ? previewModalRecord.totalPayable
                        : undefined
                    }
                    notes={previewModalRecord.notes || orgDetails?.invoiceSettings?.defaultInvoiceNote}
                    bankName={
                      selectedBankRecord?.bankName || orgDetails?.paymentDetails?.bankDetails?.bankName || "HDFC Bank"
                    }
                    accountHolderName={selectedBankRecord?.accountBusinessName || orgDetails?.paymentDetails?.bankDetails?.accountHolderName || primaryOrgName}
                    accountNumber={selectedBankRecord?.accountNumber || orgDetails?.paymentDetails?.bankDetails?.accountNumber || "50200012345678"}
                    ifscCode={selectedBankRecord?.ifscCode || orgDetails?.paymentDetails?.bankDetails?.ifscCode || "HDFC0001234"}
                    branchName={selectedBankRecord?.branchAddress || (selectedBankRecord as any)?.branchName || orgDetails?.paymentDetails?.bankDetails?.branchName || "Koramangala, Bengaluru"}
                    upiId={selectedBankRecord?.upi || (selectedBankRecord as any)?.upiId || orgDetails?.paymentDetails?.bankDetails?.upiId || "sharma@hdfc"}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export const ClientInvoicesTab: React.FC<ClientInvoicesTabProps> = (props) => {
  return (
    <InvoiceProvider>
      <ClientInvoicesInner {...props} />
    </InvoiceProvider>
  );
};
