import { Types } from 'mongoose';
import { ISoftDeleteDocument } from '../../shared/plugins/softDelete.plugin';

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

export interface ICategoryMeta {
  key: DocumentCategory;
  label: string;
  folderName: string;
  description: string;
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  icon: string;
  color: string;
}

export const CATEGORY_DEFINITIONS: Record<DocumentCategory, ICategoryMeta> = {
  [DocumentCategory.TAX_RETURNS]: {
    key: DocumentCategory.TAX_RETURNS,
    label: 'Tax & GST Filings',
    folderName: '01_Tax_and_GST_Filings',
    description: 'Income Tax computations, GST returns (GSTR-1, 3B, 9), TDS challans, and tax acknowledgements.',
    allowedExtensions: ['.pdf', '.xlsx', '.xls', '.csv', '.json', '.zip'],
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/json',
      'application/zip',
      'application/x-zip-compressed',
    ],
    icon: 'FileSpreadsheet',
    color: 'emerald',
  },
  [DocumentCategory.AUDIT_FINANCIALS]: {
    key: DocumentCategory.AUDIT_FINANCIALS,
    label: 'Audited Financials',
    folderName: '02_Audited_Financials',
    description: 'Balance sheets, Profit & Loss accounts, Statutory Audit reports, and Tax Audit (Form 3CD).',
    allowedExtensions: ['.pdf', '.xlsx', '.xls', '.docx', '.doc'],
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ],
    icon: 'TrendingUp',
    color: 'blue',
  },
  [DocumentCategory.INVOICES_BILLING]: {
    key: DocumentCategory.INVOICES_BILLING,
    label: 'Invoices & Receipts',
    folderName: '03_Invoices_and_Billing',
    description: 'Client invoices, professional fee debit notes, payment vouchers, and vendor bills.',
    allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg', '.webp'],
    allowedMimeTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
    ],
    icon: 'Receipt',
    color: 'amber',
  },
  [DocumentCategory.COMPLIANCE_MCA]: {
    key: DocumentCategory.COMPLIANCE_MCA,
    label: 'MCA & ROC Compliance',
    folderName: '04_MCA_and_ROC_Compliance',
    description: 'ROC e-forms (AOC-4, MGT-7, DIR-3 KYC), Incorporation certificates, and Board Resolutions.',
    allowedExtensions: ['.pdf', '.zip', '.xml'],
    allowedMimeTypes: [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/xml',
      'text/xml',
    ],
    icon: 'ShieldCheck',
    color: 'purple',
  },
  [DocumentCategory.KYC_IDENTITY]: {
    key: DocumentCategory.KYC_IDENTITY,
    label: 'KYC & Identity Proofs',
    folderName: '05_KYC_and_Identity_Proofs',
    description: 'PAN cards, Aadhaar cards, Passports, Driving Licenses, MOA/AOA, and Partnership Deeds.',
    allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg', '.webp'],
    allowedMimeTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
    ],
    icon: 'UserCheck',
    color: 'teal',
  },
  [DocumentCategory.LEGAL_CONTRACTS]: {
    key: DocumentCategory.LEGAL_CONTRACTS,
    label: 'Legal & Engagement',
    folderName: '06_Legal_and_Engagement',
    description: 'CA Engagement letters, Non-Disclosure Agreements (NDA), Power of Attorney, and Service contracts.',
    allowedExtensions: ['.pdf', '.docx', '.doc'],
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ],
    icon: 'Scale',
    color: 'rose',
  },
  [DocumentCategory.WORKPAPERS]: {
    key: DocumentCategory.WORKPAPERS,
    label: 'Audit Workpapers',
    folderName: '07_Audit_Workpapers',
    description: 'Reconciliations, internal audit schedules, trial balance drafts, and verification check-sheets.',
    allowedExtensions: ['.xlsx', '.xls', '.csv', '.pdf', '.docx', '.zip'],
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/x-zip-compressed',
    ],
    icon: 'Layers',
    color: 'indigo',
  },
  [DocumentCategory.GENERAL]: {
    key: DocumentCategory.GENERAL,
    label: 'General Documents',
    folderName: '08_General_Documents',
    description: 'General correspondence, advisory notes, and miscellaneous client work items.',
    allowedExtensions: ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.txt'],
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'image/png',
      'image/jpeg',
      'text/plain',
    ],
    icon: 'Folder',
    color: 'slate',
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

export interface IDocument {
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
  clientId?: Types.ObjectId | null;
  clientName?: string;
  leadId?: Types.ObjectId | null;
  tags: string[];
  uploadedBy: string;
  storageProvider: 'google-drive' | 'local-fallback';
  verification: IVerificationResult;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDocumentDocument extends IDocument, ISoftDeleteDocument {}

export interface IDocumentUploadInput {
  category: DocumentCategory;
  description?: string;
  clientId?: string;
  clientName?: string;
  subFolder?: string;
  customFileName?: string;
  taskId?: string;
  leadId?: string;
  tags?: string[];
  uploadedBy?: string;
}

export interface IDriveStatusResponse {
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
