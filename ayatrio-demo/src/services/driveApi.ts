import { request, ApiResponse, API_BASE_URL } from './apiClient';

export enum DocumentCategory {
  TAX_RETURNS = 'TAX_RETURNS',
  AUDIT_FINANCIALS = 'AUDIT_FINANCIALS',
  INVOICES_BILLING = 'INVOICES_BILLING',
  COMPLIANCE_MCA = 'COMPLIANCE_MCA',
  KYC_IDENTITY = 'KYC_IDENTITY',
  LEGAL_CONTRACTS = 'LEGAL_CONTRACTS',
  WORKPAPERS = 'WORKPAPERS',
  GENERAL = 'GENERAL',
}

export interface ICategoryInfo {
  key: DocumentCategory;
  label: string;
  folderName: string;
  description: string;
  allowedExtensions: string[];
  icon: string;
  badgeBg: string;
  badgeText: string;
}

export const CATEGORY_MAP: Record<DocumentCategory, ICategoryInfo> = {
  [DocumentCategory.TAX_RETURNS]: {
    key: DocumentCategory.TAX_RETURNS,
    label: 'Tax & GST Filings',
    folderName: '01_Tax_and_GST_Filings',
    description: 'Income Tax computations, GST returns, TDS challans, and acknowledgements',
    allowedExtensions: ['.pdf', '.xlsx', '.xls', '.csv', '.json', '.zip'],
    icon: 'FileSpreadsheet',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
  },
  [DocumentCategory.AUDIT_FINANCIALS]: {
    key: DocumentCategory.AUDIT_FINANCIALS,
    label: 'Audited Financials',
    folderName: '02_Audited_Financials',
    description: 'Balance sheets, Profit & Loss accounts, and Statutory Audit reports',
    allowedExtensions: ['.pdf', '.xlsx', '.xls', '.docx', '.doc'],
    icon: 'TrendingUp',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    badgeText: 'text-blue-700 dark:text-blue-300',
  },
  [DocumentCategory.INVOICES_BILLING]: {
    key: DocumentCategory.INVOICES_BILLING,
    label: 'Invoices & Receipts',
    folderName: '03_Invoices_and_Billing',
    description: 'Client invoices, professional debit notes, fee receipts, and payment proofs',
    allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg', '.webp'],
    icon: 'Receipt',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  [DocumentCategory.COMPLIANCE_MCA]: {
    key: DocumentCategory.COMPLIANCE_MCA,
    label: 'MCA & ROC Compliance',
    folderName: '04_MCA_and_ROC_Compliance',
    description: 'ROC e-forms, Company Incorporation, and Board Resolutions',
    allowedExtensions: ['.pdf', '.zip', '.xml'],
    icon: 'ShieldCheck',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    badgeText: 'text-purple-700 dark:text-purple-300',
  },
  [DocumentCategory.KYC_IDENTITY]: {
    key: DocumentCategory.KYC_IDENTITY,
    label: 'KYC & Identity Proofs',
    folderName: '05_KYC_and_Identity_Proofs',
    description: 'PAN cards, Aadhaar cards, Passports, MOA/AOA, and Partnership Deeds',
    allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg', '.webp'],
    icon: 'UserCheck',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    badgeText: 'text-teal-700 dark:text-teal-300',
  },
  [DocumentCategory.LEGAL_CONTRACTS]: {
    key: DocumentCategory.LEGAL_CONTRACTS,
    label: 'Legal & Engagement',
    folderName: '06_Legal_and_Engagement',
    description: 'CA Engagement letters, Non-Disclosure Agreements (NDA), and Power of Attorney',
    allowedExtensions: ['.pdf', '.docx', '.doc'],
    icon: 'Scale',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    badgeText: 'text-rose-700 dark:text-rose-300',
  },
  [DocumentCategory.WORKPAPERS]: {
    key: DocumentCategory.WORKPAPERS,
    label: 'Audit Workpapers',
    folderName: '07_Audit_Workpapers',
    description: 'Audit schedules, bank reconciliations, trial balances, and work drafts',
    allowedExtensions: ['.xlsx', '.xls', '.csv', '.pdf', '.docx', '.zip'],
    icon: 'Layers',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
  },
  [DocumentCategory.GENERAL]: {
    key: DocumentCategory.GENERAL,
    label: 'General Documents',
    folderName: '08_General_Documents',
    description: 'Advisory notes, client communications, and miscellaneous files',
    allowedExtensions: ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.txt'],
    icon: 'Folder',
    badgeBg: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
  },
};

export interface IVerificationChecks {
  safeExtension: boolean;
  magicByteMatch: boolean;
  sizeLimitOk: boolean;
  nonEmpty: boolean;
  categoryAllowed: boolean;
  executableScanClean: boolean;
}

export interface IVerificationResult {
  passed: boolean;
  sanitizedFileName: string;
  fileExtension: string;
  detectedMime: string;
  claimedMime: string;
  magicBytesHex: string;
  fileSizeBytes: number;
  checks: IVerificationChecks;
  reasons: string[];
}

export interface IDocumentItem {
  _id: string;
  id?: string;
  fileName: string;
  sanitizedFileName: string;
  category: DocumentCategory;
  driveFileId: string;
  driveFolderId: string;
  webViewLink?: string;
  webContentLink?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  mimeType: string;
  size: number;
  checksum: string;
  description?: string;
  clientId?: string;
  clientName?: string;
  leadId?: string;
  tags: string[];
  uploadedBy: string;
  storageProvider: 'google-drive' | 'local-fallback';
  verification: IVerificationResult;
  createdAt: string;
  updatedAt: string;
}

export interface IDriveStats {
  totalDocuments: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  categories: Array<{
    category: DocumentCategory;
    label: string;
    description: string;
    folderName: string;
    icon: string;
    color: string;
    count: number;
    sizeBytes: number;
    sizeFormatted: string;
  }>;
}

export interface IDriveStatus {
  isConfigured: boolean;
  provider: 'google-drive' | 'local-fallback';
  parentFolderId: string;
  activeCategoriesCount: number;
  message: string;
  userEmail?: string;
  quota?: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
  };
}

