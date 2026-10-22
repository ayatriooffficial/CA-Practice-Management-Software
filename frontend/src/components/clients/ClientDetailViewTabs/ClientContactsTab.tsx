"use client";

import React from "react";
import { Client } from "@/data/crmData";
import { getAvatarBadge } from "./utils";

interface ClientContactsTabProps {
  client: Client;
  getAvatarBadge?: (text: string, index: number) => React.ReactNode;
}

export const ClientContactsTab: React.FC<ClientContactsTabProps> = ({
  client,
  getAvatarBadge: customGetAvatarBadge,
}) => {
  const renderAvatar = customGetAvatarBadge || getAvatarBadge;

  const contactsList =
    client.promoters && client.promoters.length > 0
      ? client.promoters
      : client.customerFiles?.promoter && client.customerFiles.promoter.length > 0
      ? client.customerFiles.promoter
      : null;

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
      <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155]">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">
          Promoters & Key Contacts
        </h2>
      </div>
      <div className="overflow-x-auto scrollbar-slim">
        <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
          <thead>
            <tr
              className="text-gray-700 dark:text-gray-300"
              style={{ backgroundColor: "var(--orange-havy-light)" }}
            >
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Name
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Designation
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Mobile
              </th>
              <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Email
              </th>
              <th className="px-3.5 py-3 border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                DIN / PAN
              </th>
            </tr>
          </thead>
          <tbody>
            {contactsList && contactsList.length > 0 ? (
              contactsList.map((p: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      {renderAvatar(p.name || p.fullName || "Contact", idx)}
                      <span>{p.name || p.fullName}</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {p.designation || "Director"}
                  </td>
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {p.mobile || client.mobile}
                  </td>
                  <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                    {p.email || client.email || "-"}
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] font-mono text-gray-600 dark:text-gray-300">
                    {p.pan || "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-gray-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    {renderAvatar(client.name, 0)}
                    <span>Authorized Signatory</span>
                  </div>
                </td>
                <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                  Managing Director
                </td>
                <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                  {client.mobile}
                </td>
                <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                  {client.email || "accounts@turia.com"}
                </td>
                <td className="px-3.5 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] font-mono text-gray-600 dark:text-gray-300">
                  {client.pan || "ATVOO38723"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
