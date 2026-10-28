"use client";

import React, { memo, useState } from "react";
import { Plus, Search, FileText, ExternalLink, Calendar, CheckCircle2, Clock } from "lucide-react";
import { Lead } from "@/data/crmData";

interface ProposalTabProps {
  lead: Lead;
}

export interface ProposalItem {
  id: string;
  proposalNo: string;
  title: string;
  date: string;
  validUntil?: string;
  status: "Draft" | "Sent" | "Accepted" | "Expired";
  amount?: number;
}

export const ProposalTab = memo(({ lead }: ProposalTabProps) => {
  const [search, setSearch] = useState("");
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state for creating a proposal
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalAmount, setProposalAmount] = useState("");
  const [validUntilDate, setValidUntilDate] = useState("");

  const filteredProposals = proposals.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.proposalNo.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
    );
  });

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalTitle.trim()) return;

    const newProposal: ProposalItem = {
      id: `prop-${Date.now()}`,
      proposalNo: `PROP-${new Date().getFullYear()}-${String(proposals.length + 1).padStart(3, "0")}`,
      title: proposalTitle.trim(),
      date: new Date().toLocaleDateString("en-GB"),
      validUntil: validUntilDate || undefined,
      status: "Draft",
      amount: proposalAmount ? parseFloat(proposalAmount) : undefined,
    };

    setProposals([newProposal, ...proposals]);
    setProposalTitle("");
    setProposalAmount("");
    setValidUntilDate("");
    setIsCreateModalOpen(false);
  };

  const getStatusBadge = (status: ProposalItem["status"]) => {
    switch (status) {
      case "Accepted":
        return "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 border-green-300";
      case "Sent":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300";
      case "Expired":
        return "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300";
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Tab Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-[#e2e8f0] dark:border-[#334155]">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          Proposals ({proposals.length})
        </h2>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[200px] md:min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search proposals..."
              className="h-8.5 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] pl-8.5 pr-3 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
            />
          </div>

          {/* Add Proposal Button */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 h-8.5 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: "var(--premium-blue-dark, #31719B)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Proposal</span>
          </button>
        </div>
      </div>

      {/* Proposals List or Empty State */}
      {filteredProposals.length > 0 ? (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] overflow-hidden shadow-sm">
          <div className="overflow-x-auto scrollbar-slim">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-b border-[#e2e8f0] dark:border-[#334155] font-semibold">
                  <th scope="col" className="px-4 py-3">Proposal No</th>
                  <th scope="col" className="px-4 py-3">Title</th>
                  <th scope="col" className="px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3">Valid Until</th>
                  <th scope="col" className="px-4 py-3">Amount</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredProposals.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-[#31719B]">
                      {item.proposalNo}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {item.title}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {item.date}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {item.validUntil || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {item.amount !== undefined ? `₹${item.amount.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => alert(`Viewing ${item.proposalNo}`)}
                        className="text-xs text-[#31719B] hover:underline font-semibold cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] p-10 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#31719B]/10 text-[#31719B] flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              No Proposals Yet
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              Draft and manage formal engagement proposals, service agreements, and fee terms for {lead.fullName || lead.businessName || "this lead"}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 shadow-sm cursor-pointer"
            style={{ backgroundColor: "var(--premium-blue-dark, #31719B)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Proposal</span>
          </button>
        </div>
      )}

      {/* Quick Create Proposal Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#31719B]" />
                Create Proposal for {lead.fullName || lead.businessName || "Lead"}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProposal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Proposal Title / Scope *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Audit & Statutory Compliance"
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-xs text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Proposed Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="25,000"
                    value={proposalAmount}
                    onChange={(e) => setProposalAmount(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-xs text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={validUntilDate}
                    onChange={(e) => setValidUntilDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f172a] text-xs text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#31719B] text-white text-xs font-semibold hover:bg-[#285c7d] shadow-sm cursor-pointer"
                >
                  Save Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

ProposalTab.displayName = "ProposalTab";
