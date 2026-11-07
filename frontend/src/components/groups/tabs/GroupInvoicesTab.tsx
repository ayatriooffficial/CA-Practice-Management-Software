"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, FileText, ReceiptText, IndianRupee, Loader2, Eye, PenTool } from "lucide-react";
import { stageAndRedirectToPdfSigner } from "@/services/stageToPdfSigner";
import { GroupRecord } from "@/services/groupApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchInvoicesRequest } from "@/store/features/invoices";
import { InvoiceRecord, InvoiceTab } from "@/components/invoice/types";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";

interface GroupInvoicesTabProps {
  group: GroupRecord;
}

export const GroupInvoicesTab: React.FC<GroupInvoicesTabProps> = ({ group }) => {
  const dispatch = useAppDispatch();
  const rawInvoices = useAppSelector((state) => state.invoices.invoices) || [];
  const rawProformas = useAppSelector((state) => state.invoices.proformas) || [];
  const rawReimbursements = useAppSelector((state) => state.invoices.reimbursements) || [];
  const isLoading = useAppSelector((state) => state.invoices.loading);

  const [activeSubTab, setActiveSubTab] = useState<"invoice" | "proforma" | "reimbursement">("invoice");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [signingId, setSigningId] = useState<string | null>(null);
  const router = useRouter();

  const handleSignWithDsc = async (inv: InvoiceRecord) => {
    setSigningId(inv.id);
    try {
      await stageAndRedirectToPdfSigner(router, {
        fileName: `${inv.number || 'Invoice'}.pdf`,
        invoiceData: {
          invoiceNumber: inv.number || `INV-${inv.id}`,
          clientName: inv.clientBusinessName || inv.clientLegalName || 'Valued Client',
          clientId: inv.clientId,
          date: inv.date,
          dueDate: inv.dueDate,
          totalAmount: inv.totalPayable || (inv as any).amount || 0,
          subTotal: inv.subTotal || 0,
          billingOrg: inv.billingOrg || 'Ayatrio',
          billingAddress: inv.billingAddress || '',
          firmGstin: (inv as any).firmGstin || '',
          firmPan: (inv as any).firmPan || '',
          clientAddress: inv.clientAddress || '',
          clientGstin: inv.clientGstin || '',
          clientPan: inv.clientPan || '',
        },
        clientId: inv.clientId,
        clientName: inv.clientBusinessName || inv.clientLegalName,
      });
    } catch (err: any) {
      console.error('Error staging invoice for DSC:', err);
      alert(err?.message || 'Failed to stage invoice for DSC signing');
    } finally {
      setSigningId(null);
    }
  };

  // Fetch invoices on mount
  useEffect(() => {
    dispatch(fetchInvoicesRequest());
  }, [dispatch]);

  // Identify group's client IDs and names
  const clientIdsSet = useMemo(() => {
    const set = new Set<string>();
    (group.clientIds || []).forEach((c: any) => {
      const cid = typeof c === "string" ? c : c.id || c._id?.toString();
      if (cid) set.add(cid);
    });
    return set;
  }, [group.clientIds]);

  const clientNamesSet = useMemo(() => {
    const set = new Set<string>();
    (group.entities || []).forEach((e: any) => {
      if (e.name) set.add(e.name.toLowerCase().trim());
    });
    return set;
  }, [group.entities]);

  const filterForGroup = (list: InvoiceRecord[]) => {
    return list.filter((item) => {
      const matchId = item.clientId && clientIdsSet.has(item.clientId);
      const cName = item.clientBusinessName || item.clientLegalName;
      const matchName = cName && clientNamesSet.has(cName.toLowerCase().trim());
      return matchId || matchName;
    });
  };

  const groupInvoices = useMemo(() => filterForGroup(rawInvoices), [rawInvoices, clientIdsSet, clientNamesSet]);
  const groupProformas = useMemo(() => filterForGroup(rawProformas), [rawProformas, clientIdsSet, clientNamesSet]);
  const groupReimbursements = useMemo(() => filterForGroup(rawReimbursements), [rawReimbursements, clientIdsSet, clientNamesSet]);

  const currentList = useMemo(() => {
    let list: InvoiceRecord[] = [];
    if (activeSubTab === "invoice") list = groupInvoices;
    else if (activeSubTab === "proforma") list = groupProformas;
    else if (activeSubTab === "reimbursement") list = groupReimbursements;

    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter(
      (inv) => {
        const cName = inv.clientBusinessName || inv.clientLegalName || "";
        return (
          (inv.number && inv.number.toLowerCase().includes(term)) ||
          cName.toLowerCase().includes(term) ||
          (inv.clientGstin && inv.clientGstin.toLowerCase().includes(term))
        );
      }
    );
  }, [activeSubTab, groupInvoices, groupProformas, groupReimbursements, search]);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 3 Sub-Tabs with Counts: Invoice (n) · Proforma (n) · Reimbursement (n) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-[#dde2e8] dark:border-[#334155]">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("invoice")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeSubTab === "invoice"
                ? "bg-purple-50 dark:bg-purple-950/50 text-[#31719B] dark:text-[#93c5fd] border border-purple-200 dark:border-purple-800"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <ReceiptText size={13} />
            <span>Invoice ({groupInvoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("proforma")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeSubTab === "proforma"
                ? "bg-purple-50 dark:bg-purple-950/50 text-[#31719B] dark:text-[#93c5fd] border border-purple-200 dark:border-purple-800"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <FileText size={13} />
            <span>Proforma ({groupProformas.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("reimbursement")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeSubTab === "reimbursement"
                ? "bg-purple-50 dark:bg-purple-950/50 text-[#31719B] dark:text-[#93c5fd] border border-purple-200 dark:border-purple-800"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <IndianRupee size={13} />
            <span>Reimbursement ({groupReimbursements.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="min-w-[200px] sm:min-w-[260px]">
          <Input
            inputSize="sm"
            placeholder="Search by invoice no. or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            leftIcon={<Search className="w-3.5 h-3.5 text-gray-400" />}
          />
        </div>
      </div>

      {/* Invoice Table Container */}
      <div className="w-full bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] rounded-none overflow-x-auto shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/70 dark:bg-slate-800/60 border-b border-[#dde2e8] dark:border-[#334155] text-gray-500 dark:text-gray-400 font-semibold select-none">
              <th className="py-2.5 px-3 min-w-[130px]">Number</th>
              <th className="py-2.5 px-3 min-w-[170px]">Client</th>
              <th className="py-2.5 px-3 min-w-[95px]">Issue Date</th>
              <th className="py-2.5 px-3 min-w-[95px]">Due Date</th>
              <th className="py-2.5 px-3 min-w-[90px]">Status</th>
              <th className="py-2.5 px-3 text-right min-w-[100px]">Total Amount</th>
              <th className="py-2.5 px-3 text-right min-w-[100px]">Balance Due</th>
              <th className="py-2.5 px-3 text-center min-w-[80px]">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#31719B]" />
                  <span>Loading invoices...</span>
                </td>
              </tr>
            ) : currentList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    No invoices for this Group's clients yet.
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Generate an invoice from the header button to start billing.
                  </p>
                </td>
              </tr>
            ) : (
              currentList
                .slice((page - 1) * limit, page * limit)
                .map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-[#31719B] font-mono">
                    <Link href={`/invoice?id=${inv.id}`} className="hover:underline">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-slate-200">
                    {inv.clientBusinessName || inv.clientLegalName}
                  </td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{inv.date || "-"}</td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{inv.dueDate || "-"}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        inv.status === "Paid"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200"
                          : inv.status === "Overdue"
                          ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-200"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200"
                      }`}
                    >
                      {inv.status ? inv.status.toUpperCase() : "ISSUED"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-gray-900 dark:text-white">
                    ₹{(inv.totalPayable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                    ₹{(inv.balanceAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link
                        href={`/invoice?id=${inv.id}`}
                        title="View Invoice"
                        className="p-1 text-gray-500 hover:text-[#31719B] hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleSignWithDsc(inv)}
                        disabled={signingId === inv.id}
                        title="Sign with DSC"
                        className="p-1 text-[#31719B] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                      >
                        {signingId === inv.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#31719B]" />
                        ) : (
                          <PenTool className="w-3.5 h-3.5 text-[#31719B]" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {currentList.length > 0 && (
        <Pagination
          currentPage={page}
          pageSize={limit}
          totalItems={currentList.length}
          onPageChange={setPage}
          showPageSize
          pageSizeOptions={[5, 10, 25, 50]}
          onPageSizeChange={(newSize) => {
            setLimit(newSize);
            setPage(1);
          }}
          className="rounded-none border border-[#dde2e8] dark:border-[#334155]"
        />
      )}
    </div>
  );
};
