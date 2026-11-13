"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Loader2, User, ExternalLink, Crown } from "lucide-react";
import { groupApi, GroupContactRecord, GroupRecord } from "@/services/groupApi";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";

interface GroupContactsTabProps {
  groupId: string;
  group?: GroupRecord | null;
}

const getInitials = (name?: string) => {
  if (!name) return "CO";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const GroupContactsTab: React.FC<GroupContactsTabProps> = ({ groupId, group }) => {
  const [contacts, setContacts] = useState<GroupContactRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const pocClientIdStr = useMemo(() => {
    if (!group) return null;
    return typeof group.pocClientId === "string"
      ? group.pocClientId
      : (group.pocClientId as any)?.id || (group.pocClientId as any)?._id?.toString() || (group.poc?.clientId);
  }, [group]);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    groupApi
      .getGroupContacts(groupId)
      .then((res) => {
        if (isMounted && res.data) {
          setContacts(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [groupId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const term = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.clientName.toLowerCase().includes(term) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.mobile && c.mobile.includes(term)) ||
        (c.din && c.din.toLowerCase().includes(term)) ||
        (c.pan && c.pan.toLowerCase().includes(term))
    );
  }, [contacts, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, limit]);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Top Search Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-[200px] sm:min-w-[280px]">
          <Input
            inputSize="sm"
            placeholder="Search group contacts..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onClear={() => {
              setSearch("");
              setPage(1);
            }}
            leftIcon={<Search className="w-3.5 h-3.5 text-gray-400" />}
          />
        </div>
      </div>

      {/* Horizontally Scrollable Aggregated Contacts Table (Image 3) */}
      <div className="w-full bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] rounded-none overflow-x-auto shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/70 dark:bg-slate-800/60 border-b border-[#dde2e8] dark:border-[#334155] text-gray-500 dark:text-gray-400 font-semibold select-none whitespace-nowrap">
              <th className="py-2.5 px-3 min-w-[170px]">Contact Name</th>
              <th className="py-2.5 px-3 min-w-[160px]">Client</th>
              <th className="py-2.5 px-3 min-w-[180px]">Email</th>
              <th className="py-2.5 px-3 min-w-[120px]">Mobile</th>
              <th className="py-2.5 px-3 min-w-[100px]">PAN</th>
              <th className="py-2.5 px-3 min-w-[90px]">DIN</th>
              <th className="py-2.5 px-3 min-w-[90px]">DIN Status</th>
              <th className="py-2.5 px-3 min-w-[130px]">Date of Appointment</th>
              <th className="py-2.5 px-3 min-w-[100px]">Date of Birth</th>
              <th className="py-2.5 px-3 min-w-[120px]">Aadhar Number</th>
              <th className="py-2.5 px-3 min-w-[120px]">Passport Number</th>
              <th className="py-2.5 px-3 min-w-[130px]">Father's Name</th>
              <th className="py-2.5 px-3 min-w-[220px]">Address Line</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-slate-800 whitespace-nowrap">
            {isLoading ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#31719B]" />
                  <span>Loading group contacts...</span>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-gray-400">
                  No contacts added yet.
                </td>
              </tr>
            ) : (
              paginated.map((contact, idx) => (
                <tr
                  key={contact.id || idx}
                  className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Contact Name (Avatar + Name) */}
                  <td className="py-2.5 px-3">
                    {(() => {
                      const isPoc = Boolean(
                        contact.isGroupPoc ||
                        (pocClientIdStr && String(contact.clientId) === String(pocClientIdStr) && (contact.isPrimary || contacts.filter(c => String(c.clientId) === String(pocClientIdStr))[0]?.id === contact.id))
                      );

                      return (
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            isPoc
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700"
                              : "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                          }`}>
                            {getInitials(contact.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-800 dark:text-slate-200 block truncate max-w-[140px]">
                                {contact.name}
                              </span>
                              {isPoc && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                                  <Crown size={9} className="fill-amber-500" />
                                  <span>POC</span>
                                </span>
                              )}
                            </div>
                            {contact.isPrimary && !isPoc && (
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                Primary
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Client (Link) */}
                  <td className="py-2.5 px-3">
                    <Link
                      href={`/client/${contact.clientId}`}
                      className="font-medium text-[#31719B] hover:underline flex items-center gap-1 truncate max-w-[150px]"
                      title={contact.clientName}
                    >
                      <span>{contact.clientName}</span>
                      <ExternalLink size={10} className="shrink-0 text-gray-400" />
                    </Link>
                  </td>

                  {/* Email */}
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 truncate max-w-[180px]">
                    {contact.email || "-"}
                  </td>

                  {/* Mobile */}
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 font-mono">
                    {contact.mobile || "-"}
                  </td>

                  {/* PAN */}
                  <td className="py-2.5 px-3 font-mono text-gray-600 dark:text-gray-400">
                    {contact.pan || "-"}
                  </td>

                  {/* DIN */}
                  <td className="py-2.5 px-3 font-mono text-gray-600 dark:text-gray-400">
                    {contact.din || "-"}
                  </td>

                  {/* DIN Status */}
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                    {contact.dinStatus || "-"}
                  </td>

                  {/* Date of Appointment */}
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                    {contact.appointmentDate || "-"}
                  </td>

                  {/* Date of Birth */}
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                    {contact.dob || "-"}
                  </td>

                  {/* Aadhar */}
                  <td className="py-2.5 px-3 font-mono text-gray-600 dark:text-gray-400">
                    {contact.aadhar || "-"}
                  </td>

                  {/* Passport */}
                  <td className="py-2.5 px-3 font-mono text-gray-600 dark:text-gray-400">
                    {contact.passport || "-"}
                  </td>

                  {/* Father's Name */}
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                    {contact.fatherName || "-"}
                  </td>

                  {/* Address */}
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 truncate max-w-[220px]">
                    {contact.address || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filtered.length > 0 && (
        <Pagination
          currentPage={page}
          pageSize={limit}
          totalItems={filtered.length}
          onPageChange={setPage}
          showPageSize
          pageSizeOptions={[10, 25, 50, 100]}
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

