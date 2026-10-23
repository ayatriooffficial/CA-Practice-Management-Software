"use client";

import React, { memo } from "react";
import { Building2, User, Phone, Briefcase, Mail, MapPin } from "lucide-react";
import { Lead } from "@/data/crmData";

interface BusinessInfoCardProps {
  lead: Lead;
}

export const BusinessInfoCard = memo(({ lead }: BusinessInfoCardProps) => {
  const businessName = lead.businessName?.trim();
  const address = [lead.address, lead.state, lead.country]
    .filter(Boolean)
    .join(", ")
    .trim();

  return (
    <div className="bg-white dark:bg-[#1e293b]  border border-[#e2e8f0] dark:border-[#334155] p-4 flex flex-col space-y-3.5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
        Business Info
      </div>

      <div className="space-y-2.5 text-xs">
        {/* Business Entity Name - only if real businessName exists */}
        {businessName && (
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-semibold truncate">{businessName}</span>
          </div>
        )}

        {/* Contact Person Name */}
        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
          <User className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="font-medium truncate">{lead.fullName}</span>
        </div>

        {/* Business Type */}
        {lead.businessType && (
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-medium">{lead.businessType}</span>
          </div>
        )}

        {/* Mobile Number */}
        {lead.mobile && (
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <a
              href={`tel:${lead.mobile}`}
              className="font-medium text-[#31719B] dark:text-[#60a5fa] hover:underline"
            >
              {lead.mobile}
            </a>
          </div>
        )}

        {/* Email if available */}
        {lead.email && (
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <a
              href={`mailto:${lead.email}`}
              className="font-medium text-[#31719B] dark:text-[#60a5fa] hover:underline truncate"
            >
              {lead.email}
            </a>
          </div>
        )}

        {/* Location if available */}
        {address && (
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-medium truncate">{address}</span>
          </div>
        )}
      </div>
    </div>
  );
});

BusinessInfoCard.displayName = "BusinessInfoCard";
