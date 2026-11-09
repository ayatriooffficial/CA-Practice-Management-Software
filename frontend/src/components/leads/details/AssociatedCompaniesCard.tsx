"use client";

import React, { memo } from "react";
import { Building2, Plus, ExternalLink, ShieldCheck } from "lucide-react";
import { Lead } from "@/data/crmData";
import { useLeadCompanies } from "@/hooks/useLeadsQuery";
import Link from "next/link";
import Button from "@/components/ui/Button";

interface AssociatedCompaniesCardProps {
  lead: Lead;
  onRegisterCompany?: () => void;
}

export const AssociatedCompaniesCard = memo(
  ({ lead, onRegisterCompany }: AssociatedCompaniesCardProps) => {
    const { data: fetchedCompanies = [], isLoading } = useLeadCompanies(lead.id);

    // Combine any companies passed on the lead object with fetched companies
    const companies =
      fetchedCompanies.length > 0
        ? fetchedCompanies
        : Array.isArray(lead.companies)
          ? lead.companies
          : [];

    return (
      <div className="w-full bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] p-4.5 shadow-sm space-y-3.5">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-[#334155]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#31719B]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Associated Companies (Clients)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#31719B] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {companies.length}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Companies where &ldquo;{lead.fullName}&rdquo; is registered as Promoter / Director
              </p>
            </div>
          </div>

          {onRegisterCompany && (
            <Button
              type="button"
              onClick={onRegisterCompany}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Company</span>
            </Button>
          )}
        </div>

        {/* Loading */}
        {isLoading && companies.length === 0 && (
          <div className="py-6 text-center text-xs text-gray-400">
            Loading associated companies...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && companies.length === 0 && (
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#0f172a] border border-dashed border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-gray-500 dark:text-gray-400 text-center sm:text-left">
              <span className="font-semibold text-gray-700 dark:text-gray-300 block">
                No company associated yet
              </span>
              Register a company with {lead.fullName} designated as the Director or Promoter.
            </div>
            {onRegisterCompany && (
              <button
                type="button"
                onClick={onRegisterCompany}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-semibold text-[#31719B] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Register Company</span>
              </button>
            )}
          </div>
        )}

        {/* Companies Grid */}
        {companies.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {companies.map((comp: any) => {
              const compId = comp.id || comp._id;
              const promoters = comp.customerFiles?.promoter || [];
              const thisPromoter = promoters.find(
                (p: any) =>
                  (p.pan && lead.pan && p.pan.toUpperCase() === lead.pan.toUpperCase()) ||
                  (p.name && p.name.trim().toLowerCase() === lead.fullName.trim().toLowerCase())
              );
              const designation = thisPromoter?.designation || "Director / Promoter";
              const share = thisPromoter?.share;

              return (
                <div
                  key={compId}
                  className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f172a]/60 hover:border-[#31719B] transition-colors space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white truncate text-sm">
                        {comp.name || comp.legalName}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {comp.type ? comp.type.toUpperCase() : "COMPANY"} · File:{" "}
                        {comp.fileNo || "—"}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 shrink-0">
                      {comp.status || "Active"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/60 dark:border-gray-800">
                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                      {designation}
                      {share ? ` (${share})` : ""}
                    </span>

                    <Link
                      href={`/clients?search=${encodeURIComponent(comp.name || "")}`}
                      className="flex items-center gap-1 font-semibold text-[#31719B] hover:underline"
                    >
                      <span>View Client</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

AssociatedCompaniesCard.displayName = "AssociatedCompaniesCard";

