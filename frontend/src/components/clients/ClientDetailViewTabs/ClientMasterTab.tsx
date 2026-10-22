import React from "react";
import { Client } from "@/data/crmData";

export interface ClientMasterTabProps {
  client: Client;
}

export const ClientMasterTab: React.FC<ClientMasterTabProps> = ({ client }) => {
  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] p-6 shadow-card space-y-6">
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">
          Entity Master Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400 block font-medium">
              Legal / Business Name
            </span>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">
              {client.legalName || client.name}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block font-medium">
              File Number
            </span>
            <span className="font-semibold text-gray-900 dark:text-white font-mono">
              #{client.fileNo || "PVT0000"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block font-medium">
              Permanent Account Number (PAN)
            </span>
            <span className="font-semibold text-gray-900 dark:text-white font-mono">
              {client.pan || "ATVOO3872J"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block font-medium">
              Entity / Business Type
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {client.type || "Private Limited Company"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block font-medium">
              Primary Mobile
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {client.mobile}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block font-medium">
              Primary Email
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {client.email}
            </span>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500 dark:text-gray-400 block font-medium">
              Registered Address
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {client.address || "104, Industrial Estate, Phase 2, Peenya"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block font-medium">
              City, State & Pincode
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {client.city}, {client.state} - {client.pincode}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block font-medium">
              Client Group
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {client.group || "Corporate Clients"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block font-medium">
              Status
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {client.active !== false ? "Active & In Good Standing" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-[#dde2e8] dark:border-[#334155] pt-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
          Entity Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {client.tags?.map((t) => (
            <span
              key={t}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
