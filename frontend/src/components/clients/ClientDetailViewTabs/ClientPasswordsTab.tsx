import React from "react";
import { Plus, Trash2, Eye, EyeOff, Copy } from "lucide-react";
import { ClientPassword } from "@/data/crmData";
import { getAvatarBadge } from "./utils";
import { usePermission } from "../../team/usePermission";

export interface ClientPasswordsTabProps {
  passwords: ClientPassword[];
  revealedPasswords: Record<string, boolean>;
  setRevealedPasswords: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setIsAddPasswordOpen: (open: boolean) => void;
  handleDeletePassword: (pwdId: string, portal: string) => Promise<void>;
  showToast: (msg: string) => void;
}

export const ClientPasswordsTab: React.FC<ClientPasswordsTabProps> = ({
  passwords,
  revealedPasswords,
  setRevealedPasswords,
  setIsAddPasswordOpen,
  handleDeletePassword,
  showToast,
}) => {
  const { canDelete } = usePermission();
  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
      <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            Statutory Portal Credentials
          </h2>
          <p className="text-xs text-gray-500">
            Secure vault for Income Tax, GST, MCA, and TRACES logins
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddPasswordOpen(true)}
          className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          style={{ backgroundColor: "var(--premium-blue-dark)" }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Password</span>
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-slim">
        <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
          <thead>
            <tr
              className="text-gray-700 dark:text-gray-300"
              style={{ backgroundColor: "var(--orange-havy-light)" }}
            >
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Portal
              </th>
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                User ID / Login ID
              </th>
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Password
              </th>
              <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                Remarks
              </th>
              <th className="w-16 px-2 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center font-semibold">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {!passwords || passwords.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400 font-medium">
                  No statutory passwords saved. Click "+ Add Password" to store one securely.
                </td>
              </tr>
            ) : (
              passwords.map((pwd, idx) => {
                const isVisible = revealedPasswords[pwd.id || idx];
                return (
                  <tr
                    key={pwd.id || idx}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                  >
                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {getAvatarBadge(pwd.portal, idx)}
                        <span>{pwd.portal}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-mono font-medium text-gray-800 dark:text-gray-200">
                      <div className="flex items-center gap-2">
                        <span>{pwd.userId}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(pwd.userId);
                            showToast("User ID copied to clipboard!");
                          }}
                          title="Copy User ID"
                          className="text-gray-400 hover:text-[#31719B] cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {isVisible ? pwd.password : "••••••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedPasswords((prev) => ({
                              ...prev,
                              [pwd.id || idx]: !prev[pwd.id || idx],
                            }))
                          }
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                        >
                          {isVisible ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(pwd.password || "");
                            showToast("Password copied to clipboard!");
                          }}
                          title="Copy Password"
                          className="text-gray-400 hover:text-[#31719B] cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                      {pwd.remarks || "—"}
                    </td>
                    <td className="px-2 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                      {canDelete("password") ? (
                        <button
                          type="button"
                          onClick={() => handleDeletePassword(pwd.id || "", pwd.portal)}
                          title="Delete Credential"
                          className="p-1 text-gray-400 hover:text-red-600 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