export interface DriveQueryParams {
  page?: number;
  limit?: number;
  category?: DocumentCategory;
  search?: string;
  clientId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: IDocumentItem[];
  pagination: {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  categoryCounts: Record<string, number>;
}

export const driveApi = {
  getDocuments: async (params: DriveQueryParams = {}): Promise<DocumentsResponse> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.category) searchParams.set('category', params.category);
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.clientId) searchParams.set('clientId', params.clientId);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/drive${query ? `?${query}` : ''}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch documents (${res.status})`);
    }
    return (await res.json()) as DocumentsResponse;
  },

  uploadDocument: async (formData: FormData): Promise<ApiResponse<IDocumentItem>> => {
    return request<IDocumentItem>('/drive/upload', {
      method: 'POST',
      body: formData,
    });
  },

  verifyDocumentOnly: async (formData: FormData): Promise<ApiResponse<IVerificationResult>> => {
    return request<IVerificationResult>('/drive/verify', {
      method: 'POST',
      body: formData,
    });
  },

  deleteDocument: async (id: string): Promise<ApiResponse<null>> => {
    return request<null>(`/drive/${id}`, {
      method: 'DELETE',
    });
  },

  getStats: async (): Promise<ApiResponse<IDriveStats>> => {
    return request<IDriveStats>('/drive/stats');
  },

  getStatus: async (): Promise<ApiResponse<IDriveStatus>> => {
    return request<IDriveStatus>('/drive/status');
  },

  getDownloadUrl: (id: string): string => {
    return `${API_BASE_URL}/drive/${id}/download`;
  },

  getPreviewUrl: (idOrDriveFileId: string): string => {
    return `${API_BASE_URL}/drive/${idOrDriveFileId}/preview`;
  },
};
