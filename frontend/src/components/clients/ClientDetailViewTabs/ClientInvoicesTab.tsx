"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Client } from "@/data/crmData";
import { InvoiceProvider, useInvoice } from "@/components/invoice/InvoiceContext";
import { InvoiceRecord } from "@/components/invoice/types";
import { AddInvoiceForm } from "@/components/invoice/AddInvoiceForm";
import { serviceApi } from "@/services/serviceApi";
import { Service } from "@/data/serviceData";
import { organizationApi } from "@/services/organizationApi";

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

  // Fetch actual organization and services from DB
  useEffect(() => {
    organizationApi
      .getOrganization()
      .then((res) => {
        if (res.data?.name) {
          setPrimaryOrgName(res.data.name);
        }
      })
      .catch(() => {});

    serviceApi
      .getServices({ limit: 100 })
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setAvailableServices(res.data);
        }
      })
      .catch(() => {});
  }, []);

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
    setFormMode("view");
    setViewMode("form");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedRecord(null);
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
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
            subTab === "proforma"
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
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
            subTab === "invoice"
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

      {/* Section Header with Title(Count) & + Add button using global CSS variables */}
      <div className="flex items-center justify-between pb-1">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          {subTabLabel} ({clientInvoices.length})
        </h2>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
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
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                            isPaid
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
