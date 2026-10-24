"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  FileText,
  Search,
  FolderOpen,
  ExternalLink,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Sparkles,
} from "lucide-react";
import { Client, ClientDocumentInOut } from "@/data/crmData";
import { TaskItem } from "@/data/taskData";
import { Service } from "@/data/serviceData";
import { getAvatarBadge } from "./utils";
import { taskApi } from "@/services/taskApi";
import { serviceApi } from "@/services/serviceApi";
import { appSyncService } from "@/services/appSyncService";
import { driveApi, IDocumentItem } from "@/services/driveApi";
import { usePermission } from "../../team/usePermission";

export interface ClientDocumentsTabProps {
  client?: Client;
  documents: ClientDocumentInOut[];
  setIsAddDocInOutOpen: (open: boolean) => void;
  handleDeleteDocMovement: (docId: string, docName: string) => Promise<void>;
  clientTasks?: TaskItem[];
  isLoadingTasks?: boolean;
  clientName?: string;
  clientId?: string;
  onRefreshTasks?: () => void;
}

export const ClientDocumentsTab: React.FC<ClientDocumentsTabProps> = ({
  client,
  documents,
  setIsAddDocInOutOpen,
  handleDeleteDocMovement,
  clientTasks = [],
  isLoadingTasks = false,
  clientName = "",
  clientId = "",
  onRefreshTasks,
}) => {
  const { canDelete } = usePermission();
  const [activeSection, setActiveSection] = useState<"Movements" | "Required">("Required");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "In" | "Out">("All");
  const [reqStatusFilter, setReqStatusFilter] = useState<"All" | "Pending" | "Received">("All");

  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Services catalog from DB / cache
  const [servicesCatalog, setServicesCatalog] = useState<Service[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Client Drive documents from DB
  const [driveDocs, setDriveDocs] = useState<IDocumentItem[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(true);

  // Custom user-added required documents
  const [customReqDocs, setCustomReqDocs] = useState<
    Array<{
      taskId?: string;
      taskDbId?: string;
      taskName?: string;
      serviceName: string;
      docId: string;
      title: string;
      isMandatory: boolean;
      status: "Pending" | "Received";
      fileUrl?: string;
      receivedAt?: string;
      isActiveServiceDoc?: boolean;
    }>
  >([]);

  // Add Document Requirement Modal State
  const [isAddReqDocModalOpen, setIsAddReqDocModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocService, setNewDocService] = useState("");
  const [newDocMandatory, setNewDocMandatory] = useState(true);

  // Fetch services and client drive documents on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoadingCatalog(true);
    serviceApi
      .getServices({ limit: 100 })
      .then((res) => {
        if (isMounted && res.data) {
          setServicesCatalog(res.data);
        }
      })
      .catch(() => { })
      .finally(() => {
        if (isMounted) setIsLoadingCatalog(false);
      });

    const targetClientId = clientId || client?.id;
    if (targetClientId) {
      setIsLoadingDrive(true);
      driveApi
        .getDocuments({ clientId: targetClientId, limit: 100 })
        .then((res) => {
          if (isMounted && res.data) {
            setDriveDocs(res.data);
          }
        })
        .catch(() => { })
        .finally(() => {
          if (isMounted) setIsLoadingDrive(false);
        });
    } else {
      setIsLoadingDrive(false);
    }

    return () => {
      isMounted = false;
    };
  }, [clientId, client?.id]);

  const isLoadingRequired = Boolean(isLoadingTasks || isLoadingCatalog || isLoadingDrive);

  // Determine all active services for this client
  const activeServices = useMemo(() => {
    const set = new Set<string>();

    // 1. From client.services
    (client?.services || []).forEach((s) => {
      if (typeof s === "string" && s.trim()) set.add(s.trim());
    });

    // 2. From client.serviceSettings
    (client?.serviceSettings || []).forEach((setting: any) => {
      if (
        setting?.serviceName &&
        setting?.recTask !== "Disabled" &&
        setting?.compliance !== false
      ) {
        set.add(setting.serviceName.trim());
      }
    });

    // 3. From clientTasks
    clientTasks.forEach((t) => {
      if (t.serviceName?.trim()) set.add(t.serviceName.trim());
    });

    return Array.from(set);
  }, [client?.services, client?.serviceSettings, clientTasks]);

  // Standard statutory documents mapped to service category if catalog documentRequests is empty
  const getStandardDocsForService = (serviceName: string, category?: string) => {
    const sName = serviceName.toLowerCase();
    const cat = (category || "").toLowerCase();

    if (sName.includes("gst") || cat.includes("g.s.t")) {
      return [
        {
          id: `std_gst_1_${serviceName}`,
          title: "Sales & Purchase Invoices / Bills",
          isMandatory: true,
        },
        {
          id: `std_gst_2_${serviceName}`,
          title: "Bank Statements (Current & Savings)",
          isMandatory: true,
        },
        {
          id: `std_gst_3_${serviceName}`,
          title: "GSTR-2B Statement & ITC Reconciliation",
          isMandatory: false,
        },
      ];
    }
    if (sName.includes("tds") || sName.includes("tax") || cat.includes("income tax")) {
      return [
        {
          id: `std_tax_1_${serviceName}`,
          title: "TDS Deductions & Expense Vouchers",
          isMandatory: true,
        },
        {
          id: `std_tax_2_${serviceName}`,
          title: "Challan ITNS 281 Payment Proofs",
          isMandatory: true,
        },
        {
          id: `std_tax_3_${serviceName}`,
          title: "Form 16 / 16A / 26AS Tax Credit Statement",
          isMandatory: false,
        },
      ];
    }
    if (
      sName.includes("epf") ||
      sName.includes("esic") ||
      cat.includes("e.p.f.p") ||
      cat.includes("e.s.i.c")
    ) {
      return [
        {
          id: `std_epf_1_${serviceName}`,
          title: "Monthly Wage & Salary Sheet",
          isMandatory: true,
        },
        {
          id: `std_epf_2_${serviceName}`,
          title: "Employee Attendance Register",
          isMandatory: true,
        },
      ];
    }
    if (sName.includes("roc") || sName.includes("mca") || cat.includes("r.o.c")) {
      return [
        {
          id: `std_roc_1_${serviceName}`,
          title: "Director KYC & Identity Verification",
          isMandatory: true,
        },
        {
          id: `std_roc_2_${serviceName}`,
          title: "Board Resolution / Meeting Minutes",
          isMandatory: false,
        },
      ];
    }
    if (sName.includes("audit") || cat.includes("audit")) {
      return [
        {
          id: `std_aud_1_${serviceName}`,
          title: "Final Trial Balance & Ledgers",
          isMandatory: true,
        },
        {
          id: `std_aud_2_${serviceName}`,
          title: "Bank Confirmation Certificates",
          isMandatory: true,
        },
      ];
    }
    return [
      {
        id: `std_gen_1_${serviceName}`,
        title: "Entity Registration / Tax Document",
        isMandatory: true,
      },
      {
        id: `std_gen_2_${serviceName}`,
        title: "Periodic Financial Records / Bank Statement",
        isMandatory: false,
      },
    ];
  };

  // Compile full list of required compliance documents
  const requiredDocuments = useMemo(() => {
    const list: Array<{
      taskId?: string;
      taskDbId?: string;
      taskName?: string;
      serviceName: string;
      docId: string;
      title: string;
      isMandatory: boolean;
      status: "Pending" | "Received";
      fileUrl?: string;
      receivedAt?: string;
      isActiveServiceDoc?: boolean;
    }> = [];

    const addedKeySet = new Set<string>();

    // 1. Documents from active client tasks
    clientTasks.forEach((task) => {
      (task.documentRequests || []).forEach((doc) => {
        const key = `${task.serviceName.toLowerCase()}::${doc.title.toLowerCase()}`;
        addedKeySet.add(key);

        const matchedDrive = driveDocs.find(
          (d) =>
            d.description?.toLowerCase().includes(doc.title.toLowerCase()) ||
            d.fileName?.toLowerCase().includes(doc.title.toLowerCase()) ||
            (Array.isArray(d.tags) ? d.tags.join(" ") : String(d.tags || ""))
              .toLowerCase()
              .includes(doc.title.toLowerCase())
        );

        const isReceived =
          doc.status === "Received" || Boolean(doc.fileUrl) || Boolean(matchedDrive);
        const fileUrl = doc.fileUrl || matchedDrive?.webViewLink || matchedDrive?.previewUrl;
        const receivedAt = doc.receivedAt || matchedDrive?.createdAt;

        list.push({
          taskId: task.taskId,
          taskDbId: task.id,
          taskName: task.taskName,
          serviceName: task.serviceName,
          docId: doc.id,
          title: doc.title,
          isMandatory: doc.isMandatory ?? true,
          status: isReceived ? "Received" : "Pending",
          fileUrl,
          receivedAt,
          isActiveServiceDoc: true,
        });
      });
    });

    // 2. Documents for all other active client services
    activeServices.forEach((serviceName) => {
      const matchedService = servicesCatalog.find(
        (s) => s.name.toLowerCase() === serviceName.toLowerCase()
      );

      let docRequests: Array<{ id: string; title: string; isMandatory?: boolean }> = [];
      if (matchedService?.documentRequests && matchedService.documentRequests.length > 0) {
        docRequests = matchedService.documentRequests.map((d: any, idx: number) => {
          if (typeof d === "string")
            return { id: `doc_${idx}_${serviceName}`, title: d, isMandatory: true };
          return {
            id: d.id || `doc_${idx}_${serviceName}`,
            title: d.title || d.name,
            isMandatory: d.isMandatory ?? true,
          };
        });
      } else {
        docRequests = getStandardDocsForService(serviceName, matchedService?.category);
      }

      docRequests.forEach((reqDoc) => {
        const key = `${serviceName.toLowerCase()}::${reqDoc.title.toLowerCase()}`;
        if (addedKeySet.has(key)) return;
        addedKeySet.add(key);

        const matchedDrive = driveDocs.find(
          (d) =>
            d.description?.toLowerCase().includes(reqDoc.title.toLowerCase()) ||
            d.fileName?.toLowerCase().includes(reqDoc.title.toLowerCase()) ||
            (Array.isArray(d.tags) ? d.tags.join(" ") : String(d.tags || ""))
              .toLowerCase()
              .includes(reqDoc.title.toLowerCase())
        );

        list.push({
          serviceName,
          docId: reqDoc.id,
          title: reqDoc.title,
          isMandatory: reqDoc.isMandatory ?? true,
          status: matchedDrive ? "Received" : "Pending",
          fileUrl: matchedDrive?.webViewLink || matchedDrive?.previewUrl,
          receivedAt: matchedDrive?.createdAt,
          isActiveServiceDoc: true,
        });
      });
    });

    // 3. User-added custom document requirements
    customReqDocs.forEach((cDoc) => {
      list.push(cDoc);
    });

    return list;
  }, [clientTasks, activeServices, servicesCatalog, driveDocs, customReqDocs]);

  // Filter required documents
  const filteredRequiredDocs = useMemo(() => {
    return requiredDocuments.filter((doc) => {
      if (reqStatusFilter !== "All" && doc.status !== reqStatusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.serviceName.toLowerCase().includes(q) ||
          (doc.taskName && doc.taskName.toLowerCase().includes(q)) ||
          (doc.taskId && doc.taskId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [requiredDocuments, search, reqStatusFilter]);

  // Filter movements
  const filteredMovements = useMemo(() => {
    return documents.filter((d) => {
      if (statusFilter !== "All" && d.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          d.documentName.toLowerCase().includes(q) ||
          (d.personName && d.personName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [documents, search, statusFilter]);

  // Handle uploading document with Google Drive integration
  const handleUploadReqDoc = async (
    docId: string,
    docTitle: string,
    serviceName: string,
    file: File,
    taskDbId?: string
  ) => {
    setUploadingDocId(docId);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "TAX_RETURNS");
      formData.append(
        "description",
        `Client Compliance Document: ${docTitle} [${serviceName}]`
      );
      formData.append("clientName", clientName || client?.name || "Client");
      const targetClientId = clientId || client?.id;
      if (targetClientId) formData.append("clientId", targetClientId);
      formData.append("tags", `${serviceName}, ${docTitle}`);
      formData.append("uploadedBy", "Staff");

      const driveRes = await driveApi.uploadDocument(formData);
      const driveUrl =
        driveRes.data?.webViewLink ||
        driveRes.data?.previewUrl ||
        (driveRes.data?.driveFileId ? driveApi.getDownloadUrl(driveRes.data.driveFileId) : "");

      // If linked to a task, sync the task document request as well
      if (taskDbId) {
        await taskApi.uploadDocumentRequestFile(taskDbId, docId, file, docTitle).catch(() => { });
        if (onRefreshTasks) {
          onRefreshTasks();
        }
      }

      if (driveRes.data) {
        setDriveDocs((prev) => [driveRes.data, ...prev]);
      }

      setCustomReqDocs((prev) =>
        prev.map((d) =>
          d.docId === docId
            ? { ...d, status: "Received", fileUrl: driveUrl, receivedAt: new Date().toISOString() }
            : d
        )
      );
    } catch (err: any) {
      console.error("Upload error in client documents tab:", err);
      setUploadError(err?.message || "Google Drive upload failed.");
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleAddCustomReqDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    const newDoc = {
      docId: `custom_req_${Date.now()}`,
      title: newDocTitle.trim(),
      serviceName: newDocService.trim() || activeServices[0] || "General Compliance",
      isMandatory: newDocMandatory,
      status: "Pending" as const,
      isActiveServiceDoc: true,
    };

    setCustomReqDocs((prev) => [newDoc, ...prev]);
    setNewDocTitle("");
    setIsAddReqDocModalOpen(false);
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-sm border border-[#dde2e8] dark:border-[#334155] shadow-card overflow-hidden">
      {/* Top Section Switcher & Search Bar */}
      <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Main Subtab toggle: Required Documents vs Document Movements */}
          <div className="flex items-center rounded-lg border border-[#dde2e8] dark:border-[#334155] p-1 bg-gray-50 dark:bg-[#0f172a]">
            <button
              type="button"
              onClick={() => {
                setActiveSection("Required");
                setSearch("");
              }}
              className={`h-7 px-3 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5 ${activeSection === "Required"
                  ? "bg-white dark:bg-[#1e293b] text-[#31719B] shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Required Documents ({requiredDocuments.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection("Movements");
                setSearch("");
              }}
              className={`h-7 px-3 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5 ${activeSection === "Movements"
                  ? "bg-white dark:bg-[#1e293b] text-[#31719B] shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Document Movements ({documents.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeSection === "Required"
                  ? "Search required docs..."
                  : "Search movements..."
              }
              className="h-8 w-full rounded-md border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] pl-8 pr-3 text-xs text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
            />
          </div>

          {/* Filter Pill */}
          {activeSection === "Required" ? (
            <div className="flex items-center rounded-md border border-[#dde2e8] dark:border-[#334155] p-0.5 bg-gray-50 dark:bg-[#0f172a]">
              {(["All", "Pending", "Received"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setReqStatusFilter(filter)}
                  className={`h-7 px-3 rounded text-xs font-semibold cursor-pointer transition-all ${reqStatusFilter === filter
                      ? "bg-blue-100 text-[#31719B] dark:bg-blue-950/60 dark:text-blue-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center rounded-md border border-[#dde2e8] dark:border-[#334155] p-0.5 bg-gray-50 dark:bg-[#0f172a]">
              {(["All", "In", "Out"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`h-7 px-3 rounded text-xs font-semibold cursor-pointer transition-all ${statusFilter === filter
                      ? "bg-purple-100 text-[#7c3aed] dark:bg-purple-950/60 dark:text-purple-300 shadow-xs"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeSection === "Required" && (
            <button
              type="button"
              onClick={() => setIsAddReqDocModalOpen(true)}
              className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Document Requirement</span>
            </button>
          )}

          {activeSection === "Movements" && (
            <button
              type="button"
              onClick={() => setIsAddDocInOutOpen(true)}
              className="h-8 px-3.5 rounded-md text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: "var(--premium-blue-dark)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Movement</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="mx-4 mt-3 flex items-start space-x-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Google Drive Upload Failed</p>
            <p className="text-[11px] mt-0.5">{uploadError}</p>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: REQUIRED COMPLIANCE DOCUMENTS (Active Services & Tasks) */}
      {activeSection === "Required" && (
        <div className="overflow-x-auto scrollbar-slim">
          <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Required Document
                </th>
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Active Service / Task
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Type
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Status
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Uploaded Date
                </th>
                <th className="px-4 py-3 border-b border-[#dde2e8] dark:border-[#334155] font-semibold text-center">
                  Google Drive Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoadingRequired ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#31719B]" />
                    <span className="text-xs text-gray-500 mt-2 block font-medium">
                      Loading compliance documents...
                    </span>
                  </td>
                </tr>
              ) : filteredRequiredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                    {activeServices.length === 0
                      ? "No active services found for this client. Enable services in the Service Settings tab or create tasks to generate required compliance documents."
                      : "No required documents match the filter criteria."}
                  </td>
                </tr>
              ) : (
                filteredRequiredDocs.map((doc, idx) => {
                  const isReceived = doc.status === "Received";
                  const isUploading = uploadingDocId === doc.docId;
                  const fileInputId = `client-req-doc-${doc.docId}-${idx}`;

                  return (
                    <tr
                      key={`${doc.taskDbId || "svc"}-${doc.docId}-${idx}`}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                    >
                      {/* Document Name */}
                      <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="font-semibold">{doc.title}</span>
                        </div>
                      </td>

                      {/* Active Service / Task */}
                      <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300">
                        <div className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {doc.serviceName}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              Active Service
                            </span>
                          </div>
                          {doc.taskId && (
                            <span className="text-[10px] text-gray-500 font-mono">
                              Task: {doc.taskId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type: Mandatory or Optional */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${doc.isMandatory
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                        >
                          {doc.isMandatory ? "Mandatory" : "Optional"}
                        </span>
                      </td>

                      {/* Status: Uploaded / Received vs Not Uploaded / Pending */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10.5px] font-semibold ${isReceived
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                        >
                          {isReceived ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Uploaded</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Not Uploaded</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Uploaded Date */}
                      <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                        {doc.receivedAt
                          ? new Date(doc.receivedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                          : "—"}
                      </td>

                      {/* Actions: View & Upload to Drive */}
                      <td className="px-4 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View File</span>
                            </a>
                          )}

                          <input
                            id={fileInputId}
                            type="file"
                            className="hidden"
                            disabled={isUploading}
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                await handleUploadReqDoc(
                                  doc.docId,
                                  doc.title,
                                  doc.serviceName,
                                  file,
                                  doc.taskDbId
                                );
                                e.target.value = "";
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => document.getElementById(fileInputId)?.click()}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 text-xs font-medium cursor-pointer transition-colors"
                            title={
                              isReceived
                                ? "Re-upload document to Google Drive"
                                : "Upload file to Google Drive"
                            }
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3 h-3 text-gray-500" />
                                <span>{isReceived ? "Re-upload" : "Upload File"}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SECTION 2: DOCUMENT MOVEMENTS (In / Out Register) */}
      {activeSection === "Movements" && (
        <div className="overflow-x-auto scrollbar-slim">
          <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr
                className="text-gray-700 dark:text-gray-300"
                style={{ backgroundColor: "var(--orange-havy-light)" }}
              >
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Document Name
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Direction
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Person
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Date
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Returnable
                </th>
                <th className="px-3.5 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Return Date
                </th>
                <th className="px-4 py-3 border-r border-b border-[#dde2e8] dark:border-[#334155] font-semibold">
                  Remarks
                </th>
                <th className="w-12 px-2 py-3 border-b border-[#dde2e8] dark:border-[#334155] text-center font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                    No physical document movements recorded. Click "+ Add Movement" to track files.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((doc, idx) => (
                  <tr
                    key={doc.id || idx}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                  >
                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        {getAvatarBadge(doc.documentName, idx)}
                        <span>{doc.documentName}</span>
                      </div>
                    </td>

                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155]">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${doc.status === "In"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                      >
                        {doc.status}
                      </span>
                    </td>

                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300">
                      {doc.personName || "—"}
                    </td>

                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                      {doc.date || "—"}
                    </td>

                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                      {doc.returnable ? "Yes" : "No"}
                    </td>

                    <td className="px-3.5 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300">
                      {doc.returnDate || "—"}
                    </td>

                    <td className="px-4 py-2.5 border-r border-b border-[#dde2e8] dark:border-[#334155] text-gray-600 dark:text-gray-300 max-w-xs truncate">
                      {doc.remarks || "—"}
                    </td>

                    <td className="px-2 py-2.5 border-b border-[#dde2e8] dark:border-[#334155] text-center">
                      {canDelete("documentsInOut") ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteDocMovement(doc.id || "", doc.documentName)
                          }
                          title="Delete movement"
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Document Requirement for Active Service */}
      {isAddReqDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-xl shadow-2xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-[#111827] dark:text-[#f8fafc] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-[#dde2e8] dark:border-[#334155]"
              style={{ backgroundColor: "var(--orange-havy-light)" }}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#31719B]" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Add Document Requirement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddReqDocModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomReqDoc} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g. Electricity Bill, Bank NOC, Trade License"
                  className="w-full h-9 px-3 bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Active Service
                </label>
                <select
                  value={newDocService}
                  onChange={(e) => setNewDocService(e.target.value)}
                  className="w-full h-9 px-3 bg-white dark:bg-[#0f172a] border border-[#dde2e8] dark:border-[#334155] rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-[#31719B]"
                >
                  {activeServices.length > 0 ? (
                    activeServices.map((svc) => (
                      <option key={svc} value={svc}>
                        {svc}
                      </option>
                    ))
                  ) : (
                    <option value="General Compliance">General Compliance</option>
                  )}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="req-mandatory"
                  checked={newDocMandatory}
                  onChange={(e) => setNewDocMandatory(e.target.checked)}
                  className="rounded border-gray-300 text-[#31719B] focus:ring-[#31719B]"
                />
                <label htmlFor="req-mandatory" className="font-medium text-gray-700 dark:text-gray-300">
                  Mandatory document for statutory filing
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dde2e8] dark:border-[#334155]">
                <button
                  type="button"
                  onClick={() => setIsAddReqDocModalOpen(false)}
                  className="h-8 px-4 rounded-md font-semibold text-gray-600 dark:text-gray-300 border border-[#dde2e8] dark:border-[#334155] hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded-md font-semibold text-white shadow-sm"
                  style={{ backgroundColor: "var(--premium-blue-dark)" }}
                >
                  Add Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
