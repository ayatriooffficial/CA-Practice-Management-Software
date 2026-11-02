"use client";

import React, { useState, useCallback, useId, memo, useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { fetchServicesRequest, fetchMoreServicesRequest } from "@/store/features/services/serviceSlice";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  X,
  Calendar,
  AlertCircle,
  Sparkles,
  Check,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { driveApi, DocumentCategory } from "@/services/driveApi";
import { getDirectFilePreviewUrl } from "@/utils/filePreview";
import {
  Client,
  ClientContact,
  ClientLicense,
  ClientPassword,
  ClientDocumentInOut,
  CLIENT_TYPES,
  CLIENT_GROUPS,
  PROMOTERS,
  INITIAL_LEADS,
  STATUTORY_TYPES,
  SERVICE_CATEGORIES,
  MOCK_GSTIN_REGISTRY,
} from "@/data/crmData";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { useLeads } from "@/hooks/useLeadsQuery";
import { PromoterSearchDropdown, PromoterItem } from "./PromoterSearchDropdown";
import { ServiceSearchDropdown } from "./ServiceSearchDropdown";
import DiscardConfirmationModal from "@/components/ui/DiscardConfirmationModal";

interface ClientFormProps {
  initialClient?: Client | null;
  onSave: (client: Client) => Promise<void> | void;
  onCancel: () => void;
}

interface PromoterRow {
  key: number;
  name: string;
  pan: string;
  share: string;
  designation: string;
  mcaId: string;
  mcaPassword?: string;
}

interface StatutoryRow {
  key: number;
  type: string;
  idNo: string;
  userId: string;
  password?: string;
  attachment?: string | null;
}

interface RecurringRow {
  key: number;
  category: string;
  service: string;
  tariff: string;
}

const createEmptyPromoterRow = (key: number): PromoterRow => ({
  key,
  name: "",
  pan: "",
  share: "",
  designation: "",
  mcaId: "",
  mcaPassword: "",
});

const isPromoterRowEmpty = (r: PromoterRow) =>
  !r.name?.trim() &&
  !r.pan?.trim() &&
  !r.share?.trim() &&
  !r.designation?.trim() &&
  !r.mcaId?.trim() &&
  !r.mcaPassword?.trim();

const ensureTrailingEmptyPromoter = (rows: PromoterRow[]): PromoterRow[] => {
  if (rows.length === 0) return [createEmptyPromoterRow(1)];
  const last = rows[rows.length - 1];
  if (!isPromoterRowEmpty(last)) {
    const nextKey = Math.max(0, ...rows.map((r) => r.key)) + 1;
    return [...rows, createEmptyPromoterRow(nextKey)];
  }
  return rows;
};

const createEmptyStatutoryRow = (key: number): StatutoryRow => ({
  key,
  type: "",
  idNo: "",
  userId: "",
  password: "",
  attachment: null,
});

const isStatutoryRowEmpty = (s: StatutoryRow) =>
  !s.type?.trim() &&
  !s.idNo?.trim() &&
  !s.userId?.trim() &&
  !s.password?.trim() &&
  !s.attachment;

const ensureTrailingEmptyStatutory = (rows: StatutoryRow[]): StatutoryRow[] => {
  if (rows.length === 0) return [createEmptyStatutoryRow(1)];
  const last = rows[rows.length - 1];
  if (!isStatutoryRowEmpty(last)) {
    const nextKey = Math.max(0, ...rows.map((r) => r.key)) + 1;
    return [...rows, createEmptyStatutoryRow(nextKey)];
  }
  return rows;
};

const createEmptyRecurringRow = (key: number): RecurringRow => ({
  key,
  category: "",
  service: "",
  tariff: "0.00",
});

const isRecurringRowEmpty = (r: RecurringRow) =>
  !r.category?.trim() && !r.service?.trim();

const ensureTrailingEmptyRecurring = (rows: RecurringRow[]): RecurringRow[] => {
  if (rows.length === 0) return [createEmptyRecurringRow(1)];
  const last = rows[rows.length - 1];
  if (!isRecurringRowEmpty(last)) {
    const nextKey = Math.max(0, ...rows.map((r) => r.key)) + 1;
    return [...rows, createEmptyRecurringRow(nextKey)];
  }
  return rows;
};

export const ClientForm: React.FC<ClientFormProps> = ({
  initialClient,
  onSave,
  onCancel,
}) => {
  const isEditing = Boolean(initialClient?.id);

  // --- Redux: services from store ---
  const dispatch = useDispatch<AppDispatch>();
  const storeServices = useSelector((state: RootState) => state.services.items);
  const servicesLoaded = useSelector((state: RootState) => state.services.isLoaded);
  const servicesLoading = useSelector((state: RootState) => state.services.loading);
  const servicesLoadingMore = useSelector((state: RootState) => state.services.loadingMore);
  const servicesPagination = useSelector((state: RootState) => state.services.pagination);

  const handleFetchServices = useCallback(() => {
    if (!servicesLoading && storeServices.length === 0) {
      dispatch(fetchServicesRequest({ page: 1, limit: 10 }));
    }
  }, [dispatch, servicesLoading, storeServices.length]);

  const handleLoadMoreServices = useCallback(() => {
    if (!servicesLoadingMore && !servicesLoading) {
      const currentPage = servicesPagination?.page || 1;
      const nextPage = currentPage + 1;
      dispatch(fetchMoreServicesRequest({ page: nextPage, limit: 10 }));
    }
  }, [dispatch, servicesLoadingMore, servicesLoading, servicesPagination?.page]);

  const hasMoreServices = useMemo(() => {
    if (servicesPagination?.hasNextPage !== undefined) {
      return Boolean(servicesPagination.hasNextPage);
    }
    if (servicesPagination?.totalPages && servicesPagination?.page) {
      return servicesPagination.page < servicesPagination.totalPages;
    }
    if (servicesPagination?.totalDocs) {
      return storeServices.length < servicesPagination.totalDocs;
    }
    return false;
  }, [servicesPagination, storeServices.length]);

  // Password visibility toggles: statutory rows keyed by row.key, promoter keyed by row.key
  const [showStatutoryPw, setShowStatutoryPw] = useState<Record<number, boolean>>({});
  const [showPromoterMcaPw, setShowPromoterMcaPw] = useState<Record<number, boolean>>({});
  const [customStatutoryKeys, setCustomStatutoryKeys] = useState<Record<number, boolean>>({});

  // Form State
  const [clientName, setClientName] = useState(initialClient?.name || "");
  const [type, setType] = useState(initialClient?.type || "");
  const [pan, setPan] = useState(initialClient?.pan || "");
  const [mobile, setMobile] = useState(initialClient?.mobile || "");
  const [email, setEmail] = useState(initialClient?.email || "");
  const [city, setCity] = useState(initialClient?.city || "");

  const [isActive, setIsActive] = useState(initialClient?.active ?? true);
  const [dob, setDob] = useState(initialClient?.dob || "");
  const [group, setGroup] = useState(initialClient?.group || "");
  const [referredBy, setReferredBy] = useState(initialClient?.referredBy || "");
  const [secondaryMobile, setSecondaryMobile] = useState(
    initialClient?.secondaryMobile || ""
  );
  const [address, setAddress] = useState(initialClient?.address || "");
  const [pincode, setPincode] = useState(initialClient?.pincode || "");
  const [photo, setPhoto] = useState<string | null>(initialClient?.photo || null);

  // Customer Files Grid State (Load from initialClient if editing, always ensures at least 1 trailing empty row)
  const [promoterRows, setPromoterRows] = useState<PromoterRow[]>(() => {
    if (initialClient?.customerFiles?.promoter && initialClient.customerFiles.promoter.length > 0) {
      const mapped = initialClient.customerFiles.promoter.map((p: any, idx: number) => ({
        key: p.key || idx + 1,
        name: p.name || "",
        pan: p.pan || "",
        share: p.share || "",
        designation: p.designation || "",
        mcaId: p.mcaId || "",
        mcaPassword: p.mcaPassword || "",
      }));
      return ensureTrailingEmptyPromoter(mapped);
    }
    return [createEmptyPromoterRow(1)];
  });

  const [statutoryRows, setStatutoryRows] = useState<StatutoryRow[]>(() => {
    if (initialClient?.customerFiles?.statutory && initialClient.customerFiles.statutory.length > 0) {
      const mapped = initialClient.customerFiles.statutory.map((s: any, idx: number) => ({
        key: s.key || idx + 1,
        type: s.type || "",
        idNo: s.idNo || "",
        userId: s.userId || "",
        password: s.password || "",
        attachment: s.attachment || null,
      }));
      return ensureTrailingEmptyStatutory(mapped);
    }
    return [createEmptyStatutoryRow(1)];
  });

  const [recurringRows, setRecurringRows] = useState<RecurringRow[]>(() => {
    if (initialClient?.customerFiles?.recurring && initialClient.customerFiles.recurring.length > 0) {
      const mapped = initialClient.customerFiles.recurring.map((r: any, idx: number) => ({
        key: r.key || idx + 1,
        category: r.category || "",
        service: r.service || "",
        tariff: r.tariff || "0.00",
      }));
      return ensureTrailingEmptyRecurring(mapped);
    }
    return [createEmptyRecurringRow(1)];
  });

  // Re-sync form fields when initialClient changes
  React.useEffect(() => {
    if (initialClient) {
      setClientName(initialClient.name || "");
      setType(initialClient.type || "");
      setPan(initialClient.pan || "");
      setMobile(initialClient.mobile || "");
      setEmail(initialClient.email || "");
      setCity(initialClient.city || "");
      setIsActive(initialClient.active ?? true);
      setDob(initialClient.dob || "");
      setGroup(initialClient.group || "");
      setReferredBy(initialClient.referredBy || "");
      setSecondaryMobile(initialClient.secondaryMobile || "");
      setAddress(initialClient.address || "");
      setPincode(initialClient.pincode || "");
      setPhoto(initialClient.photo || null);

      if (initialClient.customerFiles?.promoter && initialClient.customerFiles.promoter.length > 0) {
        const mapped = initialClient.customerFiles.promoter.map((p: any, idx: number) => ({
          key: p.key || idx + 1,
          name: p.name || "",
          pan: p.pan || "",
          share: p.share || "",
          designation: p.designation || "",
          mcaId: p.mcaId || "",
          mcaPassword: p.mcaPassword || "",
        }));
        setPromoterRows(ensureTrailingEmptyPromoter(mapped));
      } else {
        setPromoterRows([createEmptyPromoterRow(1)]);
      }

      if (initialClient.customerFiles?.statutory && initialClient.customerFiles.statutory.length > 0) {
        const mapped = initialClient.customerFiles.statutory.map((s: any, idx: number) => ({
          key: s.key || idx + 1,
          type: s.type || "",
          idNo: s.idNo || "",
          userId: s.userId || "",
          password: s.password || "",
          attachment: s.attachment || null,
        }));
        setStatutoryRows(ensureTrailingEmptyStatutory(mapped));
      } else {
        setStatutoryRows([createEmptyStatutoryRow(1)]);
      }

      if (initialClient.customerFiles?.recurring && initialClient.customerFiles.recurring.length > 0) {
        const mapped = initialClient.customerFiles.recurring.map((r: any, idx: number) => ({
          key: r.key || idx + 1,
          category: r.category || "",
          service: r.service || "",
          tariff: r.tariff || "0.00",
        }));
        setRecurringRows(ensureTrailingEmptyRecurring(mapped));
      } else {
        setRecurringRows([createEmptyRecurringRow(1)]);
      }
    }
  }, [initialClient]);

  // Fetch Leads dynamically to populate the Promoters list
  const leadsParams = useMemo(() => ({ limit: 100 }), []);
  const { data: leadsData } = useLeads(leadsParams);

  const promotersList: PromoterItem[] = useMemo(() => {
    const list =
      leadsData?.leads && leadsData.leads.length > 0 ? leadsData.leads : INITIAL_LEADS;

    const items: PromoterItem[] = [];
    const seenNames = new Set<string>();

    // 1. Add all leads from backend/mock
    list.forEach((l) => {
      const name = (l.fullName || `${l.firstName || ""} ${l.lastName || ""}`.trim()).toUpperCase();
      if (name && !seenNames.has(name)) {
        seenNames.add(name);
        items.push({
          id: l.id,
          name: name,
          pan: l.pan || "",
          mcaId: l.mcaId || "",
          mcaPassword: l.mcaPassword || "",
          din: l.din || "",
          mobile: l.mobile || "",
        });
      }
    });

    // 2. Also ensure default mock promoters are included if not present
    PROMOTERS.forEach((p) => {
      const uname = p.name.toUpperCase();
      if (!seenNames.has(uname)) {
        seenNames.add(uname);
        items.push({
          id: uname,
          name: p.name,
          pan: p.pan || "",
          mcaId: p.mcaId || "",
          mcaPassword: p.mcaPassword || "",
        });
      }
    });

    return items;
  }, [leadsData?.leads]);

  // Modals
  const [showGstinModal, setShowGstinModal] = useState(false);
  const [gstinInput, setGstinInput] = useState("");
  const [gstinError, setGstinError] = useState("");
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputId = useId();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingStatutoryKey, setUploadingStatutoryKey] = useState<number | null>(null);

  // Photo change handler with Google Drive upload & verification
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("category", DocumentCategory.KYC_IDENTITY);
      formDataUpload.append("clientName", clientName || "Client");
      formDataUpload.append("description", `Profile photo for client ${clientName || "new client"}`);

      const res = await driveApi.uploadDocument(formDataUpload);
      const photoUrl =
        (res.data?.driveFileId ? driveApi.getPreviewUrl(res.data.driveFileId) : null) ||
        res.data?.previewUrl ||
        res.data?.thumbnailUrl ||
        res.data?.webViewLink ||
        res.data?.fileName;
      if (photoUrl) {
        setPhoto(photoUrl);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Statutory Attachment upload to Google Drive with verification
  const handleStatutoryFileUpload = async (key: number, file: File) => {
    if (!file) return;

    setUploadingStatutoryKey(key);
    try {
      const targetRow = statutoryRows.find((r) => r.key === key);
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("category", DocumentCategory.KYC_IDENTITY);
      formDataUpload.append("clientName", clientName || "Client");
      formDataUpload.append(
        "description",
        `Statutory document (${targetRow?.type || "KYC"}) for client ${clientName || "Client"}`
      );

      const res = await driveApi.uploadDocument(formDataUpload);
      updateStatutoryRow(key, "attachment", res.data?.fileName || file.name);
    } catch {
      updateStatutoryRow(key, "attachment", file.name);
    } finally {
      setUploadingStatutoryKey(null);
    }
  };

  // Promoter Grid Updates (Searchable Dropdown handler)
  const handleSelectPromoter = (key: number, promoter: PromoterItem) => {
    setPromoterRows((prev) => {
      const updated = prev.map((row) => {
        if (row.key === key) {
          return {
            ...row,
            name: promoter.name,
            pan: promoter.pan || row.pan,
            mcaId: promoter.mcaId || row.mcaId,
            mcaPassword: promoter.mcaPassword || row.mcaPassword,
            designation: row.designation || (promoter.din ? "Director" : row.designation),
          };
        }
        return row;
      });
      return ensureTrailingEmptyPromoter(updated);
    });
  };

  const handleClearPromoter = (key: number) => {
    setPromoterRows((prev) =>
      ensureTrailingEmptyPromoter(
        prev.map((row) => {
          if (row.key === key) {
            return {
              ...row,
              name: "",
              pan: "",
              mcaId: "",
              mcaPassword: "",
            };
          }
          return row;
        })
      )
    );
  };

  // Manual input field updates for promoter row
  const updatePromoterRow = (key: number, field: keyof PromoterRow, val: string) => {
    setPromoterRows((prev) => {
      const updated = prev.map((row) => {
        if (row.key === key) {
          const next = { ...row, [field]: val };
          // If name is selected or typed, auto-fill PAN & MCA details!
          if (field === "name") {
            const match =
              promotersList.find((p) => p.name.toLowerCase() === val.toLowerCase()) ||
              PROMOTERS.find((p) => p.name.toLowerCase() === val.toLowerCase());
            if (match) {
              next.pan = match.pan;
              next.mcaId = match.mcaId || "";
              next.mcaPassword = match.mcaPassword || "";
            }
          }
          return next;
        }
        return row;
      });
      return ensureTrailingEmptyPromoter(updated);
    });
  };

  const removePromoterRow = (key: number) => {
    setPromoterRows((prev) => {
      const filtered = prev.filter((r) => r.key !== key);
      return ensureTrailingEmptyPromoter(filtered);
    });
  };

  // Statutory Grid Updates
  const updateStatutoryRow = (key: number, field: keyof StatutoryRow, val: any) => {
    setStatutoryRows((prev) => {
      const updated = prev.map((row) => {
        if (row.key === key) {
          return { ...row, [field]: val };
        }
        return row;
      });
      return ensureTrailingEmptyStatutory(updated);
    });
  };

  const removeStatutoryRow = (key: number) => {
    setStatutoryRows((prev) => {
      const filtered = prev.filter((r) => r.key !== key);
      return ensureTrailingEmptyStatutory(filtered);
    });
    setCustomStatutoryKeys((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // Recurring Grid Updates
  const updateRecurringRow = (key: number, field: keyof RecurringRow, val: string) => {
    setRecurringRows((prev) => {
      const updated = prev.map((row) => {
        if (row.key === key) {
          return { ...row, [field]: val };
        }
        return row;
      });
      return ensureTrailingEmptyRecurring(updated);
    });
  };

  const removeRecurringRow = (key: number) => {
    setRecurringRows((prev) => {
      const filtered = prev.filter((r) => r.key !== key);
      return ensureTrailingEmptyRecurring(filtered);
    });
  };

  // GSTIN Autofill handler
  const handleAutofillGstin = (gstinToLookup?: string) => {
    const g = (gstinToLookup || gstinInput).trim().toUpperCase();
    if (!g) {
      setGstinError("Please enter a 15-character GSTIN number.");
      return;
    }

    const matched = MOCK_GSTIN_REGISTRY[g];
    if (matched) {
      setClientName(matched.legalName);
      setType(matched.type);
      setAddress(matched.address);
      setCity(matched.city);
      setPincode(matched.pincode);
      setPan(matched.pan);
      setShowGstinModal(false);
      setGstinError("");
    } else if (g.length >= 10) {
      const derivedPan = g.substring(2, 12);
      setPan(derivedPan);
      setShowGstinModal(false);
      setGstinError("");
    } else {
      setGstinError("GSTIN not found in mock database. Try sample 24AAKCA1234F1Z5.");
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Client Name (Required, min 2 chars)
    if (!clientName.trim()) {
      errs.clientName = "Client Name is required";
    } else if (clientName.trim().length < 2) {
      errs.clientName = "Client Name must be at least 2 characters";
    }

    // 2. Constitution Type (Required)
    if (!type || !type.trim()) {
      errs.type = "Constitution Type is required (e.g. Private Limited, Individual, LLP)";
    }

    // 3. Mobile Number (Required, at least 7 digits)
    const cleanMobile = mobile.trim();
    if (!cleanMobile) {
      errs.mobile = "Mobile Number is required";
    } else if (cleanMobile.length < 7) {
      errs.mobile = "Valid mobile number is required (at least 7 digits, e.g. 9876543210)";
    } else if (!/^[0-9+\s\-()]{7,16}$/.test(cleanMobile)) {
      errs.mobile = "Invalid mobile number format";
    }

    // 4. Practice Group (Required)
    if (!group || !group.trim()) {
      errs.group = "Practice Group is required (e.g. Accounting, Tax & Regulatory)";
    }

    // 5. PAN (Optional, but if entered must match 10-char PAN format)
    if (pan.trim()) {
      const cleanPan = pan.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
        errs.pan = "Invalid PAN format. Must be 10 characters (e.g. ABCDE1234F)";
      }
    }

    // 6. Email (Optional, but if entered must be valid email format)
    if (email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errs.email = "Invalid email address format (e.g. name@domain.com)";
      }
    }

    // 7. Secondary Mobile (Optional, but if entered must be valid)
    if (secondaryMobile.trim()) {
      if (!/^[0-9+\s\-()]{7,16}$/.test(secondaryMobile.trim())) {
        errs.secondaryMobile = "Invalid secondary mobile number format";
      }
    }

    // 8. Promoter Rows Validation
    promoterRows.forEach((r, idx) => {
      const hasAnyField = Boolean(r.pan || r.share || r.designation || r.mcaId);
      if (hasAnyField && !r.name.trim()) {
        errs[`promoter_${idx}`] = `Promoter #${idx + 1}: Name is required when details are entered`;
      }
      if (r.pan.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(r.pan.trim().toUpperCase())) {
        errs[`promoter_pan_${idx}`] = `Promoter #${idx + 1}: Invalid PAN format (e.g. ABCDE1234F)`;
      }
    });

    // 9. Statutory Rows Validation
    statutoryRows.forEach((s, idx) => {
      const typeVal = s.type.trim() === "__CUSTOM__" ? "" : s.type.trim();
      if (!typeVal && s.idNo.trim()) {
        errs[`statutory_${idx}`] = `Statutory #${idx + 1}: Statutory Type is required for ID "${s.idNo}"`;
      }
    });

    // 10. Recurring Rows Validation
    recurringRows.forEach((rec, idx) => {
      if (rec.category.trim() && !rec.service.trim()) {
        errs[`recurring_${idx}`] = `Recurring #${idx + 1}: Service name is required for category "${rec.category}"`;
      } else if (!rec.category.trim() && rec.service.trim()) {
        errs[`recurring_${idx}`] = `Recurring #${idx + 1}: Category is required for service "${rec.service}"`;
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      setTimeout(() => {
        const firstErrorEl = document.querySelector(".border-rose-500, .border-\\[\\#e8655a\\]");
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return;
    }

    setIsSubmitting(true);
    try {
      // Clean Customer Files: filter out unpopulated rows
      const cleanPromoters = promoterRows
        .filter((r) => r.name.trim() !== "")
        .map((r, i) => ({
          ...r,
          key: r.key || i + 1,
          name: r.name.trim(),
          pan: r.pan.trim().toUpperCase() || undefined,
          share: r.share.trim() || undefined,
          designation: r.designation.trim() || undefined,
          mcaId: r.mcaId.trim() || undefined,
          mcaPassword: r.mcaPassword?.trim() || undefined,
        }));

      const cleanStatutory = statutoryRows
        .filter((s) => s.type.trim() !== "" && s.type.trim() !== "__CUSTOM__")
        .map((s, i) => ({
          ...s,
          key: s.key || i + 1,
          type: s.type.trim(),
          idNo: s.idNo.trim() || "-",
          userId: s.userId.trim() || undefined,
          password: s.password?.trim() || undefined,
          attachment: s.attachment || null,
        }));

      const cleanRecurring = recurringRows
        .filter((r) => r.category.trim() !== "" && r.service.trim() !== "")
        .map((r, i) => ({
          ...r,
          key: r.key || i + 1,
          category: r.category.trim(),
          service: r.service.trim(),
          tariff: r.tariff.trim() || "0.00",
        }));

      const recurringServiceNames = cleanRecurring.map((r) => r.service.trim());
      const allServices = Array.from(
        new Set([...(initialClient?.services || []), ...recurringServiceNames])
      );

      const recurringServiceSettings = cleanRecurring.map((r, i) => {
        const existing = (initialClient?.serviceSettings || []).find(
          (s: any) => s.serviceName === r.service
        );
        return {
          id: existing?.id || `srv-setting-${i + 1}`,
          serviceName: r.service,
          category: r.category,
          compliance: true,
          isActive: true,
          recTask: existing?.recTask || "Enabled",
          recInvoice: existing?.recInvoice || "Enabled",
          frequency: existing?.frequency || "Monthly",
          start: existing?.start || "Day 1",
          target: existing?.target || "Day 15",
          end: existing?.end || "Day 20",
          amount: parseFloat(r.tariff) || 0,
        };
      });

      const existingOtherSettings = (initialClient?.serviceSettings || []).filter(
        (s: any) => !cleanRecurring.some((r) => r.service === s.serviceName)
      );
      const allServiceSettings = [...existingOtherSettings, ...recurringServiceSettings];

      // Map Promoters to Contacts & Directors
      const promoterContacts: ClientContact[] = cleanPromoters.map((p, i) => ({
        id: `contact-${Date.now()}-${i + 1}`,
        name: p.name,
        isPrimary: i === 0,
        designation: p.designation || "Director",
        pan: p.pan,
        din: p.mcaId,
        mcaId: p.mcaId,
        mcaPassword: p.mcaPassword,
        dinStatus: "Active",
      }));
      const existingContacts = initialClient?.contacts || [];
      const existingContactNames = new Set(existingContacts.map((c) => c.name.toLowerCase()));
      const allContacts = [
        ...existingContacts,
        ...promoterContacts.filter((pc) => !existingContactNames.has(pc.name.toLowerCase())),
      ];

      // Map Statutory Rows to Licenses & Statutory Registrations
      const statutoryLicenses: ClientLicense[] = cleanStatutory.map((s, i) => ({
        id: `lic-${Date.now()}-${i + 1}`,
        name: s.type,
        licenseNo: s.idNo || "-",
        file: s.attachment || null,
        fileUrl: s.attachment || undefined,
        remarks: s.userId ? `User ID: ${s.userId}` : undefined,
      }));
      const existingLicenses = initialClient?.licenses || [];
      const existingLicNames = new Set(existingLicenses.map((l) => l.name.toLowerCase()));
      const allLicenses = [
        ...existingLicenses,
        ...statutoryLicenses.filter((sl) => !existingLicNames.has(sl.name.toLowerCase())),
      ];

      // Map Statutory Credentials to Portal Credentials & Passwords
      const statutoryPasswords: ClientPassword[] = cleanStatutory
        .filter((s) => Boolean(s.userId || s.password))
        .map((s, i) => ({
          id: `pwd-${Date.now()}-${i + 1}`,
          portal: s.type,
          userId: s.userId || "-",
          password: s.password || "",
          remarks: s.idNo ? `ID: ${s.idNo}` : undefined,
        }));
      const existingPasswords = initialClient?.passwords || [];
      const existingPwdPortals = new Set(existingPasswords.map((p) => p.portal.toLowerCase()));
      const allPasswords = [
        ...existingPasswords,
        ...statutoryPasswords.filter((sp) => !existingPwdPortals.has(sp.portal.toLowerCase())),
      ];

      // Map Statutory Attachments to Documents Movement (In/Out)
      const statutoryDocs: ClientDocumentInOut[] = cleanStatutory
        .filter((s) => Boolean(s.attachment))
        .map((s, i) => ({
          id: `doc-${Date.now()}-${i + 1}`,
          documentName: `${s.type} Registration Document`,
          personName: clientName.trim() || "Client",
          date: new Date().toISOString().split("T")[0],
          status: "In",
          returnable: false,
          file: s.attachment,
          fileUrl: s.attachment || undefined,
          remarks: `Statutory Type: ${s.type}, ID: ${s.idNo || "-"}`,
        }));
      const existingDocs = initialClient?.documentsInOut || [];
      const existingDocNames = new Set(existingDocs.map((d) => d.documentName.toLowerCase()));
      const allDocumentsInOut = [
        ...existingDocs,
        ...statutoryDocs.filter((sd) => !existingDocNames.has(sd.documentName.toLowerCase())),
      ];

      const finalClient: Client = {
        id: initialClient?.id || "",
        name: clientName.trim(),
        fileNo: initialClient?.fileNo || "",
        type: type.trim(),
        mobile: mobile.trim(),
        secondaryMobile: secondaryMobile.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: "Maharashtra",
        pincode: pincode.trim() || undefined,
        group: group.trim() || "Accounting",
        tags: initialClient?.tags || ["new-client"],
        active: isActive,
        services: allServices,
        serviceSettings: allServiceSettings,
        contacts: allContacts,
        licenses: allLicenses,
        passwords: allPasswords,
        documentsInOut: allDocumentsInOut,
        users: initialClient?.users || ["Aarav"],
        pan: pan.trim().toUpperCase() || undefined,
        dob: dob || undefined,
        referredBy: referredBy.trim() || undefined,
        photo: photo || undefined,
        createdAt: initialClient?.createdAt || new Date().toISOString(),
        customerFiles: {
          promoter: cleanPromoters,
          statutory: cleanStatutory,
          recurring: cleanRecurring,
        },
      };

      await onSave(finalClient);
    } catch (err: any) {
      console.error("Failed to register/update client:", err);
      const msg = err.message || "Failed to save client. Please review the highlighted requirements.";
      setSubmitError(msg);

      // Map backend validation field errors if available
      if (err.errors && Array.isArray(err.errors)) {
        const backendErrs: Record<string, string> = {};
        err.errors.forEach((e: any) => {
          if (e.field) {
            backendErrs[e.field] = e.message;
          }
        });
        if (Object.keys(backendErrs).length > 0) {
          setErrors((prev) => ({ ...prev, ...backendErrs }));
        }
      }

      setTimeout(() => {
        const banner = document.getElementById("client-form-error-banner");
        if (banner) {
          banner.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!initialClient) {
      return Boolean(
        clientName ||
        type ||
        pan ||
        mobile ||
        email ||
        city ||
        dob ||
        group ||
        referredBy ||
        secondaryMobile ||
        address ||
        pincode ||
        photo ||
        promoterRows.some((r) => r.name || r.pan || r.share || r.designation || r.mcaId) ||
        statutoryRows.some((r) => r.type || r.idNo || r.userId) ||
        recurringRows.some((r) => r.category || r.service)
      );
    }
    return (
      clientName !== (initialClient.name || "") ||
      type !== (initialClient.type || "") ||
      pan !== (initialClient.pan || "") ||
      mobile !== (initialClient.mobile || "") ||
      email !== (initialClient.email || "") ||
      city !== (initialClient.city || "") ||
      isActive !== (initialClient.active ?? true) ||
      dob !== (initialClient.dob || "") ||
      group !== (initialClient.group || "") ||
      referredBy !== (initialClient.referredBy || "") ||
      secondaryMobile !== (initialClient.secondaryMobile || "") ||
      address !== (initialClient.address || "") ||
      pincode !== (initialClient.pincode || "") ||
      photo !== (initialClient.photo || null)
    );
  }, [
    clientName,
    type,
    pan,
    mobile,
    email,
    city,
    isActive,
    dob,
    group,
    referredBy,
    secondaryMobile,
    address,
    pincode,
    photo,
    promoterRows,
    statutoryRows,
    recurringRows,
    initialClient,
  ]);

  const handleCancelAttempt = () => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      onCancel();
    }
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-150">
      {/* 1. Breadcrumb & Top Autofill Button Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-base md:text-lg">
          <button
            type="button"
            onClick={handleCancelAttempt}
            aria-label="Back to Clients"
            className="p-1 rounded-md text-[#31719B] hover:bg-[#31719B]/10 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-gray-400">
            <ChevronRight className="w-4 h-4" />
          </span>
          <button
            type="button"
            onClick={handleCancelAttempt}
            className="font-medium text-[#31719B] hover:underline cursor-pointer"
          >
            Clients
          </button>
          <span className="text-gray-400">
            <ChevronRight className="w-4 h-4" />
          </span>
          <span className="font-semibold text-[#000000] dark:text-white">
            {isEditing ? `Edit ${clientName}` : "Add Client"}
          </span>
        </nav>

        <button
          type="button"
          onClick={() => setShowGstinModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          style={{ backgroundColor: "var(--premium-blue-dark)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")
          }
        >
          <Plus className="w-4 h-4" />
          <span>Autofill Using GSTIN</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 py-2">
        {/* Requirement Warning & Validation Banner */}
        {(submitError || Object.keys(errors).length > 0) && (
          <div
            id="client-form-error-banner"
            className=" border border-rose-300 dark:border-rose-800 bg-rose-50/95 dark:bg-rose-950/50 p-4 text-rose-800 dark:text-rose-200 shadow-sm animate-in fade-in duration-200"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-rose-900 dark:text-rose-100 flex items-center gap-2">
                    <span>Required Fields & Validation Warnings</span>
                    {Object.keys(errors).length > 0 && (
                      <span className="text-xs bg-rose-200/80 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded-full font-semibold">
                        {Object.keys(errors).length} requirement{Object.keys(errors).length > 1 ? "s" : ""} need attention
                      </span>
                    )}
                  </h4>
                </div>

                {submitError && (
                  <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                    {submitError}
                  </p>
                )}

                {Object.keys(errors).length > 0 && (
                  <ul className="list-disc list-inside text-xs space-y-1 text-rose-700 dark:text-rose-300 pt-1">
                    {Object.entries(errors).map(([key, msg]) => (
                      <li key={key} className="font-medium">
                        {msg}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. CARD: Client Info */}
        <div className=" border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-5 md:p-6 shadow-card space-y-4">
          <h2 className="text-lg font-bold text-[#000000] dark:text-white">
            Client Info
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-4 pt-1">
            {/* LEFT COLUMN */}
            <div className="space-y-1">
              {/* Photo */}
              <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-start gap-4 py-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2">
                  Photo
                </label>
                <div className="flex flex-col items-center w-28">
                  <div
                    onClick={() => document.getElementById(fileInputId)?.click()}
                    className="w-24 h-24 rounded-lg border border-[#dde2e8] dark:border-[#475569] bg-[#f5f6f8] dark:bg-[#0f172a] flex items-center justify-center cursor-pointer hover:border-[#31719B] overflow-hidden transition-colors"
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getDirectFilePreviewUrl(photo)}
                        alt="Client preview"
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const clean = photo.trim();
                          const idMatch = clean.match(/([a-zA-Z0-9_-]{25,})/);
                          if (idMatch && idMatch[1]) {
                            const fallback = driveApi.getPreviewUrl(idMatch[1]);
                            if (target.src !== fallback) {
                              target.src = fallback;
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        {/* Grey SVG photo silhouette matching screenshot */}
                        <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById(fileInputId)?.click()}
                    disabled={uploadingPhoto}
                    aria-label="Upload photo"
                    className="mt-2 w-8 h-8 rounded-full bg-[#e9ebee] dark:bg-[#334155] text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-[#dcdfe3] transition-colors cursor-pointer"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <Pencil className="w-4 h-4" />
                    )}
                  </button>

                  <Input
                    id={fileInputId}
                    name="clientPhoto"
                    aria-label="Upload photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Client Name * */}
              <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-4 py-2">
                <label htmlFor="cf-client-name" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Client Name <span className="text-[#e8655a] font-bold">*</span>
                </label>
                <div>
                  <Input
                    id="cf-client-name"
                    name="clientName"
                    aria-label="Client Name"
                    type="text"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      if (errors.clientName) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.clientName;
                          return n;
                        });
                      }
                    }}
                    placeholder="Client Name"
                    error={errors.clientName}
                    size="md"
                    className="rounded-sm"
                  />
                </div>
              </div>

              {/* Type * */}
              <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-4 py-2">
                <label htmlFor="cf-type" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Type <span className="text-[#e8655a] font-bold">*</span>
                </label>
                <div>
                  <Select
                    id="cf-type"
                    aria-label="Client Type"
                    value={type}
                    onChange={(val) => {
                      setType(val);
                      if (errors.type) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.type;
                          return n;
                        });
                      }
                    }}
                    options={CLIENT_TYPES}
                    placeholder="Select Type..."
                    separator={true}
                    error={errors.type}
                  />
                  {errors.type && (
                    <p className="mt-1 text-xs text-[#e8655a] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errors.type}
                    </p>
                  )}
                </div>
              </div>

              {/* PAN */}
              <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-4 py-2">
                <label htmlFor="cf-pan" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  PAN
                </label>
                <div>
                  <Input
                    id="cf-pan"
                    name="pan"
                    aria-label="PAN"
                    type="text"
                    maxLength={10}
                    value={pan}
                    onChange={(e) => {
                      setPan(e.target.value.toUpperCase());
                      if (errors.pan) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.pan;
                          return n;
                        });
                      }
                    }}
                    placeholder="PAN (e.g. ABCDE1234F)"
                    error={errors.pan}
                    size="md"
                    className="uppercase font-mono rounded-sm"
                  />
                </div>
              </div>

              {/* Mobile No. * */}
              <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-4 py-2">
                <label htmlFor="cf-mobile" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Mobile No. <span className="text-[#e8655a] font-bold">*</span>
                </label>
                <div>
                  <Input
                    id="cf-mobile"
                    name="mobile"
                    aria-label="Mobile No."
                    type="tel"
                    maxLength={15}
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value.replace(/[^\d+ -]/g, ""));
                      if (errors.mobile) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.mobile;
                          return n;
                        });
                      }
                    }}
                    placeholder="Mobile No. (e.g. 9876543210)"
                    error={errors.mobile}
                    size="md"
                    className="rounded-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-4 py-2">
                <label htmlFor="cf-email" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Email
                </label>
                <div>
                  <Input
                    id="cf-email"
                    name="email"
                    aria-label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.email;
                          return n;
                        });
                      }
                    }}
                    placeholder="Email (e.g. name@domain.com)"
                    error={errors.email}
                    size="md"
                    className="rounded-sm"
                  />
                </div>
              </div>

              {/* City */}
              <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-4 py-2">
                <label htmlFor="cf-city" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  City
                </label>
                <Input
                  id="cf-city"
                  name="city"
                  aria-label="City"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  size="md"
                  className="rounded-sm"
                />
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-1">
              {/* Is Active? Toggle - Height matched to Photo block so Date of Birth aligns with Client Name */}
              <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-start gap-4 py-2 lg:h-[152px]">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2">
                  Is Active?
                </label>
                <div className="flex h-11 items-center">
                  <button
                    type="button"
                    role="switch"
                    aria-label="Is Active toggle"
                    aria-checked={isActive}
                    onClick={() => setIsActive(!isActive)}
                    className={`inline-flex h-6 w-12 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer ${isActive
                      ? "border-[#31719B] bg-[#31719B]"
                      : "border-gray-300 bg-gray-200 dark:bg-gray-700"
                      }`}
                  >
                    <span
                      className={`h-4 w-4 rounded-full transition-transform duration-150 transform ${isActive
                        ? "translate-x-6.5 bg-white"
                        : "translate-x-1 bg-gray-400"
                        }`}
                    />
                  </button>
                </div>
              </div>

              {/* Date of Birth */}
              <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-center gap-4 py-2">
                <label htmlFor="cf-dob" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Date of Birth
                </label>
                <div className="relative">
                  <Input
                    id="cf-dob"
                    name="dob"
                    aria-label="Date of Birth"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    size="md"
                    className="rounded-sm"
                  />
                </div>
              </div>

              {/* Select Group * */}
              <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-center gap-4 py-2">
                <label htmlFor="cf-group" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Select Group <span className="text-[#e8655a] font-bold">*</span>
                </label>
                <div>
                  <Select
                    id="cf-group"
                    aria-label="Select Group"
                    value={group}
                    onChange={(val) => {
                      setGroup(val);
                      if (errors.group) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.group;
                          return n;
                        });
                      }
                    }}
                    options={CLIENT_GROUPS.map((g) => ({ value: g, label: g }))}
                    placeholder="Select Group..."
                    separator={true}
                    searchable={true}
                    error={errors.group}
                  />
                  {errors.group && (
                    <p className="mt-1 text-xs text-[#e8655a] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errors.group}
                    </p>
                  )}
                </div>
              </div>

              {/* Referred By */}
              <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-center gap-4 py-2">
                <label htmlFor="cf-referred-by" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Referred By
                </label>
                <Input
                  id="cf-referred-by"
                  name="referredBy"
                  aria-label="Referred By"
                  type="text"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value)}
                  placeholder="Referred By"
                  size="md"
                  className="rounded-sm"
                />
              </div>

              {/* Secondary Mobile No. */}
              <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-center gap-4 py-2">
                <label htmlFor="cf-sec-mobile" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Secondary Mobile No.
                </label>
                <div>
                  <Input
                    id="cf-sec-mobile"
                    name="secondaryMobile"
                    aria-label="Secondary Mobile No."
                    type="tel"
                    maxLength={15}
                    value={secondaryMobile}
                    onChange={(e) => {
                      setSecondaryMobile(e.target.value.replace(/[^\d+ -]/g, ""));
                      if (errors.secondaryMobile) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.secondaryMobile;
                          return n;
                        });
                      }
                    }}
                    placeholder="Secondary Mobile No."
                    error={errors.secondaryMobile}
                    size="md"
                    className="rounded-sm"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-start gap-4 py-2">
                <label htmlFor="cf-address" className="text-sm font-medium text-gray-700 dark:text-gray-300 pt-2 cursor-pointer">
                  Address
                </label>
                <textarea
                  id="cf-address"
                  name="address"
                  aria-label="Address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address"
                  className="min-h-[4.625rem] w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3.5 py-2.5 text-sm text-[#000000] dark:text-white outline-none hover:border-gray-400 focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B] resize-y"
                />
              </div>

              {/* Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-center gap-4 py-2">
                <label htmlFor="cf-pincode" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Pincode
                </label>
                <Input
                  id="cf-pincode"
                  name="pincode"
                  aria-label="Pincode"
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Pincode"
                  size="md"
                  className="rounded-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. CARD: Customer Files (matching Screenshot 5) */}
        <div className=" border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-5 md:p-6 shadow-card space-y-6">
          {/* Section A: Promoter Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Promoter Details
            </h3>
            <div className="overflow-x-auto rounded-lg border border-[#dde2e8] dark:border-[#334155]">
              <table className="w-full min-w-max border-collapse text-xs">
                <thead>
                  <tr
                    className="border-b border-[#dde2e8] dark:border-[#334155] text-left text-gray-700 dark:text-gray-300"
                    style={{ backgroundColor: "var(--orange-havy-light)" }}
                  >
                    <th className="w-10 px-2.5 py-2.5 text-center font-medium">#</th>
                    <th className="px-3 py-2.5 font-medium w-64 min-w-[240px]">Promoter Name</th>
                    <th className="px-3 py-2.5 font-medium w-36">PAN</th>
                    <th className="px-3 py-2.5 font-medium w-44">% of Share / Nos of Share</th>
                    <th className="px-3 py-2.5 font-medium w-40">Designation</th>
                    <th className="px-3 py-2.5 font-medium w-56">MCA ID (If Director)</th>
                    <th className="px-3 py-2.5 font-medium w-48">MCA PW (If Director)</th>
                    <th className="w-10 px-2 py-2.5 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                  {promoterRows.map((row, idx) => (
                    <tr key={row.key} className="bg-white dark:bg-[#1e293b]">
                      <td className="px-2.5 py-2 text-center text-gray-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-2 py-2 w-64 min-w-[240px]">
                        <PromoterSearchDropdown
                          id={`promoter-name-${row.key}`}
                          name={`promoterName-${row.key}`}
                          aria-label={`Promoter ${idx + 1} Name`}
                          value={row.name}
                          promoters={promotersList}
                          onSelect={(promoter) => handleSelectPromoter(row.key, promoter)}
                          onClear={() => handleClearPromoter(row.key)}
                          placeholder="Select"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          id={`promoter-pan-${row.key}`}
                          name={`promoterPan-${row.key}`}
                          aria-label={`Promoter ${idx + 1} PAN`}
                          type="text"
                          maxLength={10}
                          value={row.pan}
                          onChange={(e) => updatePromoterRow(row.key, "pan", e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setPromoterRows((prev) => ensureTrailingEmptyPromoter(prev));
                            }
                          }}
                          placeholder="PAN"
                          className="h-9 w-full rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-2.5 text-xs uppercase font-mono outline-none focus:border-[#31719B]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          id={`promoter-share-${row.key}`}
                          name={`promoterShare-${row.key}`}
                          aria-label={`Promoter ${idx + 1} Share Percentage`}
                          type="text"
                          value={row.share}
                          onChange={(e) => updatePromoterRow(row.key, "share", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setPromoterRows((prev) => ensureTrailingEmptyPromoter(prev));
                            }
                          }}
                          placeholder="% of Share"
                          className="h-9 w-full rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-2.5 text-xs outline-none focus:border-[#31719B]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          id={`promoter-desig-${row.key}`}
                          name={`promoterDesig-${row.key}`}
                          aria-label={`Promoter ${idx + 1} Designation`}
                          type="text"
                          value={row.designation}
                          onChange={(e) => updatePromoterRow(row.key, "designation", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setPromoterRows((prev) => ensureTrailingEmptyPromoter(prev));
                            }
                          }}
                          placeholder="Designation"
                          className="h-9 w-full rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-2.5 text-xs outline-none focus:border-[#31719B]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          id={`promoter-mca-id-${row.key}`}
                          name={`promoterMcaId-${row.key}`}
                          aria-label={`Promoter ${idx + 1} MCA ID`}
                          type="text"
                          value={row.mcaId}
                          onChange={(e) => updatePromoterRow(row.key, "mcaId", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setPromoterRows((prev) => ensureTrailingEmptyPromoter(prev));
                            }
                          }}
                          placeholder="MCA ID"
                          className="h-9 w-full rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-2.5 text-xs outline-none focus:border-[#31719B]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="relative">
                          <input
                            id={`promoter-mca-pw-${row.key}`}
                            name={`promoterMcaPw-${row.key}`}
                            aria-label={`Promoter ${idx + 1} MCA Password`}
                            type={showPromoterMcaPw[row.key] ? "text" : "password"}
                            value={row.mcaPassword || ""}
                            onChange={(e) => updatePromoterRow(row.key, "mcaPassword", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                setPromoterRows((prev) => ensureTrailingEmptyPromoter(prev));
                              }
                            }}
                            placeholder="Password"
                            className="h-9 w-full rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] pl-2.5 pr-7 text-xs outline-none focus:border-[#31719B]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPromoterMcaPw(prev => ({ ...prev, [row.key]: !prev[row.key] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            title={showPromoterMcaPw[row.key] ? "Hide password" : "Show password"}
                            aria-label={showPromoterMcaPw[row.key] ? "Hide password" : "Show password"}
                          >
                            {showPromoterMcaPw[row.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {!isPromoterRowEmpty(row) && (
                          <button
                            type="button"
                            onClick={() => removePromoterRow(row.key)}
                            className="p-1 text-gray-400 hover:text-[#e8655a] rounded cursor-pointer"
                            title="Remove line"
                            aria-label={`Remove promoter row ${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => setPromoterRows((prev) => ensureTrailingEmptyPromoter(prev))}
              className="mt-1 text-xs font-semibold text-[#31719B] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Promoter</span>
            </button>
          </div>

          {/* Section B: Statutory Details */}
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Statutory Details
            </h3>
            <div className="overflow-x-auto rounded-lg border border-[#dde2e8] dark:border-[#334155]">
              <table className="w-full min-w-max border-collapse text-xs">
                <thead>
                  <tr
                    className="border-b border-[#dde2e8] dark:border-[#334155] text-left text-gray-700 dark:text-gray-300"
                    style={{ backgroundColor: "var(--orange-havy-light)" }}
                  >
                    <th className="w-10 px-2.5 py-2.5 text-center font-medium">#</th>
                    <th className="px-3 py-2.5 font-medium w-48">Statutory Type</th>
                    <th className="px-3 py-2.5 font-medium w-60">ID No</th>
                    <th className="px-3 py-2.5 font-medium w-52">User ID</th>
                    <th className="px-3 py-2.5 font-medium w-48">Password</th>
                    <th className="px-3 py-2.5 font-medium w-48">Attachment</th>
                    <th className="w-10 px-2 py-2.5 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                  {statutoryRows.map((row, idx) => (
                    <tr key={row.key} className="bg-white dark:bg-[#1e293b]">
                      <td className="px-2.5 py-2 text-center text-gray-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-2 py-2">
                        {customStatutoryKeys[row.key] || (Boolean(row.type) && !STATUTORY_TYPES.includes(row.type)) ? (
                          <div className="relative flex items-center">
                            <input
                              id={`statutory-type-${row.key}`}
                              name={`statutoryType-${row.key}`}
                              aria-label={`Statutory ${idx + 1} Custom Type`}
                              type="text"
                              value={row.type === "__CUSTOM__" ? "" : row.type}
                              onChange={(e) => updateStatutoryRow(row.key, "type", e.target.value)}
                              placeholder="Enter custom type"
                              autoFocus
                              className="h-9 w-full rounded border border-[#31719B] bg-white dark:bg-[#0f172a] pl-2 pr-7 text-xs outline-none focus:ring-1 focus:ring-[#31719B]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setCustomStatutoryKeys((prev) => ({ ...prev, [row.key]: false }));
                                updateStatutoryRow(row.key, "type", "");
                              }}
                              className="absolute right-1.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                              title="Switch back to predefined list"
                              aria-label="Switch back to predefined list"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <select
                            id={`statutory-type-${row.key}`}
                            name={`statutoryType-${row.key}`}
                            aria-label={`Statutory ${idx + 1} Type`}
                            value={row.type}
                            onChange={(e) => {
                              if (e.target.value === "__CUSTOM__") {
                                setCustomStatutoryKeys((prev) => ({ ...prev, [row.key]: true }));
                                updateStatutoryRow(row.key, "type", "");
                              } else {
                                updateStatutoryRow(row.key, "type", e.target.value);
                              }
                            }}
                            className="h-9 w-full rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-2 text-xs outline-none focus:border-[#31719B] cursor-pointer"
                          >
                            <option value="">Select</option>
                            {STATUTORY_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                            <option value="__CUSTOM__" className="text-[#31719B] font-semibold">
                              + Custom Type
                            </option>
                          </select>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          id={`statutory-idno-${row.key}`}
                          name={`statutoryIdNo-${row.key}`}
                          aria-label={`Statutory ${idx + 1} ID Number`}
                          type="text"
                          value={row.idNo}
                          onChange={(e) => updateStatutoryRow(row.key, "idNo", e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setStatutoryRows((prev) => ensureTrailingEmptyStatutory(prev));
                            }
                          }}
                          placeholder="ID No"
                          className="h-9 w-full rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-2.5 text-xs font-mono outline-none focus:border-[#31719B]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          id={`statutory-userid-${row.key}`}
                          name={`statutoryUserId-${row.key}`}
                          aria-label={`Statutory ${idx + 1} User ID`}
                          type="text"
                          value={row.userId}
                          onChange={(e) => updateStatutoryRow(row.key, "userId", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setStatutoryRows((prev) => ensureTrailingEmptyStatutory(prev));
                            }
                          }}
                          placeholder="User ID"
                          className="h-9 w-full rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-2.5 text-xs outline-none focus:border-[#31719B]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="relative">
                          <input
                            id={`statutory-pw-${row.key}`}
                            name={`statutoryPassword-${row.key}`}
                            aria-label={`Statutory ${idx + 1} Password`}
                            type={showStatutoryPw[row.key] ? "text" : "password"}
                            value={row.password || ""}
                            onChange={(e) => updateStatutoryRow(row.key, "password", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                setStatutoryRows((prev) => ensureTrailingEmptyStatutory(prev));
                              }
                            }}
                            placeholder="Password"
                            className="h-9 w-full rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] pl-2.5 pr-7 text-xs outline-none focus:border-[#31719B]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowStatutoryPw(prev => ({ ...prev, [row.key]: !prev[row.key] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            title={showStatutoryPw[row.key] ? "Hide password" : "Show password"}
                            aria-label={showStatutoryPw[row.key] ? "Hide password" : "Show password"}
                          >
                            {showStatutoryPw[row.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <label
                          htmlFor={`statutory-file-${row.key}`}
                          className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-[#dde2e8] dark:border-[#475569] text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-[#31719B] hover:text-[#31719B] px-2 transition"
                        >
                          {uploadingStatutoryKey === row.key ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                              <span className="text-[11px] text-blue-600 font-semibold">Syncing...</span>
                            </>
                          ) : row.attachment ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span
                                className="truncate max-w-[110px] text-emerald-700 dark:text-emerald-400 font-medium"
                                title={row.attachment}
                              >
                                {row.attachment}
                              </span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Attach</span>
                            </>
                          )}
                          <input
                            id={`statutory-file-${row.key}`}
                            name={`statutoryFile-${row.key}`}
                            aria-label={`Statutory ${idx + 1} Attachment`}
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleStatutoryFileUpload(row.key, file);
                            }}
                            className="hidden"
                          />
                        </label>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {!isStatutoryRowEmpty(row) && (
                          <button
                            type="button"
                            onClick={() => removeStatutoryRow(row.key)}
                            className="p-1 text-gray-400 hover:text-[#e8655a] rounded cursor-pointer"
                            title="Remove line"
                            aria-label={`Remove statutory row ${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => setStatutoryRows((prev) => ensureTrailingEmptyStatutory(prev))}
              className="mt-1 text-xs font-semibold text-[#31719B] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Statutory Details</span>
            </button>
          </div>

          {/* Section C: Recurring Service Obtained */}
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Recurring Service Obtained
            </h3>
            <div className="overflow-x-auto rounded-lg border border-[#dde2e8] dark:border-[#334155]">
              <table className="w-full min-w-max border-collapse text-xs">
                <thead>
                  <tr
                    className="border-b border-[#dde2e8] dark:border-[#334155] text-left text-gray-700 dark:text-gray-300"
                    style={{ backgroundColor: "var(--orange-havy-light)" }}
                  >
                    <th className="w-10 px-2.5 py-2.5 text-center font-medium">#</th>
                    <th className="px-3 py-2.5 font-medium w-52">Service Category</th>
                    <th className="px-3 py-2.5 font-medium w-64">Service Name</th>
                    <th className="px-3 py-2.5 font-medium w-40 text-right pr-4">Tariff</th>
                    <th className="w-10 px-2 py-2.5 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dde2e8] dark:divide-[#334155]">
                  {recurringRows.map((row, idx) => (
                    <tr key={row.key} className="bg-white dark:bg-[#1e293b]">
                      <td className="px-2.5 py-2 text-center text-gray-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-2 py-2">
                        {/* Category: derived from store services or fallback to SERVICE_CATEGORIES */}
                        <select
                          id={`recurring-cat-${row.key}`}
                          name={`recurringCategory-${row.key}`}
                          aria-label={`Recurring Service ${idx + 1} Category`}
                          value={row.category}
                          onChange={(e) => {
                            updateRecurringRow(row.key, "category", e.target.value);
                            // reset service when category changes
                            updateRecurringRow(row.key, "service", "");
                            updateRecurringRow(row.key, "tariff", "0.00");
                          }}
                          className="h-9 w-full rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-2 text-xs outline-none focus:border-[#31719B] cursor-pointer"
                        >
                          <option value="">Select</option>
                          {/* Merge store categories with static fallback */}
                          {Array.from(
                            new Set([
                              ...storeServices.map((s) => s.category),
                              ...SERVICE_CATEGORIES,
                            ])
                          ).map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        {/* Service Name: searchable dropdown from store filtered by selected category */}
                        <ServiceSearchDropdown
                          id={`recurring-srv-${row.key}`}
                          name={`recurringService-${row.key}`}
                          aria-label={`Recurring Service ${idx + 1} Service Name`}
                          value={row.service}
                          services={storeServices}
                          loadingServices={servicesLoading}
                          loadingMoreServices={servicesLoadingMore}
                          isLoaded={servicesLoaded}
                          hasMoreServices={hasMoreServices}
                          onFetchServices={handleFetchServices}
                          onLoadMoreServices={handleLoadMoreServices}
                          filterCategory={row.category || undefined}
                          onSelect={(svc) => {
                            updateRecurringRow(row.key, "category", svc.category);
                            updateRecurringRow(row.key, "service", svc.name);
                            updateRecurringRow(row.key, "tariff", String(svc.totalServiceFee ?? "0.00"));
                          }}
                          onClear={() => {
                            updateRecurringRow(row.key, "service", "");
                            updateRecurringRow(row.key, "tariff", "0.00");
                          }}
                          placeholder="Select Service"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          id={`recurring-tariff-${row.key}`}
                          name={`recurringTariff-${row.key}`}
                          aria-label={`Recurring Service ${idx + 1} Tariff`}
                          type="text"
                          value={row.tariff}
                          onChange={(e) => updateRecurringRow(row.key, "tariff", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setRecurringRows((prev) => ensureTrailingEmptyRecurring(prev));
                            }
                          }}
                          placeholder="0.00"
                          className="h-9 w-full rounded border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-2.5 text-xs text-right font-mono outline-none focus:border-[#31719B]"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        {!isRecurringRowEmpty(row) && (
                          <button
                            type="button"
                            onClick={() => removeRecurringRow(row.key)}
                            className="p-1 text-gray-400 hover:text-[#e8655a] rounded cursor-pointer"
                            title="Remove line"
                            aria-label={`Remove recurring service row ${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => setRecurringRows((prev) => ensureTrailingEmptyRecurring(prev))}
              className="mt-1 text-xs font-semibold text-[#31719B] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Recurring Service</span>
            </button>
          </div>

          {/* Form Actions (Cancel / Save) */}
          <div className="mt-8 pt-4 border-t border-[#dde2e8] dark:border-[#334155] flex flex-col sm:flex-row items-center justify-between gap-4">
            {Object.keys(errors).length > 0 ? (
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Please address the {Object.keys(errors).length} required field error{Object.keys(errors).length > 1 ? "s" : ""} above before saving.
                </span>
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Fields marked with <span className="text-[#e8655a] font-bold">*</span> are required.
              </div>
            )}

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCancelAttempt}
                disabled={isSubmitting}
                className="h-11 rounded-md border border-[#31719B] bg-white dark:bg-[#1e293b] px-6 text-sm font-semibold text-[#31719B] transition-colors hover:bg-[#31719B]/5 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-md px-7 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60 flex items-center gap-2"
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--premium-blue-light)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--premium-blue-dark)")
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Client...</span>
                  </>
                ) : (
                  <span>{isEditing ? "Save Changes" : "Save Client"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* GSTIN Autofill Dialog */}
      {showGstinModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl shadow-2xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-hidden">
            <div
              className="px-6 py-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between"
              style={{ backgroundColor: "var(--orange-havy-light)" }}
            >
              <h3 className="text-base font-bold text-[#000000] dark:text-white">
                Enter GST Number
              </h3>
              <button
                type="button"
                onClick={() => setShowGstinModal(false)}
                className="p-1 rounded-lg text-gray-500 hover:text-black dark:hover:text-white"
                aria-label="Close GST dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="cf-gstin-modal-input" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                  GSTIN
                </label>
                <input
                  id="cf-gstin-modal-input"
                  name="gstinInput"
                  aria-label="Enter GSTIN Number"
                  type="text"
                  autoFocus
                  maxLength={15}
                  value={gstinInput}
                  onChange={(e) => {
                    setGstinInput(e.target.value.toUpperCase());
                    if (gstinError) setGstinError("");
                  }}
                  placeholder="e.g. 24AAKCA1234F1Z5"
                  className="h-12 w-full rounded-md border border-[#dde2e8] dark:border-[#475569] bg-white dark:bg-[#0f172a] px-3.5 text-sm uppercase font-mono text-[#000000] dark:text-white outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  The client details will be autofilled.
                </p>
                {gstinError && (
                  <p className="mt-1 text-xs text-[#e8655a] font-medium">
                    {gstinError}
                  </p>
                )}
              </div>

              {/* Sample Quick Buttons */}
              <div className="pt-1">
                <span className="text-[11px] text-gray-400 font-medium block mb-1.5">
                  Click to test with sample numbers:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGstinInput("24AAKCA1234F1Z5");
                      handleAutofillGstin("24AAKCA1234F1Z5");
                    }}
                    className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold bg-gray-100 dark:bg-gray-800 text-[#31719B] hover:underline"
                  >
                    24AAKCA1234F1Z5 (Gujarat)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGstinInput("27AABFV5678K1ZP");
                      handleAutofillGstin("27AABFV5678K1ZP");
                    }}
                    className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold bg-gray-100 dark:bg-gray-800 text-[#31719B] hover:underline"
                  >
                    27AABFV5678K1ZP (Mumbai)
                  </button>
                </div>
              </div>
            </div>

            <div
              className="px-6 py-4 border-t border-[#dde2e8] dark:border-[#334155] flex items-center justify-end gap-3"
              style={{ backgroundColor: "var(--orange-havy-light)" }}
            >
              <button
                type="button"
                onClick={() => setShowGstinModal(false)}
                className="h-10 rounded-md bg-[#e9ebee] dark:bg-[#334155] px-4 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-[#dcdfe3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAutofillGstin()}
                className="h-10 rounded-md px-5 text-xs font-semibold text-white shadow-xs"
                style={{ backgroundColor: "var(--premium-blue-dark)" }}
              >
                Autofill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Confirmation Modal */}
      <DiscardConfirmationModal
        isOpen={showDiscardModal}
        onKeepEditing={() => setShowDiscardModal(false)}
        onDiscard={() => {
          setShowDiscardModal(false);
          onCancel();
        }}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to close?"
      />
    </div>
  );
};
