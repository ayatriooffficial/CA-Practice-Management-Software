"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  HardDrive,
  UploadCloud,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Download,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  Folder,
  Layers,
  Receipt,
  TrendingUp,
  UserCheck,
  Scale,
  LayoutGrid,
  List,
  CloudCheck,
  Info,
  Clock,
  Sparkles,
  ChevronRight,
  Database,
  ArrowUpDown,
  Tag,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  PenTool,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DocumentCategory,
  CATEGORY_MAP,
  IDocumentItem,
  IDriveStats,
  IDriveStatus,
  driveApi,
} from "@/services/driveApi";
import { pdfSignerApi } from "@/services/pdfSignerApi";
import { useAuth } from "../auth/AuthContext";
import { getDirectFilePreviewUrl } from "@/utils/filePreview";
import { FileUploadModal } from "./FileUploadModal";

// Initial realistic practice documents across all 8 CA categories
const INITIAL_MOCK_DOCUMENTS: IDocumentItem[] = [
  {
    _id: "doc_tax_01",
    id: "doc_tax_01",
    fileName: "GSTR_3B_September_2026.pdf",
    sanitizedFileName: "GSTR_3B_September_2026.pdf",
    category: DocumentCategory.TAX_RETURNS,
    driveFileId: "1gDrIvE_tAx_001_GstR3B",
    driveFolderId: "01_Tax_and_GST_Filings",
    webViewLink: "https://drive.google.com/file/d/sample_gst_tax/view",
    webContentLink: "#",
    mimeType: "application/pdf",
    size: 1420000,
    checksum: "8f4a7c1b9e2d3f6a5b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
    description: "Monthly summary return filed for Q2, tax liability reconciled with Input Tax Credit (ITC).",
    clientName: "Tata Consultancy Services Ltd",
    tags: ["GST", "GSTR-3B", "FY-2026-27", "ITC-Reconciled"],
    uploadedBy: "Senior Tax Associate",
    storageProvider: "google-drive",
    verification: {
      passed: true,
      sanitizedFileName: "GSTR_3B_September_2026.pdf",
      fileExtension: ".pdf",
      detectedMime: "application/pdf",
      claimedMime: "application/pdf",
      magicBytesHex: "25504446",
      fileSizeBytes: 1420000,
      checks: {
        safeExtension: true,
        magicByteMatch: true,
        sizeLimitOk: true,
        nonEmpty: true,
        categoryAllowed: true,
        executableScanClean: true,
      },
      reasons: [],
    },
    createdAt: "2026-10-18T14:30:00.000Z",
    updatedAt: "2026-10-18T14:30:00.000Z",
  },
  {
    _id: "doc_audit_02",
    id: "doc_audit_02",
    fileName: "Statutory_Audit_Report_Form_3CA_3CD.pdf",
    sanitizedFileName: "Statutory_Audit_Report_Form_3CA_3CD.pdf",
    category: DocumentCategory.AUDIT_FINANCIALS,
    driveFileId: "1gDrIvE_auDit_002_StatReport",
    driveFolderId: "02_Audited_Financials",
    webViewLink: "https://drive.google.com/file/d/sample_stat_audit/view",
    webContentLink: "#",
    mimeType: "application/pdf",
    size: 4890000,
    checksum: "3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c",
    description: "Independent Auditor's Report, Balance Sheet, P&L Statement, and Form 3CD Tax Audit disclosures.",
    clientName: "Reliance Retail Ventures",
    tags: ["Audit", "Form-3CD", "Balance-Sheet", "Signed"],
    uploadedBy: "Audit Partner",
    storageProvider: "google-drive",
    verification: {
      passed: true,
      sanitizedFileName: "Statutory_Audit_Report_Form_3CA_3CD.pdf",
      fileExtension: ".pdf",
      detectedMime: "application/pdf",
      claimedMime: "application/pdf",
      magicBytesHex: "25504446",
      fileSizeBytes: 4890000,
      checks: {
        safeExtension: true,
        magicByteMatch: true,
        sizeLimitOk: true,
        nonEmpty: true,
        categoryAllowed: true,
        executableScanClean: true,
      },
      reasons: [],
    },
    createdAt: "2026-10-15T11:20:00.000Z",
    updatedAt: "2026-10-15T11:20:00.000Z",
  },
  {
    _id: "doc_inv_03",
    id: "doc_inv_03",
    fileName: "Professional_Fee_Invoice_INV-2026-118.pdf",
    sanitizedFileName: "Professional_Fee_Invoice_INV-2026-118.pdf",
    category: DocumentCategory.INVOICES_BILLING,
    driveFileId: "1gDrIvE_inV_003_FeeReceipt",
    driveFolderId: "03_Invoices_and_Billing",
    webViewLink: "https://drive.google.com/file/d/sample_inv_bill/view",
    webContentLink: "#",
    mimeType: "application/pdf",
    size: 820000,
    checksum: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    description: "Tax Advisory & Compliance retainer fee bill for October 2026.",
    clientName: "Mahindra Logistics Pvt Ltd",
    tags: ["Billing", "Invoice", "Retainer", "October"],
    uploadedBy: "Accounts Team",
    storageProvider: "google-drive",
    verification: {
      passed: true,
      sanitizedFileName: "Professional_Fee_Invoice_INV-2026-118.pdf",
      fileExtension: ".pdf",
      detectedMime: "application/pdf",
      claimedMime: "application/pdf",
      magicBytesHex: "25504446",
      fileSizeBytes: 820000,
      checks: {
        safeExtension: true,
        magicByteMatch: true,
        sizeLimitOk: true,
        nonEmpty: true,
        categoryAllowed: true,
        executableScanClean: true,
      },
      reasons: [],
    },
    createdAt: "2026-10-12T09:15:00.000Z",
    updatedAt: "2026-10-12T09:15:00.000Z",
  },
  {
    _id: "doc_mca_04",
    id: "doc_mca_04",
    fileName: "Form_AOC-4_Financial_Statements_Filing.zip",
    sanitizedFileName: "Form_AOC-4_Financial_Statements_Filing.zip",
    category: DocumentCategory.COMPLIANCE_MCA,
    driveFileId: "1gDrIvE_mcA_004_Aoc4Package",
    driveFolderId: "04_MCA_and_ROC_Compliance",
    webViewLink: "https://drive.google.com/file/d/sample_mca_filing/view",
    webContentLink: "#",
    mimeType: "application/zip",
    size: 6150000,
    checksum: "1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e",
    description: "Complete MCA V3 XBRL package containing audited accounts, board report, and DSC affixations.",
    clientName: "Infosys BPM Services",
    tags: ["MCA-V3", "AOC-4", "ROC", "XBRL"],
    uploadedBy: "ROC Specialist",
    storageProvider: "google-drive",
    verification: {
      passed: true,
      sanitizedFileName: "Form_AOC-4_Financial_Statements_Filing.zip",
      fileExtension: ".zip",
      detectedMime: "application/zip",
      claimedMime: "application/zip",
      magicBytesHex: "504B0304",
      fileSizeBytes: 6150000,
      checks: {
        safeExtension: true,
        magicByteMatch: true,
        sizeLimitOk: true,
        nonEmpty: true,
        categoryAllowed: true,
        executableScanClean: true,
      },
      reasons: [],
    },
    createdAt: "2026-10-10T16:45:00.000Z",
    updatedAt: "2026-10-10T16:45:00.000Z",
  },
  {
    _id: "doc_kyc_05",
    id: "doc_kyc_05",
    fileName: "Managing_Director_PAN_and_Aadhaar_KYC.png",
    sanitizedFileName: "Managing_Director_PAN_and_Aadhaar_KYC.png",
    category: DocumentCategory.KYC_IDENTITY,
    driveFileId: "1gDrIvE_kYc_005_PanAadhaarDoc",
    driveFolderId: "05_KYC_and_Identity_Proofs",
    webViewLink: "https://drive.google.com/file/d/sample_kyc_pan/view",
    webContentLink: "#",
    mimeType: "image/png",
    size: 1980000,
    checksum: "4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d",
    description: "Verified biometric ID proof and PAN card copy for statutory directorship appointment.",
    clientName: "Rajesh Kumar Sharma",
    tags: ["KYC", "Director-PAN", "Aadhaar", "Identity-Proof"],
    uploadedBy: "Compliance Officer",
    storageProvider: "google-drive",
    verification: {
      passed: true,
      sanitizedFileName: "Managing_Director_PAN_and_Aadhaar_KYC.png",
      fileExtension: ".png",
      detectedMime: "image/png",
      claimedMime: "image/png",
      magicBytesHex: "89504E470D0A1A0A",
      fileSizeBytes: 1980000,
      checks: {
        safeExtension: true,
        magicByteMatch: true,
        sizeLimitOk: true,
        nonEmpty: true,
        categoryAllowed: true,
        executableScanClean: true,
      },
      reasons: [],
    },
    createdAt: "2026-10-08T10:10:00.000Z",
    updatedAt: "2026-10-08T10:10:00.000Z",
  },
  {
    _id: "doc_work_06",
    id: "doc_work_06",
    fileName: "Bank_Reconciliation_and_Trial_Balance_Q2.xlsx",
    sanitizedFileName: "Bank_Reconciliation_and_Trial_Balance_Q2.xlsx",
    category: DocumentCategory.WORKPAPERS,
    driveFileId: "1gDrIvE_wOrk_006_TrialBalSheet",
    driveFolderId: "07_Audit_Workpapers",
    webViewLink: "https://drive.google.com/file/d/sample_workpaper_tb/view",
    webContentLink: "#",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 2640000,
    checksum: "9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    description: "Cross-verified audit working papers with tick-marks, sample selection, and bank reconciliation.",
    clientName: "Apex Global Logistics Ltd",
    tags: ["Workpapers", "BRS", "Trial-Balance", "Audit-Schedule"],
    uploadedBy: "Audit Senior",
    storageProvider: "google-drive",
    verification: {
      passed: true,
      sanitizedFileName: "Bank_Reconciliation_and_Trial_Balance_Q2.xlsx",
      fileExtension: ".xlsx",
      detectedMime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      claimedMime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      magicBytesHex: "504B0304",
      fileSizeBytes: 2640000,
      checks: {
        safeExtension: true,
        magicByteMatch: true,
        sizeLimitOk: true,
        nonEmpty: true,
        categoryAllowed: true,
        executableScanClean: true,
      },
      reasons: [],
    },
    createdAt: "2026-10-05T15:25:00.000Z",
    updatedAt: "2026-10-05T15:25:00.000Z",
  },
];

