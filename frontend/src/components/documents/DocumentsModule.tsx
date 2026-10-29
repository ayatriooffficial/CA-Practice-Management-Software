"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { stageAndRedirectToPdfSigner } from "@/services/stageToPdfSigner";
import {
  PenTool,
  Loader2,
  Files,
  Search,
  User,
  Users,
  Building,
  Mail,
  Phone,
  FileText,
  FileSpreadsheet,
  FileImage,
  Folder,
  ArrowLeft,
  UploadCloud,
  Download,
  Eye,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Tag,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  HardDrive,
  AlertCircle,
  Briefcase,
  IdCard,
  CreditCard,
  Layers,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  Check,
} from "lucide-react";
import {
  documentApi,
  PersonItem,
  PersonDetail,
  AssociatedDocument,
  DocumentRequirementItem,
  DocumentStatus,
} from "@/services/documentApi";
import { DocumentCategory, CATEGORY_MAP } from "@/services/driveApi";

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

type FilterType = "all" | "client" | "team";
type StatusFilterType = "all" | "Available" | "Pending" | "Requested" | "Expired";

export const DocumentsModule: React.FC = () => {
  // Master-Detail State
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedPersonDetail, setSelectedPersonDetail] = useState<PersonDetail | null>(null);

  // Search & Filtering State (Master View)
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Detail View Filters
  const [documentCategoryFilter, setDocumentCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");
  const [detailSearchQuery, setDetailSearchQuery] = useState("");

  // Loading & Error States
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detailErrorMsg, setDetailErrorMsg] = useState<string | null>(null);

  // Modals State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>(DocumentCategory.GENERAL);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedRequirementForUpload, setSelectedRequirementForUpload] = useState<DocumentRequirementItem | null>(null);
  const router = useRouter();
  const [stagingDocId, setStagingDocId] = useState<string | null>(null);

  const handleSignDocWithDsc = async (doc: any) => {
    const docId = (doc as any).driveFileId || doc.id || (doc as any)._id || doc.fileName;
    setStagingDocId(docId);
    try {
      await stageAndRedirectToPdfSigner(router, {
        driveDocumentId: (doc as any).driveFileId,
        fileUrl: doc.downloadUrl || doc.previewUrl,
        fileName: doc.fileName || doc.title || "document.pdf",
        clientId: (selectedPersonDetail?.person as any)?.fileNo || (selectedPersonDetail?.person as any)?.identifier,
        clientName: selectedPersonDetail?.person?.name,
      });
    } catch (err: any) {
      alert(err?.message || "Failed to prepare document for DSC signing");
    } finally {
      setStagingDocId(null);
    }
  };
  const [previewDoc, setPreviewDoc] = useState<{
    fileName: string;
    category: string;
    size: number;
    mimeType?: string;
    downloadUrl?: string;
    previewUrl?: string;
    description?: string;
    storageProvider?: string;
    uploadedBy?: string;
  } | null>(null);

  // Active Tab inside Person Detail (requirements | profile)
  const [activeDetailTab, setActiveDetailTab] = useState<"requirements" | "profile">("requirements");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load people list
  const loadPeople = useCallback(async () => {
    setIsLoadingPeople(true);
    setErrorMsg(null);
    try {
      const res = await documentApi.searchPeople({
        search: debouncedQuery,
        type: activeFilter,
        page: 1,
        limit: 50,
      });
      if (res && res.data) {
        setPeople(res.data);
      } else {
        setPeople([]);
      }
    } catch (err: any) {
      console.error("Failed to load people directory:", err);
      setErrorMsg(err.message || "Unable to reach database service. Please verify backend connection.");
    } finally {
      setIsLoadingPeople(false);
    }
  }, [debouncedQuery, activeFilter]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  // Load individual person details when selected
  const handleSelectPerson = async (personId: string) => {
    setSelectedPersonId(personId);
    setIsLoadingDetail(true);
    setDetailErrorMsg(null);
    setDocumentCategoryFilter("all");
    setStatusFilter("all");
    setDetailSearchQuery("");
    setActiveDetailTab("requirements");

    try {
      const res = await documentApi.getPersonDetails(personId);
      if (res && res.data) {
        setSelectedPersonDetail(res.data);
      } else {
        setDetailErrorMsg("Person details not found in database.");
      }
    } catch (err: any) {
      console.error("Failed to load person details:", err);
      setDetailErrorMsg(err.message || "Failed to load person record details.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleBackToDirectory = () => {
    setSelectedPersonId(null);
    setSelectedPersonDetail(null);
    setDetailErrorMsg(null);
  };

  // Open Upload Modal prefilled for a specific pending/requested requirement
  const handleOpenUploadForRequirement = (req: DocumentRequirementItem) => {
    setSelectedRequirementForUpload(req);
    setUploadCategory((req.category as DocumentCategory) || DocumentCategory.GENERAL);
    setUploadDescription(req.description || req.title);
    setUploadFile(null);
    setIsUploadModalOpen(true);
  };

  // General Upload button click (not for a specific row)
  const handleOpenGeneralUpload = () => {
    setSelectedRequirementForUpload(null);
    setUploadCategory(DocumentCategory.GENERAL);
    setUploadDescription("");
    setUploadFile(null);
    setIsUploadModalOpen(true);
  };

  // Upload document handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedPersonId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("category", uploadCategory);
      if (uploadDescription.trim()) {
        formData.append("description", uploadDescription.trim());
      }
      if (selectedRequirementForUpload) {
        formData.append("requirementId", selectedRequirementForUpload.id);
        if (selectedRequirementForUpload.taskDocId) {
          formData.append("taskDocId", selectedRequirementForUpload.taskDocId);
        }
        if (selectedRequirementForUpload.taskId) {
          formData.append("taskId", selectedRequirementForUpload.taskId);
        }
      }

      await documentApi.uploadPersonDocument(selectedPersonId, formData);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadDescription("");
      setSelectedRequirementForUpload(null);

      // Refresh person detail to show updated requirements & document status
      await handleSelectPerson(selectedPersonId);
      // Also refresh master list to update document counts
      await loadPeople();
    } catch (err: any) {
      alert(err.message || "Upload failed. Please check file format and size.");
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered requirements list for selected person
  const filteredRequirements = useMemo(() => {
    if (!selectedPersonDetail?.requirements) return [];
    let list = selectedPersonDetail.requirements;

    // Filter by Status (all, Available, Pending, Requested, Expired)
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }

    // Filter by Category
    if (documentCategoryFilter !== "all") {
      list = list.filter((r) => r.category === documentCategoryFilter);
    }

    // Filter by detail table search query
    if (detailSearchQuery.trim()) {
      const q = detailSearchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.relatedProcess.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          (r.fileName && r.fileName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [selectedPersonDetail, statusFilter, documentCategoryFilter, detailSearchQuery]);

  // Helper to get file/status icon
  const getRequirementIcon = (status: DocumentStatus, mimeType?: string, fileName?: string) => {
    if (status === "Available") {
      const ext = fileName?.split(".").pop()?.toLowerCase();
      if (mimeType?.includes("sheet") || ext === "xlsx" || ext === "xls" || ext === "csv") {
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
      }
      if (mimeType?.includes("image") || ext === "png" || ext === "jpg") {
        return <FileImage className="w-5 h-5 text-blue-500 shrink-0" />;
      }
      return <FileText className="w-5 h-5 text-emerald-600 shrink-0" />;
    }
    if (status === "Pending") {
      return <Clock className="w-5 h-5 text-amber-500 shrink-0" />;
    }
    if (status === "Requested") {
      return <ArrowUpRight className="w-5 h-5 text-blue-500 shrink-0" />;
    }
    if (status === "Expired") {
      return <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />;
    }
    return <AlertCircle className="w-5 h-5 text-gray-400 shrink-0" />;
  };

  // Helper for Status Badge styling
  const renderStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case "Available":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
            <Check className="w-3 h-3 stroke-[3]" />
            <span>Available</span>
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
      case "Requested":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            <ArrowUpRight className="w-3 h-3" />
            <span>Requested</span>
          </span>
        );
      case "Expired":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
            <AlertTriangle className="w-3 h-3" />
            <span>Expired</span>
          </span>
        );
      case "Under Review":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Under Review</span>
          </span>
        );
      case "Needs Configuration":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700">
            <AlertCircle className="w-3 h-3" />
            <span>Needs Config</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700">
            {status}
          </span>
        );
    }
  };

  // Helper for avatar colors based on name
  const getAvatarBg = (name: string) => {
    const colors = [
      "bg-blue-600 text-white",
      "bg-emerald-600 text-white",
      "bg-purple-600 text-white",
      "bg-amber-600 text-white",
      "bg-teal-600 text-white",
      "bg-indigo-600 text-white",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  };

  // Helper to compute initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Top Banner & Title */}
      <div
        className="rounded-xl border p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
            style={{
              backgroundColor: "var(--primary-light)",
              color: "var(--primary)",
            }}
          >
            <Files className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: "var(--text-main)" }}>
                Document Center
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                Database Connected
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Comprehensive per-user document tracking, statutory compliance records, and missing document flags.
            </p>
          </div>
        </div>

        {/* Global Action controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadPeople}
            disabled={isLoadingPeople}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50"
            style={{
              borderColor: "var(--border-main)",
              color: "var(--text-main)",
              backgroundColor: "var(--bg-surface)",
            }}
            title="Refresh directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPeople ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: MASTER DIRECTORY (When no person selected) */}
      {!selectedPersonId && (
        <div className="space-y-4">
          {/* Search Bar & Filter Tabs Row */}
          <div
            className="rounded-xl border p-4 transition-colors flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-main)",
            }}
          >
            {/* Search Input Field */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search person by name, file number, PAN, mobile, or email..."
                className="w-full pl-10 pr-9 py-2 rounded-lg text-xs sm:text-sm border transition-colors outline-hidden focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  borderColor: "var(--border-main)",
                  color: "var(--text-main)",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === "all"
                    ? "bg-[var(--primary)] text-white shadow-xs"
                    : "border hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                }`}
                style={activeFilter !== "all" ? { borderColor: "var(--border-main)" } : undefined}
              >
                All People
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("client")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === "client"
                    ? "bg-[var(--primary)] text-white shadow-xs"
                    : "border hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                }`}
                style={activeFilter !== "client" ? { borderColor: "var(--border-main)" } : undefined}
              >
                Clients
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("team")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === "team"
                    ? "bg-[var(--primary)] text-white shadow-xs"
                    : "border hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                }`}
                style={activeFilter !== "team" ? { borderColor: "var(--border-main)" } : undefined}
              >
                Team & Staff
              </button>
            </div>
          </div>

          {/* Error Message if API fails */}
          {errorMsg && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 flex items-center gap-3 text-red-700 dark:text-red-300 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="flex-1 font-medium">{errorMsg}</div>
              <button
                type="button"
                onClick={loadPeople}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold text-xs transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoadingPeople && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border p-4 animate-pulse space-y-3"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-main)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4" />
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-md w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-md w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State: No search results found */}
          {!isLoadingPeople && !errorMsg && people.length === 0 && (
            <div
              className="rounded-xl border p-12 text-center flex flex-col items-center justify-center space-y-3"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
              }}
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold" style={{ color: "var(--text-main)" }}>
                {searchQuery ? `No matching people found for "${searchQuery}"` : "No people records available"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm">
                {searchQuery
                  ? "Try checking for typos or searching by PAN, file number, phone number, or entity name."
                  : "No client or staff records match your current criteria."}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity mt-2 cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* People Grid View */}
          {!isLoadingPeople && !errorMsg && people.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-1">
                Showing {people.length} {people.length === 1 ? "record" : "records"}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {people.map((p) => {
                  const isClient = p.entityType === "client";
                  const availableCount = p.availableCount ?? p.documentCount;
                  const pendingCount = p.pendingCount ?? 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPerson(p.id)}
                      className="group rounded-xl border p-4 transition-all hover:shadow-md hover:border-[var(--primary)] cursor-pointer flex flex-col justify-between"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        borderColor: "var(--border-main)",
                      }}
                    >
                      <div>
                        {/* Header: Avatar, Name, Entity Badge */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${getAvatarBg(
                                p.name
                              )}`}
                            >
                              {getInitials(p.name)}
                            </div>
                            <div className="min-w-0">
                              <h3
                                className="text-sm font-bold truncate group-hover:text-[var(--primary)] transition-colors"
                                style={{ color: "var(--text-main)" }}
                                title={p.name}
                              >
                                {p.name}
                              </h3>
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                <span className="font-mono font-semibold">{p.identifier}</span>
                                {p.pan && <span>• PAN: {p.pan}</span>}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                              isClient
                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                            }`}
                          >
                            {isClient ? "Client" : "Staff"}
                          </span>
                        </div>

                        {/* Middle Attributes: Contact details */}
                        <div
                          className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 border-t pt-2.5"
                          style={{ borderColor: "var(--border-main)" }}
                        >
                          {p.email && (
                            <div className="flex items-center gap-2 truncate">
                              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">{p.email}</span>
                            </div>
                          )}
                          {p.mobile && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{p.mobile}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 truncate">
                            <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">
                              {p.group || p.department || p.type || "General Practice"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Requirements Count & Action Arrow */}
                      <div
                        className="mt-4 pt-2.5 border-t flex items-center justify-between text-xs font-semibold gap-2"
                        style={{ borderColor: "var(--border-main)" }}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>{availableCount} Available</span>
                          </span>

                          {pendingCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3" />
                              <span>{pendingCount} Pending</span>
                            </span>
                          )}
                        </div>

                        <span className="flex items-center text-[var(--primary)] text-xs group-hover:translate-x-1 transition-transform shrink-0">
                          <span>View Details</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SELECTED PERSON DETAILS & CONSOLIDATED TRACKING */}
      {selectedPersonId && (
        <div className="space-y-4">
          {/* Back button & Breadcrumb bar */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackToDirectory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to People Directory</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPerson(selectedPersonId)}
              disabled={isLoadingDetail}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
                color: "var(--text-main)",
              }}
              title="Refresh person details"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDetail ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Detail Loading State */}
          {isLoadingDetail && (
            <div
              className="rounded-xl border p-12 text-center flex flex-col items-center justify-center space-y-3"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-main)",
              }}
            >
              <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              <div className="text-xs font-semibold text-gray-500">
                Loading synthesized document requirements from database...
              </div>
            </div>
          )}

          {/* Detail Error State */}
          {detailErrorMsg && !isLoadingDetail && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-5 flex items-center justify-between text-red-700 dark:text-red-300">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{detailErrorMsg}</span>
              </div>
              <button
                type="button"
                onClick={handleBackToDirectory}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold text-xs transition-colors cursor-pointer"
              >
                Go Back
              </button>
            </div>
          )}

          {/* Person Loaded Content */}
          {!isLoadingDetail && !detailErrorMsg && selectedPersonDetail && (
            <div className="space-y-4">
              {/* Profile Card Header */}
              <div
                className="rounded-xl border p-5 transition-colors"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-main)",
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 shadow-md ${getAvatarBg(
                        selectedPersonDetail.person.name
                      )}`}
                    >
                      {getInitials(selectedPersonDetail.person.name)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight" style={{ color: "var(--text-main)" }}>
                          {selectedPersonDetail.person.name}
                        </h2>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                            selectedPersonDetail.person.entityType === "client"
                              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                              : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                          }`}
                        >
                          {selectedPersonDetail.person.entityType === "client" ? "Client Record" : "Staff Member"}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {selectedPersonDetail.person.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
                        <span className="font-mono">ID: {selectedPersonDetail.person.identifier}</span>
                        {selectedPersonDetail.person.pan && (
                          <span>
                            • PAN: <strong className="text-gray-700 dark:text-gray-200">{selectedPersonDetail.person.pan}</strong>
                          </span>
                        )}
                        <span>• Type: {selectedPersonDetail.person.type}</span>
                        {selectedPersonDetail.person.group && (
                          <span>• Group: {selectedPersonDetail.person.group}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Action: Upload Document */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleOpenGeneralUpload}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload Document</span>
                    </button>
                  </div>
                </div>

                {/* Requirements Summary Statistics Bar */}
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4 pt-4 border-t text-xs"
                  style={{ borderColor: "var(--border-main)" }}
                >
                  <div className="p-2.5 rounded-lg border bg-gray-50/50 dark:bg-gray-800/20" style={{ borderColor: "var(--border-main)" }}>
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Total Requirements</div>
                    <div className="text-base font-bold mt-0.5" style={{ color: "var(--text-main)" }}>
                      {selectedPersonDetail.summary?.total || selectedPersonDetail.requirements.length} Items
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20">
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Available on File</div>
                    <div className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {selectedPersonDetail.summary?.available || 0} Verified
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold">Pending Upload</div>
                    <div className="text-base font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                      {selectedPersonDetail.summary?.pending || 0} Required
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20">
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-semibold">Task Requested</div>
                    <div className="text-base font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                      {selectedPersonDetail.summary?.requested || 0} Waiting
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20">
                    <div className="text-[10px] text-red-600 dark:text-red-400 uppercase font-semibold">Expired Licenses / DSC</div>
                    <div className="text-base font-bold text-red-700 dark:text-red-300 mt-0.5">
                      {selectedPersonDetail.summary?.expired || 0} Expired
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs Header */}
              <div
                className="flex items-center gap-2 border-b transition-colors"
                style={{ borderColor: "var(--border-main)" }}
              >
                <button
                  type="button"
                  onClick={() => setActiveDetailTab("requirements")}
                  className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                    activeDetailTab === "requirements"
                      ? "border-[var(--primary)] text-[var(--primary)]"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <Files className="w-4 h-4" />
                  <span>
                    Consolidated Document Repository ({selectedPersonDetail.summary?.total || selectedPersonDetail.requirements.length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDetailTab("profile")}
                  className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                    activeDetailTab === "profile"
                      ? "border-[var(--primary)] text-[var(--primary)]"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <IdCard className="w-4 h-4" />
                  <span>Profile & Statutory Registrations</span>
                </button>
              </div>

              {/* TAB 1: CONSOLIDATED DOCUMENT TRACKING TABLE */}
              {activeDetailTab === "requirements" && (
                <div className="space-y-3">
                  {/* Filter Toolbar: Status filter tabs, Category filters, and Search */}
                  <div
                    className="rounded-xl border p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-main)",
                    }}
                  >
                    {/* Status Filter Buttons */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                      <span className="text-xs font-semibold text-gray-400 mr-1 flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5" /> Status:
                      </span>

                      <button
                        type="button"
                        onClick={() => setStatusFilter("all")}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          statusFilter === "all"
                            ? "bg-[var(--primary)] text-white shadow-xs"
                            : "border bg-[var(--bg-surface)] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                        style={statusFilter !== "all" ? { borderColor: "var(--border-main)" } : undefined}
                      >
                        All ({selectedPersonDetail.summary?.total || selectedPersonDetail.requirements.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setStatusFilter("Pending")}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                          statusFilter === "Pending"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>Pending ({selectedPersonDetail.summary?.pending || 0})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStatusFilter("Available")}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                          statusFilter === "Available"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Available ({selectedPersonDetail.summary?.available || 0})</span>
                      </button>

                      {(selectedPersonDetail.summary?.requested || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setStatusFilter("Requested")}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                            statusFilter === "Requested"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                          }`}
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Requested ({selectedPersonDetail.summary?.requested || 0})</span>
                        </button>
                      )}

                      {(selectedPersonDetail.summary?.expired || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setStatusFilter("Expired")}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                            statusFilter === "Expired"
                              ? "bg-red-600 text-white shadow-xs"
                              : "border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40"
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Expired ({selectedPersonDetail.summary?.expired || 0})</span>
                        </button>
                      )}
                    </div>

                    {/* Quick filter by requirement name */}
                    <div className="relative min-w-[200px]">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={detailSearchQuery}
                        onChange={(e) => setDetailSearchQuery(e.target.value)}
                        placeholder="Search requirements..."
                        className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs border outline-hidden"
                        style={{
                          backgroundColor: "var(--bg-subtle)",
                          borderColor: "var(--border-main)",
                          color: "var(--text-main)",
                        }}
                      />
                      {detailSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setDetailSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <span className="font-semibold text-gray-400 mr-1 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" /> Category:
                    </span>
                    <button
                      type="button"
                      onClick={() => setDocumentCategoryFilter("all")}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        documentCategoryFilter === "all"
                          ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
                          : "border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      style={documentCategoryFilter !== "all" ? { borderColor: "var(--border-main)" } : undefined}
                    >
                      All Categories
                    </button>
                    {Object.values(DocumentCategory).map((cat) => {
                      const count = selectedPersonDetail.requirements.filter((r) => r.category === cat).length;
                      if (count === 0) return null;
                      const catInfo = CATEGORY_MAP[cat];
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setDocumentCategoryFilter(cat)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                            documentCategoryFilter === cat
                              ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
                              : "border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                          style={documentCategoryFilter !== cat ? { borderColor: "var(--border-main)" } : undefined}
                        >
                          {catInfo?.label || cat} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Empty State for filtered requirements */}
                  {filteredRequirements.length === 0 && (
                    <div
                      className="rounded-xl border p-10 text-center flex flex-col items-center justify-center space-y-3"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        borderColor: "var(--border-main)",
                      }}
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                        <Folder className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold" style={{ color: "var(--text-main)" }}>
                        No documents match the current filter criteria
                      </h3>
                      <p className="text-xs text-gray-500 max-w-sm">
                        {statusFilter !== "all"
                          ? `There are no documents currently marked as ${statusFilter}.`
                          : "Try resetting your search query or category filter."}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("all");
                          setDocumentCategoryFilter("all");
                          setDetailSearchQuery("");
                        }}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity mt-2 cursor-pointer shadow-xs"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  )}

                  {/* Consolidated Tracking Table */}
                  {filteredRequirements.length > 0 && (
                    <div
                      className="rounded-xl border overflow-hidden transition-colors"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        borderColor: "var(--border-main)",
                      }}
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead
                            className="border-b uppercase text-[10px] tracking-wider text-gray-500 dark:text-gray-400"
                            style={{
                              backgroundColor: "var(--bg-subtle)",
                              borderColor: "var(--border-main)",
                            }}
                          >
                            <tr>
                              <th className="py-3 px-4 font-bold">Document / Requirement Name</th>
                              <th className="py-3 px-3 font-bold">Category</th>
                              <th className="py-3 px-3 font-bold">Related Process / Workflow</th>
                              <th className="py-3 px-3 font-bold">Period / FY</th>
                              <th className="py-3 px-3 font-bold">Status</th>
                              <th className="py-3 px-3 font-bold">File Information</th>
                              <th className="py-3 px-4 font-bold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: "var(--border-main)" }}>
                            {filteredRequirements.map((req) => {
                              const catInfo = CATEGORY_MAP[req.category as DocumentCategory];
                              const isAvailable = req.status === "Available";
                              const isPending = req.status === "Pending";
                              const isRequested = req.status === "Requested";
                              const isExpired = req.status === "Expired";

                              return (
                                <tr
                                  key={req.id}
                                  className={`transition-colors ${
                                    isPending
                                      ? "bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40 dark:hover:bg-amber-950/20"
                                      : isRequested
                                      ? "bg-blue-50/20 dark:bg-blue-950/10 hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                                      : isExpired
                                      ? "bg-red-50/20 dark:bg-red-950/10 hover:bg-red-50/40 dark:hover:bg-red-950/20"
                                      : "hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                                  }`}
                                >
                                  {/* Document Name & Context */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-start gap-2.5">
                                      {getRequirementIcon(req.status, req.mimeType, req.fileName)}
                                      <div className="min-w-0">
                                        <div
                                          className={`font-bold max-w-xs sm:max-w-sm ${
                                            isAvailable
                                              ? "cursor-pointer hover:underline hover:text-[var(--primary)]"
                                              : ""
                                          }`}
                                          style={{ color: "var(--text-main)" }}
                                          onClick={() => {
                                            if (isAvailable && req.downloadUrl) {
                                              setPreviewDoc({
                                                fileName: req.fileName || req.title,
                                                category: req.category,
                                                size: req.fileSize || 0,
                                                mimeType: req.mimeType,
                                                downloadUrl: req.downloadUrl,
                                                previewUrl: req.previewUrl,
                                                description: req.description,
                                                storageProvider: req.storageProvider,
                                                uploadedBy: req.uploadedBy,
                                              });
                                            }
                                          }}
                                        >
                                          {req.title}
                                        </div>
                                        {req.description && (
                                          <div className="text-[11px] text-gray-500 line-clamp-1 max-w-xs sm:max-w-sm mt-0.5">
                                            {req.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Category Badge */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                        catInfo?.badgeBg || "bg-gray-100"
                                      } ${catInfo?.badgeText || "text-gray-700"}`}
                                    >
                                      {catInfo?.label || req.category}
                                    </span>
                                  </td>

                                  {/* Related Process / Workflow */}
                                  <td className="py-3 px-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                    <div className="truncate max-w-[200px]" title={req.relatedProcess}>
                                      {req.relatedProcess}
                                    </div>
                                  </td>

                                  {/* Period / FY */}
                                  <td className="py-3 px-3 whitespace-nowrap text-gray-500 font-medium">
                                    {req.period || "Permanent"}
                                  </td>

                                  {/* Status Badge */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    {renderStatusBadge(req.status)}
                                  </td>

                                  {/* File Information */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    {isAvailable ? (
                                      <div className="space-y-0.5">
                                        <div className="font-mono text-[11px] text-gray-600 dark:text-gray-300">
                                          {req.fileSize ? formatBytes(req.fileSize) : "Verified"}
                                        </div>
                                        <div className="text-[10px] text-gray-400 truncate max-w-[140px]">
                                          {req.uploadedBy || "Practice Staff"}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 text-gray-400 text-[11px] italic">
                                        {isExpired ? (
                                          <span className="text-red-500">Validity Expired</span>
                                        ) : (
                                          <span>Awaiting Upload</span>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3 px-4 text-right whitespace-nowrap">
                                    {isAvailable ? (
                                      <div className="inline-flex items-center gap-1.5">
                                        {req.downloadUrl && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setPreviewDoc({
                                                fileName: req.fileName || req.title,
                                                category: req.category,
                                                size: req.fileSize || 0,
                                                mimeType: req.mimeType,
                                                downloadUrl: req.downloadUrl,
                                                previewUrl: req.previewUrl,
                                                description: req.description,
                                                storageProvider: req.storageProvider,
                                                uploadedBy: req.uploadedBy,
                                              })
                                            }
                                            className="p-1.5 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                                            title="Preview document"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </button>
                                        )}

                                        {(req.mimeType?.includes("pdf") || (req.fileName || req.title)?.toLowerCase().endsWith(".pdf")) && (
                                          <button
                                            type="button"
                                            onClick={() => handleSignDocWithDsc(req)}
                                            disabled={stagingDocId === ((req as any).driveFileId || req.id || (req as any)._id || req.fileName)}
                                            className="p-1.5 rounded-lg border hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[#31719B] transition-colors cursor-pointer"
                                            title="Sign with DSC (PAdES)"
                                          >
                                            {stagingDocId === ((req as any).driveFileId || req.id || (req as any)._id || req.fileName) ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#31719B]" />
                                            ) : (
                                              <PenTool className="w-3.5 h-3.5 text-[#31719B]" />
                                            )}
                                          </button>
                                        )}

                                        <a
                                          href={req.downloadUrl || "#"}
                                          download={req.fileName || `${req.title}.pdf`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1.5 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--primary)] transition-colors cursor-pointer"
                                          title="Download document"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </a>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenUploadForRequirement(req)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity shadow-2xs cursor-pointer"
                                        title={`Upload ${req.title}`}
                                      >
                                        <UploadCloud className="w-3.5 h-3.5" />
                                        <span>{isExpired ? "Upload Renewal" : "Upload"}</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PROFILE & STATUTORY REGISTRATIONS */}
              {activeDetailTab === "profile" && (
                <div className="space-y-4">
                  {/* Client Specific Profile: Statutory Files, Licenses, DSCs */}
                  {selectedPersonDetail.person.entityType === "client" && (
                    <div className="space-y-4">
                      {/* Statutory Registrations Section */}
                      <div
                        className="rounded-xl border p-4 transition-colors"
                        style={{
                          backgroundColor: "var(--bg-surface)",
                          borderColor: "var(--border-main)",
                        }}
                      >
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Statutory Tax & Compliance IDs</span>
                        </h3>

                        {!selectedPersonDetail.person.statutory || selectedPersonDetail.person.statutory.length === 0 ? (
                          <div className="text-xs text-gray-400 italic">No statutory registrations on file.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {selectedPersonDetail.person.statutory.map((stat, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-lg border text-xs flex flex-col justify-between"
                                style={{
                                  backgroundColor: "var(--bg-subtle)",
                                  borderColor: "var(--border-main)",
                                }}
                              >
                                <div>
                                  <div className="font-bold text-[11px] text-gray-500 uppercase">{stat.type}</div>
                                  <div className="font-mono font-bold text-sm mt-0.5" style={{ color: "var(--text-main)" }}>
                                    {stat.idNo}
                                  </div>
                                  {stat.userId && (
                                    <div className="text-[11px] text-gray-400 mt-1">User ID: {stat.userId}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Practice Licenses Section */}
                      <div
                        className="rounded-xl border p-4 transition-colors"
                        style={{
                          backgroundColor: "var(--bg-surface)",
                          borderColor: "var(--border-main)",
                        }}
                      >
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          <span>Licenses & Regulatory Approvals</span>
                        </h3>

                        {!selectedPersonDetail.person.licenses || selectedPersonDetail.person.licenses.length === 0 ? (
                          <div className="text-xs text-gray-400 italic">No license records attached.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {selectedPersonDetail.person.licenses.map((lic, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-lg border text-xs space-y-1.5"
                                style={{
                                  backgroundColor: "var(--bg-subtle)",
                                  borderColor: "var(--border-main)",
                                }}
                              >
                                <div className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                                  {lic.name}
                                </div>
                                <div className="text-gray-500 font-mono text-[11px]">No: {lic.licenseNo || "N/A"}</div>
                                <div className="text-gray-400 text-[10px]">Expiry: {lic.expiryDate || "—"}</div>
                                {lic.remarks && lic.remarks !== "-" && (
                                  <div className="text-[10px] text-gray-500 italic">{lic.remarks}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Digital Signature Certificates (DSC) */}
                      <div
                        className="rounded-xl border p-4 transition-colors"
                        style={{
                          backgroundColor: "var(--bg-surface)",
                          borderColor: "var(--border-main)",
                        }}
                      >
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <span>Digital Signature Certificates (DSC)</span>
                        </h3>

                        {!selectedPersonDetail.person.dscs || selectedPersonDetail.person.dscs.length === 0 ? (
                          <div className="text-xs text-gray-400 italic">No active DSC tokens recorded.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {selectedPersonDetail.person.dscs.map((dsc, idx) => {
                              const isExp = dsc.status === "Expired";
                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                                    isExp ? "border-red-200 bg-red-50/20" : ""
                                  }`}
                                  style={{
                                    backgroundColor: isExp ? undefined : "var(--bg-subtle)",
                                    borderColor: isExp ? undefined : "var(--border-main)",
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                                      {dsc.name}
                                    </div>
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        isExp ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                                      }`}
                                    >
                                      {dsc.status || "Active"}
                                    </span>
                                  </div>
                                  <div className="text-gray-500 font-mono text-[11px]">
                                    {dsc.vendor || "Authority"} • {dsc.class || "Class 3"}
                                  </div>
                                  <div className="text-gray-400 text-[10px]">Expiry: {dsc.expiryDate || "—"}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Staff Specific Profile Details */}
                  {selectedPersonDetail.person.entityType === "team" && (
                    <div
                      className="rounded-xl border p-4 space-y-4"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        borderColor: "var(--border-main)",
                      }}
                    >
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-[var(--primary)]" />
                        <span>Practice Role & Assignment Details</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border-main)", backgroundColor: "var(--bg-subtle)" }}>
                          <div className="text-gray-400 text-[10px] uppercase font-semibold">Department</div>
                          <div className="font-bold mt-1" style={{ color: "var(--text-main)" }}>
                            {selectedPersonDetail.person.department || "General Practice"}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border-main)", backgroundColor: "var(--bg-subtle)" }}>
                          <div className="text-gray-400 text-[10px] uppercase font-semibold">Designation</div>
                          <div className="font-bold mt-1" style={{ color: "var(--text-main)" }}>
                            {selectedPersonDetail.person.designation || selectedPersonDetail.person.role || "Staff Member"}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border-main)", backgroundColor: "var(--bg-subtle)" }}>
                          <div className="text-gray-400 text-[10px] uppercase font-semibold">Firm Legal Entity</div>
                          <div className="font-bold mt-1" style={{ color: "var(--text-main)" }}>
                            {selectedPersonDetail.person.firmName || "Ayatrio CA Practice"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: UPLOAD DOCUMENT / FULFILL REQUIREMENT MODAL */}
      {isUploadModalOpen && selectedPersonDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-main)",
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-main)" }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: "var(--text-main)" }}>
                  {selectedRequirementForUpload ? `Upload: ${selectedRequirementForUpload.title}` : "Upload Document"}
                </h3>
                <p className="text-xs text-gray-500">
                  Linking file to {selectedPersonDetail.person.name} ({selectedPersonDetail.person.identifier})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedRequirementForUpload && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 text-xs space-y-1">
                <div className="font-bold text-amber-800">Fulfilling Requirement:</div>
                <div className="text-amber-700 font-medium">{selectedRequirementForUpload.title}</div>
                <div className="text-[11px] text-amber-600">
                  Related Process: {selectedRequirementForUpload.relatedProcess} • Status will update to <strong>Available</strong>
                </div>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* File Select */}
              <div>
                <label className="block font-bold mb-1" style={{ color: "var(--text-main)" }}>
                  Select File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded-lg text-xs outline-hidden cursor-pointer"
                  style={{
                    backgroundColor: "var(--bg-subtle)",
                    borderColor: "var(--border-main)",
                    color: "var(--text-main)",
                  }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block font-bold mb-1" style={{ color: "var(--text-main)" }}>
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                  className="w-full p-2.5 border rounded-lg text-xs outline-hidden cursor-pointer"
                  style={{
                    backgroundColor: "var(--bg-subtle)",
                    borderColor: "var(--border-main)",
                    color: "var(--text-main)",
                  }}
                >
                  {Object.values(DocumentCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_MAP[cat]?.label || cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold mb-1" style={{ color: "var(--text-main)" }}>
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="e.g. Scanned copy verified against originals"
                  className="w-full p-2.5 border rounded-lg text-xs outline-hidden resize-none"
                  style={{
                    backgroundColor: "var(--bg-subtle)",
                    borderColor: "var(--border-main)",
                    color: "var(--text-main)",
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: "var(--border-main)" }}>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-semibold border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  style={{ borderColor: "var(--border-main)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="px-4 py-2 rounded-lg font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {isUploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUploading ? "Uploading..." : "Save & Upload"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INLINE PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-3xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-main)",
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: "var(--border-main)" }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate" style={{ color: "var(--text-main)" }}>
                    {previewDoc.fileName}
                  </h3>
                  <div className="text-[11px] text-gray-400">
                    {previewDoc.category} • {formatBytes(previewDoc.size)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.downloadUrl || "#"}
                  download={previewDoc.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Document Viewer / Preview */}
            <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold" style={{ color: "var(--text-main)" }}>
                  {previewDoc.fileName}
                </h4>
                <p className="text-xs text-gray-500 max-w-md">
                  {previewDoc.description || "Verified document persisted in practice storage."}
                </p>
              </div>

              <div
                className="p-4 rounded-xl border bg-gray-50 dark:bg-gray-800/40 text-xs text-left w-full max-w-md space-y-2"
                style={{ borderColor: "var(--border-main)" }}
              >
                <div className="flex justify-between text-gray-500">
                  <span>Storage Provider:</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize">
                    {previewDoc.storageProvider || "Practice Storage"}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>File Size:</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {formatBytes(previewDoc.size)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Category:</span>
                  <span className="font-semibold text-[var(--primary)]">{previewDoc.category}</span>
                </div>
                {previewDoc.uploadedBy && (
                  <div className="flex justify-between text-gray-500">
                    <span>Uploaded By:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{previewDoc.uploadedBy}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
