"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { X, Search, Check, AlertCircle, Loader2, ChevronDown } from "lucide-react";
import { GroupRecord } from "@/services/groupApi";
import { clientApi } from "@/services/clientApi";
import { Client } from "@/data/crmData";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AddEditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    groupId?: string;
    clientIds: string[];
    pocClientId?: string;
    description?: string;
  }) => Promise<void>;
  group?: GroupRecord | null;
  allGroups?: GroupRecord[];
}

export const AddEditGroupModal: React.FC<AddEditGroupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  group,
  allGroups = [],
}) => {
  const isEdit = Boolean(group?.id);

  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Client picker dropdown & search
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load clients from DB
  const loadClients = useCallback(async (searchQuery?: string) => {
    setIsLoadingClients(true);
    try {
      const res = await clientApi.getClients({
        limit: 100,
        search: searchQuery?.trim() || undefined,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      if (res && Array.isArray(res.data)) {
        setClients((prev) => {
          if (!searchQuery?.trim()) return res.data;
          const newIds = new Set(res.data.map((c: any) => c.id || c._id?.toString()));
          const preserved = prev.filter(
            (c: any) =>
              selectedClientIds.includes(c.id || c._id?.toString()) &&
              !newIds.has(c.id || c._id?.toString())
          );
          return [...res.data, ...preserved];
        });
      }
    } catch (err: any) {
      console.error("Failed to load clients:", err);
    } finally {
      setIsLoadingClients(false);
    }
  }, [selectedClientIds]);

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen) {
      loadClients();
    }
  }, [isOpen, loadClients]);

  // Debounced search when typing
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (clientSearch.trim()) {
        loadClients(clientSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch, isOpen, loadClients]);

  // Prefill form
  useEffect(() => {
    if (group) {
      setName(group.name || "");
      setGroupId(group.groupId || "");
      setDescription(group.description || "");
      const cids = (group.clientIds || []).map((c: any) =>
        typeof c === "string" ? c : c.id || c._id?.toString()
      );
      setSelectedClientIds(cids.filter(Boolean));
    } else {
      setName("");
      setGroupId("");
      setDescription("");
      setSelectedClientIds([]);
    }
    setError(null);
  }, [group, isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };
    if (isClientDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isClientDropdownOpen]);

  if (!isOpen) return null;

  // Map to identify other group memberships
  const clientToOtherGroupMap = useMemo(() => {
    const map: Record<string, string> = {};
    allGroups.forEach((g) => {
      if (g.id === group?.id) return;
      (g.clientIds || []).forEach((c: any) => {
        const cid = typeof c === "string" ? c : c.id || c._id?.toString();
        if (cid) map[cid] = g.name;
      });
      (g.entities || []).forEach((e: any) => {
        const eid = e.id || e._id?.toString();
        if (eid) map[eid] = g.name;
      });
    });
    return map;
  }, [allGroups, group]);

  // Filtered clients in picker
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const term = clientSearch.toLowerCase();
    return clients.filter((c: any) => {
      const cName = c.name || c.clientName || c.businessName || "";
      const fileNo = c.fileNo || "";
      const pan = c.pan || "";
      return (
        cName.toLowerCase().includes(term) ||
        fileNo.toLowerCase().includes(term) ||
        pan.toLowerCase().includes(term)
      );
    });
  }, [clients, clientSearch]);

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const removeClientChip = (clientId: string) => {
    setSelectedClientIds((prev) => prev.filter((id) => id !== clientId));
  };

  const clearAllClients = () => {
    setSelectedClientIds([]);
  };

  const selectedClientEntities = clients.filter((c: any) => {
    const cid = c.id || c._id?.toString();
    return selectedClientIds.includes(cid);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Group Name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onSave({
        name: name.trim(),
        groupId: groupId.trim() || undefined,
        clientIds: selectedClientIds,
        description: description.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save group");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#1e293b] rounded-xl border border-[#dde2e8] dark:border-[#334155] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dde2e8] dark:border-[#334155] bg-gray-50/50 dark:bg-slate-800/50 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              {isEdit ? "Edit Group" : "Add Group"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Fill in the details below
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Group Name* */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Group Name <span className="text-red-500">*</span>
            </label>
            <Input
              inputSize="sm"
              placeholder="e.g. Yadav Enterprises, Reliance Group"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              required
            />
          </div>

          {/* Group Id */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Group ID <span className="text-gray-400 font-normal">(Optional, e.g. GRP-001)</span>
            </label>
            <Input
              inputSize="sm"
              placeholder="Leave empty to auto-assign"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Select Clients (Multi-Select with Chips) */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Select Clients
              </label>
              {selectedClientIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllClients}
                  className="text-[11px] text-[#31719B] hover:underline cursor-pointer"
                >
                  Clear all ({selectedClientIds.length})
                </button>
              )}
            </div>

            {/* Custom Multi-Select Input Field */}
            <div
              onClick={() => setIsClientDropdownOpen((prev) => !prev)}
              className="min-h-[42px] w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg shadow-2xs cursor-pointer flex flex-wrap items-center gap-1.5 hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
            >
              {selectedClientEntities.length === 0 ? (
                <span className="text-xs text-gray-400 py-1">
                  Click to select clients...
                </span>
              ) : (
                selectedClientEntities.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  >
                    <span>{c.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeClientChip(c.id);
                      }}
                      className="hover:text-purple-900 dark:hover:text-white p-0.5"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))
              )}
              <div className="ml-auto flex items-center pl-1 text-gray-400">
                <ChevronDown size={14} className={isClientDropdownOpen ? "rotate-180 transition-transform" : "transition-transform"} />
              </div>
            </div>

            {/* Helper Text */}
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Untick to remove a client from this Group, tick to add one.
            </p>

            {/* Dropdown Menu */}
            {isClientDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto p-2 space-y-1">
                {/* Search Bar inside dropdown */}
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by client name, file no., or PAN..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-[#d1d5db] dark:border-[#334155] rounded-md outline-hidden"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>

                {isLoadingClients ? (
                  <div className="p-4 text-center text-xs text-gray-500">
                    <Loader2 size={16} className="animate-spin mx-auto mb-1 text-[#31719B]" />
                    <span>Loading clients directory...</span>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500">
                    No matching clients found
                  </div>
                ) : (
                  filteredClients.map((client: any) => {
                    const cid = client.id || client._id?.toString();
                    const isSelected = selectedClientIds.includes(cid);
                    const otherGroup = clientToOtherGroupMap[cid];

                    return (
                      <div
                        key={cid}
                        onClick={() => toggleClientSelection(cid)}
                        className={`px-2.5 py-1.5 rounded-md text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                            : "hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-[#31719B] border-[#31719B] text-white"
                                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e293b]"
                            }`}
                          >
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                          <span className="font-semibold truncate">{client.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">({client.fileNo || "-"})</span>
                        </div>

                        {/* Warning if already belongs to another group */}
                        {otherGroup && !isSelected && (
                          <span className="text-[10px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded font-medium shrink-0 ml-2">
                            In: {otherGroup}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Add any internal remarks or family/group notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#1e293b] border border-[#d1d5db] dark:border-[#334155] rounded-lg shadow-2xs outline-hidden focus:border-[#31719B] transition-colors resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#dde2e8] dark:border-[#334155]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
            >
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