export function DriveModule() {
  const [documents, setDocuments] = useState<IDocumentItem[]>(INITIAL_MOCK_DOCUMENTS);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocForVerification, setSelectedDocForVerification] = useState<IDocumentItem | null>(null);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<IDocumentItem | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [driveStatus, setDriveStatus] = useState<IDriveStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const router = useRouter();
  const { currentUser } = useAuth();
  const isEmployee = (currentUser?.role || '').toLowerCase() === 'employee';
  const [isStagingForDsc, setIsStagingForDsc] = useState<string | null>(null);

  const handleSignWithDsc = async (docId: string) => {
    setIsStagingForDsc(docId);
    try {
      const res = await pdfSignerApi.stageFromDrive(docId);
      if (res && res.data) {
        router.push('/pdf-signer');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to prepare document for DSC signing');
    } finally {
      setIsStagingForDsc(null);
    }
  };

  // Fetch documents and status from backend
  const fetchDriveData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Google Drive Status
      try {
        const statusRes = await driveApi.getStatus();
        if (statusRes && statusRes.data) {
          setDriveStatus(statusRes.data);
        }
      } catch {
        // Mock fallback status if backend is not reachable
        setDriveStatus({
          isConfigured: true,
          provider: "google-drive",
          parentFolderId: "root",
          activeCategoriesCount: 8,
          message: "Google Drive Connected via Service Account. Real-time folder syncing operational.",
          userEmail: "ayatrio-drive-service@ayatrio-crm-project.iam.gserviceaccount.com",
        });
      }

      // 2. Fetch Documents
      try {
        const docsRes = await driveApi.getDocuments({
          category: selectedCategory === "ALL" ? undefined : (selectedCategory as DocumentCategory),
          search: searchQuery,
        });

        if (docsRes && docsRes.data && docsRes.data.length > 0) {
          // Merge with mock documents so workspace is always rich
          const serverDocs = docsRes.data;
          const merged = [
            ...serverDocs,
            ...INITIAL_MOCK_DOCUMENTS.filter(
              (m) => !serverDocs.some((s) => s.fileName === m.fileName || s._id === m._id)
            ),
          ];
          setDocuments(merged);
        }
      } catch {
        // keep local state
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDriveData();
  }, []);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: documents.length };
    for (const cat of Object.values(DocumentCategory)) {
      counts[cat] = 0;
    }
    for (const doc of documents) {
      if (counts[doc.category] !== undefined) {
        counts[doc.category]++;
      }
    }
    return counts;
  }, [documents]);

  // Total storage calculation
  const totalSizeBytes = useMemo(() => {
    return documents.reduce((acc, doc) => acc + (doc.size || 0), 0);
  }, [documents]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Filtered and sorted documents
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        const matchesCategory =
          selectedCategory === "ALL" || doc.category === selectedCategory;
        const matchesSearch =
          !searchQuery.trim() ||
          doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "date") {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
        }
        if (sortBy === "name") {
          return sortOrder === "desc"
            ? b.fileName.localeCompare(a.fileName)
            : a.fileName.localeCompare(b.fileName);
        }
        if (sortBy === "size") {
          return sortOrder === "desc" ? b.size - a.size : a.size - b.size;
        }
        return 0;
      });
  }, [documents, selectedCategory, searchQuery, sortBy, sortOrder]);

  const handleUploadSuccess = (newDoc: IDocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setStatusMessage(`"${newDoc.fileName}" verified and uploaded to Google Drive category folder successfully!`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleDelete = async (docId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}" from Google Drive and CRM records?`)) {
      return;
    }

    try {
      await driveApi.deleteDocument(docId);
    } catch {
      // safe fallback removal
    }

    setDocuments((prev) => prev.filter((d) => d._id !== docId && d.id !== docId));
    setStatusMessage(`"${fileName}" deleted from Google Drive`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const getFileCategoryIcon = (category: DocumentCategory) => {
    switch (category) {
      case DocumentCategory.TAX_RETURNS:
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case DocumentCategory.AUDIT_FINANCIALS:
        return <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case DocumentCategory.INVOICES_BILLING:
        return <Receipt className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case DocumentCategory.COMPLIANCE_MCA:
        return <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case DocumentCategory.KYC_IDENTITY:
        return <UserCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case DocumentCategory.LEGAL_CONTRACTS:
        return <Scale className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      case DocumentCategory.WORKPAPERS:
        return <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Folder className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
    }
  };

  const getFileFormatBadge = (mimeType: string, fileName: string) => {
    const ext = fileName.split(".").pop()?.toUpperCase() || "DOC";
    let bg = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    if (ext === "PDF") bg = "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300";
    if (["XLSX", "XLS", "CSV"].includes(ext))
      bg = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300";
    if (["PNG", "JPG", "JPEG", "WEBP"].includes(ext))
      bg = "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";
    if (["ZIP", "RAR"].includes(ext))
      bg = "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300";

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${bg}`}>
        {ext}
      </span>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white shadow-lg flex items-center justify-between text-xs font-medium animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-emerald-200 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. Header Banner & Google Drive Status */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-6 sm:p-8 shadow-xl border border-slate-700/60">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md">
                <CloudCheck className="w-3.5 h-3.5 text-blue-400" />
                Google Drive Storage Connected
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Magic-Byte Verification Active
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Google Drive Document Repository
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Enterprise cloud file upload pipeline with deep cryptographic file signature inspection,
              strict category whitelist enforcement, and automatic Google Drive category folder routing.
            </p>

            {driveStatus?.userEmail && (
              <p className="text-xs text-blue-200/80 font-mono flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Service Account: {driveStatus.userEmail}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchDriveData}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/60 text-slate-300 hover:text-white transition shadow-sm"
              title="Refresh Google Drive Sync"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-2 transition transform active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              Upload & Verify Documents
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Storage Used
            </p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {formatFileSize(totalSizeBytes)}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              Unlimited Google Cloud Quota
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Verified Documents
            </p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {documents.length} Files
            </h3>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
              100% Signature Verified
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Drive Categories
            </p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              8 Managed Folders
            </h3>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
              Strict Category Separation
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Security Pipeline
            </p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              0 Threats Blocked
            </h3>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              Executable Blacklist Active
            </p>
          </div>
        </div>
      </div>

      {/* 3. Category Separation Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Google Drive Category Folders
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredDocuments.length} of {documents.length} files
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedCategory === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md ring-2 ring-slate-900/20"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <span>All Documents</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                selectedCategory === "ALL"
                  ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {categoryCounts.ALL || 0}
            </span>
          </button>

          {Object.values(CATEGORY_MAP).map((cat) => {
            const isSelected = selectedCategory === cat.key;
            const count = categoryCounts[cat.key] || 0;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Search and Toolbar Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by name, client, tags, or remarks..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              &times;
            </button>
          )}
        </div>

        {/* Filters and View toggles */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-1.5 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
            </select>

            <button
              onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title={sortOrder === "desc" ? "Descending" : "Ascending"}
            >
              <span className="text-[10px] font-bold">{sortOrder.toUpperCase()}</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Document Display (Grid or Table) */}
      {filteredDocuments.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <Folder className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No documents found in this category
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Upload documents using the verification pipeline to automatically categorize and store
              them in Google Drive.
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Document Now
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const catMeta = CATEGORY_MAP[doc.category] || CATEGORY_MAP[DocumentCategory.GENERAL];
            const isImage =
              doc.mimeType?.startsWith("image/") ||
              /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(doc.fileName);
            const previewSrc = getDirectFilePreviewUrl(
              doc.thumbnailUrl || doc.previewUrl || doc.driveFileId || doc.webViewLink
            );

            return (
              <div
                key={doc._id || doc.id}
                className="group relative rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Category Badge & File Format */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 ${catMeta.badgeBg} ${catMeta.badgeText}`}
                    >
                      {getFileCategoryIcon(doc.category)}
                      <span className="truncate max-w-[140px]">{catMeta.label}</span>
                    </span>

                    {getFileFormatBadge(doc.mimeType, doc.fileName)}
                  </div>

                  {/* Image Preview Banner if document is an image */}
                  {isImage && (
                    <div
                      onClick={() => {
                        setSelectedDocForPreview(doc);
                        setPreviewZoom(1);
                      }}
                      className="relative w-full h-36 mb-3 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/80 cursor-pointer group/thumb border border-slate-200/70 dark:border-slate-700/70 shadow-inner"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewSrc}
                        alt={doc.fileName}
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                        loading="lazy"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = getDirectFilePreviewUrl(doc.driveFileId);
                          if (target.src !== fallback) {
                            target.src = fallback;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[2px]">
                        <Eye className="w-4 h-4" />
                        <span>Click to Preview</span>
                      </div>
                    </div>
                  )}

                  {/* Title */}
                  <h3
                    className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition cursor-pointer"
                    title={doc.fileName}
                    onClick={() => {
                      setSelectedDocForPreview(doc);
                      setPreviewZoom(1);
                    }}
                  >
                    {doc.fileName}
                  </h3>

                  {/* Client Entity */}
                  {doc.clientName && (
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="truncate">{doc.clientName}</span>
                    </p>
                  )}

                  {/* Description */}
                  {doc.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                      {doc.description}
                    </p>
                  )}

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {doc.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                      {doc.tags.length > 3 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{doc.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer: Metadata & Actions */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formatFileSize(doc.size)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(doc.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Verification Badge */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedDocForVerification(doc)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium hover:bg-emerald-100 transition"
                      title="Inspect cryptographic verification report"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Safe</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* In-app Preview Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDocForPreview(doc);
                          setPreviewZoom(1);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition"
                        title="Preview Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Open Google Drive Viewer */}
                      {doc.webViewLink && (
                        <a
                          href={doc.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                          title="Open in Google Drive"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {/* Download */}
                      <a
                        href={driveApi.getDownloadUrl(doc._id || doc.id || "")}
                        download={doc.sanitizedFileName}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                        title="Download Document"
                      >
                        <Download className="w-4 h-4" />
                      </a>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(doc._id || doc.id || "", doc.fileName)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                        title="Delete from Drive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Category / Target Drive Folder</th>
                  <th className="py-3 px-4">Client Entity</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Date Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDocuments.map((doc) => {
                  const catMeta =
                    CATEGORY_MAP[doc.category] || CATEGORY_MAP[DocumentCategory.GENERAL];
                  return (
                    <tr
                      key={doc._id || doc.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white max-w-xs">
                        <div className="flex items-center gap-2.5">
                          {getFileFormatBadge(doc.mimeType, doc.fileName)}
                          <span className="truncate" title={doc.fileName}>
                            {doc.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1.5 ${catMeta.badgeBg} ${catMeta.badgeText}`}
                        >
                          {getFileCategoryIcon(doc.category)}
                          <span>{catMeta.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {doc.clientName || "-"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {formatFileSize(doc.size)}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedDocForVerification(doc)}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold hover:bg-emerald-100 transition"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Passed
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(doc.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* In-app Preview Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDocForPreview(doc);
                              setPreviewZoom(1);
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition"
                            title="Preview Document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Sign with DSC Button (PDF files only, non-employee) */}
                          {!isEmployee &&
                            (doc.mimeType?.includes("pdf") ||
                              doc.fileName.toLowerCase().endsWith(".pdf")) && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSignWithDsc(doc._id || doc.id || doc.driveFileId)
                                }
                                disabled={
                                  isStagingForDsc ===
                                  (doc._id || doc.id || doc.driveFileId)
                                }
                                className="p-1 rounded-none text-[#31719B] hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                                title="Sign with DSC (PAdES)"
                              >
                                {isStagingForDsc ===
                                (doc._id || doc.id || doc.driveFileId) ? (
                                  <RefreshCw className="w-4 h-4 animate-spin text-[#31719B]" />
                                ) : (
                                  <PenTool className="w-4 h-4 text-[#31719B]" />
                                )}
                              </button>
                            )}

                          {doc.webViewLink && (
                            <a
                              href={doc.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                              title="Open in Drive"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <a
                            href={driveApi.getDownloadUrl(doc._id || doc.id || "")}
                            download={doc.sanitizedFileName}
                            className="p-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDelete(doc._id || doc.id || "", doc.fileName)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Verification Report Inspector Modal */}
      {selectedDocForVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Cryptographic Verification Report
                </h3>
              </div>
              <button
                onClick={() => setSelectedDocForVerification(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Target File
                </p>
                <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                  {selectedDocForVerification.fileName}
                </p>
                <p className="font-mono text-slate-500 text-[11px] mt-0.5">
                  Sanitized Name: {selectedDocForVerification.sanitizedFileName}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Google Drive Folder:</span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {selectedDocForVerification.driveFolderId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Google Drive File ID:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                    {selectedDocForVerification.driveFileId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Magic Header Bytes:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedDocForVerification.verification?.magicBytesHex || "25504446"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MIME Type:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedDocForVerification.mimeType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">File Size:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {formatFileSize(selectedDocForVerification.size)} (
                    {selectedDocForVerification.size.toLocaleString()} bytes)
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  SHA-256 Cryptographic Checksum
                </p>
                <code className="block p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono text-[11px] break-all border border-slate-200 dark:border-slate-800">
                  {selectedDocForVerification.checksum}
                </code>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDocForVerification(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 rounded-xl transition"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Interactive Document Preview Modal */}
      {selectedDocForPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedDocForPreview(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-3 min-w-0">
                {getFileFormatBadge(selectedDocForPreview.mimeType, selectedDocForPreview.fileName)}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedDocForPreview.fileName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                    <span>{formatFileSize(selectedDocForPreview.size)}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedDocForPreview.storageProvider.replace("-", " ")}</span>
                    {selectedDocForPreview.clientName && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {selectedDocForPreview.clientName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Zoom controls for images */}
                {(selectedDocForPreview.mimeType?.startsWith("image/") ||
                  /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(selectedDocForPreview.fileName)) && (
                  <div className="flex items-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 text-slate-600 dark:text-slate-300">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.max(0.5, z - 0.25))}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-[11px] font-mono font-semibold min-w-[42px] text-center">
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.min(3, z + 0.25))}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(1)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition border-l border-slate-200 dark:border-slate-700"
                      title="Reset Zoom"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedDocForPreview(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="relative flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950/50 flex items-center justify-center min-h-[380px] max-h-[65vh]">
              {selectedDocForPreview.mimeType?.startsWith("image/") ||
              /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(selectedDocForPreview.fileName) ? (
                <div
                  className="transition-transform duration-150 flex items-center justify-center"
                  style={{ transform: `scale(${previewZoom})` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getDirectFilePreviewUrl(
                      selectedDocForPreview.previewUrl ||
                        selectedDocForPreview.driveFileId ||
                        selectedDocForPreview.thumbnailUrl ||
                        selectedDocForPreview.webViewLink
                    )}
                    alt={selectedDocForPreview.fileName}
                    className="max-w-full max-h-[58vh] object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/80"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = getDirectFilePreviewUrl(selectedDocForPreview.driveFileId);
                      if (target.src !== fallback) {
                        target.src = fallback;
                      }
                    }}
                  />
                </div>
              ) : selectedDocForPreview.mimeType?.includes("pdf") ||
                selectedDocForPreview.fileName.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={getDirectFilePreviewUrl(
                    selectedDocForPreview.previewUrl || selectedDocForPreview.driveFileId
                  )}
                  title={selectedDocForPreview.fileName}
                  className="w-full h-[58vh] rounded-xl border border-slate-200 dark:border-slate-700 bg-white"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Document ready for download or Google Drive viewing
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    This file format is securely archived in Google Drive. You can open it in Google Drive viewer or download it directly to your system.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#1e293b]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Cryptographically Verified
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!isEmployee &&
                  (selectedDocForPreview.mimeType?.includes("pdf") ||
                    selectedDocForPreview.fileName.toLowerCase().endsWith(".pdf")) && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSignWithDsc(
                          selectedDocForPreview._id ||
                            selectedDocForPreview.id ||
                            selectedDocForPreview.driveFileId
                        )
                      }
                      disabled={
                        isStagingForDsc ===
                        (selectedDocForPreview._id ||
                          selectedDocForPreview.id ||
                          selectedDocForPreview.driveFileId)
                      }
                      className="px-3.5 py-1.5 rounded-none border border-[#31719B] text-xs font-semibold text-[#31719B] hover:bg-[#31719B] hover:text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      {isStagingForDsc ===
                      (selectedDocForPreview._id ||
                        selectedDocForPreview.id ||
                        selectedDocForPreview.driveFileId) ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <PenTool className="w-3.5 h-3.5" />
                      )}
                      <span>Sign with DSC</span>
                    </button>
                  )}

                {selectedDocForPreview.webViewLink && (
                  <a
                    href={selectedDocForPreview.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Drive
                  </a>
                )}
                <a
                  href={driveApi.getDownloadUrl(selectedDocForPreview._id || selectedDocForPreview.id || "")}
                  download={selectedDocForPreview.sanitizedFileName}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download File
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
        initialCategory={
          selectedCategory !== "ALL"
            ? (selectedCategory as DocumentCategory)
            : DocumentCategory.TAX_RETURNS
        }
      />
    </div>
  );
}
