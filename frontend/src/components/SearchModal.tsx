"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight } from "lucide-react";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_SEARCH_ITEMS = [
  // Header Items
  { title: "Notices", category: "Header", href: "/notices", description: "GST, Income Tax & TRACES Unified Portal" },
  { title: "Compliance", category: "Header", href: "/compliance", description: "Statutory filings & compliance tracker" },
  { title: "WhatsApp", category: "Header", href: "/whatsapp", description: "Automated client communication & messaging" },
  { title: "Email", category: "Header", href: "/email", description: "Email campaigns & transactional notices" },
  { title: "Agents", category: "Header", href: "/agents", description: "AI Agents for tax analysis & reconciliation" },
  { title: "Chat", category: "Header", href: "/chat", description: "Internal team & client live chat" },
  { title: "Sprints", category: "Header", href: "/sprints", description: "Agile sprints & monthly filing schedules" },
  { title: "Action-Center", category: "Header", href: "/action-center", description: "Urgent actions, approvals & alerts" },
  { title: "Calendar", category: "Header", href: "/calendar", description: "Filing due dates & meeting schedule" },
  { title: "To-Do", category: "Header", href: "/to-do", description: "Personal and delegated tasks checklist" },

  // Sidebar Items
  { title: "Home", category: "Sidebar", href: "/", description: "Practice dashboard & overview metrics" },
  { title: "Proposal", category: "Sidebar", href: "/proposal", description: "Client engagement letters & proposals" },
  { title: "Leads", category: "Sidebar", href: "/leads", description: "Prospective business leads & pipeline" },
  { title: "Client", category: "Sidebar", href: "/client", description: "Master client directory & KYC records" },
  { title: "Groups", category: "Sidebar", href: "/groups", description: "Client groups & family entities" },
  { title: "Services", category: "Sidebar", href: "/services", description: "Service catalog & rate configurations" },
  { title: "Task", category: "Sidebar", href: "/task", description: "Work assignments, deadlines & timesheets" },
  { title: "Invoice", category: "Sidebar", href: "/invoice", description: "Billing, fee receipts & payment status" },
  { title: "Team", category: "Sidebar", href: "/team", description: "Staff roles, permissions & performance" },
  { title: "Reports", category: "Sidebar", href: "/reports", description: "MIS reports & practice revenue insights" },
  { title: "Drive", category: "Sidebar", href: "/drive", description: "Cloud documents, storage & client vaults" },
  { title: "Registry", category: "Sidebar", href: "/registry", description: "Digital signatures, ROC & entity registers" },
];

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open if closed
          const btn = document.getElementById("global-search-btn");
          btn?.click();
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = ALL_SEARCH_ITEMS.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (href: string) => {
    router.push(href);
    onClose();
    setQuery("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          className="flex items-center px-4 py-3 gap-2.5 border-b"
          style={{ borderColor: "var(--border-main)" }}
        >
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            id="global-search-input"
            name="globalSearchQuery"
            aria-label="Search pages, tools, or press Escape to close"
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, tools, or press Esc to close..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            style={{ color: "var(--text-main)" }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-1.5 py-0.5 rounded cursor-pointer"
              title="Clear search input"
            >
              Clear
            </button>
          )}
          <kbd
            className="px-2 py-0.5 text-[10px] font-semibold text-gray-500 rounded border select-none shrink-0"
            style={{
              backgroundColor: "var(--bg-subtle)",
              borderColor: "var(--border-main)",
            }}
          >
            ESC
          </kbd>

          {/* Cross Icon to Cancel / Close Modal */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
            title="Cancel and close modal"
            aria-label="Cancel and close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No matching pages found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.href}
                onClick={() => handleSelect(item.href)}
                className="w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between group transition-colors hover:bg-[var(--primary-light)]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-semibold group-hover:text-[var(--primary)] transition-colors"
                      style={{ color: "var(--text-main)" }}
                    >
                      {item.title}
                    </span>
                    <span
                      className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: "var(--bg-subtle)",
                        color: "var(--text-subtle)",
                      }}
                    >
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                    {item.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-[var(--primary)] transition-all shrink-0" />
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div
          className="px-4 py-2 text-[11px] text-gray-400 border-t flex justify-between items-center"
          style={{
            backgroundColor: "var(--bg-muted)",
            borderColor: "var(--border-main)",
          }}
        >
          <span>Use ⮑ to navigate</span>
          <span>Practice Management Suite</span>
        </div>
      </div>
    </div>
  );
};
