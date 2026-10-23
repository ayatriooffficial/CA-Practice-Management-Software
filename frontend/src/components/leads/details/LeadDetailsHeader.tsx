"use client";

import React, { memo, useState } from "react";
import {
  UserCheck,
  Edit2,
  MoreVertical,
  X,
  Phone,
  MapPin,
  ChevronDown,
  UserX,
  Trash2,
  Share2,
} from "lucide-react";
import { Lead } from "@/data/crmData";
import { getDirectFilePreviewUrl } from "@/utils/filePreview";

interface LeadDetailsHeaderProps {
  lead: Lead;
  onClose: () => void;
  onEdit: () => void;
  onConvert: () => void;
  onLostLead: () => void;
  onDeleteLead?: () => void;
  onStatusChange?: (status: string) => void;
}

export const LeadDetailsHeader = memo(
  ({
    lead,
    onClose,
    onEdit,
    onConvert,
    onLostLead,
    onDeleteLead,
    onStatusChange,
  }: LeadDetailsHeaderProps) => {
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const servicesList = (lead.servicesInterested || []).filter(
      (s) => typeof s === "string" && s.trim().length > 0
    );

    const currentStatus = lead.status || "Active";

    return (
      <div className="w-full bg-white dark:bg-[#1e293b] px-4 py-3.5 border-b border-[#e2e8f0] dark:border-[#334155] flex flex-wrap items-center justify-between gap-4">
        {/* Left Profile Info */}
        <div className="flex items-center gap-3.5 min-w-0">
          {lead.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getDirectFilePreviewUrl(lead.photo)}
              alt={lead.fullName}
              className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-base border border-emerald-200 dark:border-emerald-800">
              {lead.fullName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "L"}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {lead.fullName}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-gray-400" />
                {lead.mobile}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                {lead.state || lead.country || "India"}
              </span>
            </div>
            {servicesList.length > 0 && (
              <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 truncate">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Services:</span>{" "}
                {servicesList.join(", ")}
              </div>
            )}
          </div>
        </div>

        {/* Right Actions Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="capitalize">{currentStatus}</span>
              <ChevronDown className="w-3 h-3 text-emerald-600 ml-0.5" />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-40 bg-white dark:bg-[#1e293b] rounded-sm shadow-dropdown border border-gray-200 dark:border-gray-700 py-1 z-50 text-xs">
                {["new", "contacted", "qualified", "Active", "converted", "dropped"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      onStatusChange?.(st);
                      setIsStatusDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 capitalize cursor-pointer"
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lost Lead Button */}
          <button
            type="button"
            onClick={onLostLead}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm text-xs font-semibold border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Lost Lead</span>
          </button>

          {/* Convert to Client Button */}
          <button
            type="button"
            onClick={onConvert}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-sm text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: "var(--premium-blue-dark)" }}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Convert to Client</span>
          </button>

          {/* Edit Lead Button */}
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          {/* 3-dots Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="More actions"
              className="p-1.5 rounded-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-[#1e293b] rounded-sm shadow-dropdown border border-gray-200 dark:border-gray-700 py-1 z-50 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigator.clipboard.writeText(window.location.href);
                    alert("Lead link copied to clipboard!");
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>
                {onDeleteLead && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDeleteLead();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Move to Trash</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Close Button X */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="p-1.5 rounded-sm border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
);

LeadDetailsHeader.displayName = "LeadDetailsHeader";
