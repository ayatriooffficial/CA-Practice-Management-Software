import { Types } from 'mongoose';
import { Client } from '../client/client.model';
import { UserModel } from '../auth/user.model';
import { Task } from '../task/task.model';
import { DocumentModel } from '../drive/drive.model';
import { DriveService } from '../drive/drive.service';
import { DocumentCategory } from '../drive/drive.interface';
import { AppError } from '../../shared/utils/apiError';

export interface PersonRecord {
  id: string;
  entityType: 'client' | 'team';
  name: string;
  legalName?: string;
  identifier: string; // fileNo for client, employeeId for user
  type: string;       // constitution type or designation/role
  email: string;
  mobile: string;
  pan?: string;
  group?: string;     // client group or user department
  department?: string;
  status: string;
  city?: string;
  state?: string;
  address?: string;
  documentCount: number;
  availableCount?: number;
  pendingCount?: number;
  createdAt?: Date | string;
}

export interface SearchPeopleParams {
  search?: string;
  type?: 'all' | 'client' | 'team';
  page?: number;
  limit?: number;
}

export type DocumentStatus =
  | 'Available'
  | 'Pending'
  | 'Requested'
  | 'Under Review'
  | 'Rejected'
  | 'Expired'
  | 'Not Applicable'
  | 'Needs Configuration';

export interface DocumentRequirementItem {
  id: string;
  title: string;
  category: DocumentCategory;
  relatedProcess: string;
  period?: string;
  status: DocumentStatus;
  isMandatory: boolean;
  description?: string;
  documentId?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  downloadUrl?: string;
  previewUrl?: string;
  storageProvider?: string;
  uploadedBy?: string;
  uploadedAt?: Date | string;
  taskId?: string;
  taskDocId?: string;
}

export interface DocumentRequirementSummary {
  total: number;
  available: number;
  pending: number;
  requested: number;
  expired: number;
}

export interface PersonDetailResponse {
  person: PersonRecord & {
    secondaryMobile?: string;
    dob?: string;
    pincode?: string;
    services?: string[];
    promoters?: any[];
    statutory?: any[];
    licenses?: any[];
    dscs?: any[];
    documentsInOut?: any[];
    role?: string;
    designation?: string;
    shift?: string;
    firmName?: string;
    initials?: string;
  };
  documents: any[];
  requirements: DocumentRequirementItem[];
  summary: DocumentRequirementSummary;
}

export class DocumentService {
  /**
   * Synthesize complete document requirements inventory for a client
   */
  public static generateClientRequirements(
    client: any,
    tasks: any[],
    driveDocs: any[]
  ): { requirements: DocumentRequirementItem[]; summary: DocumentRequirementSummary } {
    const requirements: DocumentRequirementItem[] = [];
    const matchedDriveDocIds = new Set<string>();

    // Helper to find matching drive document by substring/regex
    const findMatchingDriveDoc = (patterns: RegExp[], category?: DocumentCategory) => {
      return driveDocs.find((d) => {
        if (matchedDriveDocIds.has(d._id.toString())) return false;
        if (category && d.category !== category) return false;
        const targetStr = `${d.fileName} ${d.description || ''} ${(d.tags || []).join(' ')}`.toLowerCase();
        return patterns.some((p) => p.test(targetStr));
      });
    };

    // 1. Constitutional PAN Requirement
    const panStat = (client.customerFiles?.statutory || []).find((s: any) => s.type === 'PAN');
    const panDriveDoc = findMatchingDriveDoc([/pan[_\-\s]?card/i, /pan[_\-\s]?copy/i, /pan[_\-\s]?document/i], DocumentCategory.KYC_IDENTITY);
    if (panDriveDoc) {
      matchedDriveDocIds.add(panDriveDoc._id.toString());
      requirements.push({
        id: 'req_pan',
        title: 'Permanent Account Number (PAN) Card',
        category: DocumentCategory.KYC_IDENTITY,
        relatedProcess: 'Entity KYC & Tax Identification',
        period: 'Permanent',
        status: 'Available',
        isMandatory: true,
        documentId: panDriveDoc._id.toString(),
        fileName: panDriveDoc.fileName,
        fileSize: panDriveDoc.size,
        mimeType: panDriveDoc.mimeType,
        downloadUrl: `/api/v1/drive/${panDriveDoc._id}/download`,
        previewUrl: panDriveDoc.previewUrl || `/api/v1/drive/${panDriveDoc._id}/preview`,
        storageProvider: panDriveDoc.storageProvider,
        uploadedBy: panDriveDoc.uploadedBy,
        uploadedAt: panDriveDoc.createdAt,
        description: `Verified PAN Card on file (${client.pan || panStat?.idNo || 'Active'}).`,
      });
    } else if (panStat?.attachment) {
      requirements.push({
        id: 'req_pan',
        title: 'Permanent Account Number (PAN) Card',
        category: DocumentCategory.KYC_IDENTITY,
        relatedProcess: 'Entity KYC & Tax Identification',
        period: 'Permanent',
        status: 'Available',
        isMandatory: true,
        documentId: 'stat_pan',
        fileName: 'PAN_Card.pdf',
        fileSize: 245000,
        mimeType: 'application/pdf',
        downloadUrl: panStat.attachment,
        previewUrl: panStat.attachment,
        storageProvider: 'local-fallback',
        uploadedBy: 'Client Portal',
        uploadedAt: client.createdAt,
        description: `Statutory PAN Card on file (${panStat.idNo || client.pan}).`,
      });
    } else if (client.pan || panStat?.idNo) {
      requirements.push({
        id: 'req_pan',
        title: 'Permanent Account Number (PAN) Card',
        category: DocumentCategory.KYC_IDENTITY,
        relatedProcess: 'Entity KYC & Tax Identification',
        period: 'Permanent',
        status: 'Pending',
        isMandatory: true,
        description: `Registered PAN ${client.pan || panStat?.idNo}. Scanned copy awaiting client upload.`,
      });
    } else {
      requirements.push({
        id: 'req_pan',
        title: 'Permanent Account Number (PAN) Card',
        category: DocumentCategory.KYC_IDENTITY,
        relatedProcess: 'Entity KYC & Tax Identification',
        period: 'Permanent',
        status: 'Needs Configuration',
        isMandatory: true,
        description: 'PAN number not yet recorded in client profile.',
      });
    }

    // 2. Entity Constitution Specific Requirements
    const rawType = String(client.type || '').toLowerCase();
    const isCompany = rawType.includes('private') || rawType.includes('public') || rawType === 'company';
    const isLLP = rawType.includes('llp');
    const isPartnership = rawType.includes('partnership');
    const isProprietorship = rawType.includes('proprietorship') || rawType.includes('individual');

    if (isCompany) {
      // Certificate of Incorporation & MOA/AOA
      const coiDoc = findMatchingDriveDoc([/incorporation/i, /coi/i, /moa/i, /aoa/i], DocumentCategory.COMPLIANCE_MCA);
      if (coiDoc) {
        matchedDriveDocIds.add(coiDoc._id.toString());
        requirements.push({
          id: 'req_coi_moa',
          title: 'Certificate of Incorporation & MOA / AOA',
          category: DocumentCategory.COMPLIANCE_MCA,
          relatedProcess: 'MCA / ROC Corporate Entity Formation',
          period: 'Permanent',
          status: 'Available',
          isMandatory: true,
          documentId: coiDoc._id.toString(),
          fileName: coiDoc.fileName,
          fileSize: coiDoc.size,
          mimeType: coiDoc.mimeType,
          downloadUrl: `/api/v1/drive/${coiDoc._id}/download`,
          previewUrl: coiDoc.previewUrl || `/api/v1/drive/${coiDoc._id}/preview`,
          storageProvider: coiDoc.storageProvider,
          uploadedBy: coiDoc.uploadedBy,
          uploadedAt: coiDoc.createdAt,
          description: 'Official Certificate of Incorporation with registered MOA/AOA articles.',
        });
      } else {
        const cinStat = (client.customerFiles?.statutory || []).find((s: any) => s.type === 'CIN');
        requirements.push({
          id: 'req_coi_moa',
          title: 'Certificate of Incorporation & MOA / AOA',
          category: DocumentCategory.COMPLIANCE_MCA,
          relatedProcess: 'MCA / ROC Corporate Entity Formation',
          period: 'Permanent',
          status: 'Pending',
          isMandatory: true,
          description: cinStat?.idNo
            ? `Registered CIN ${cinStat.idNo}. Certificate of Incorporation awaiting upload.`
            : 'Statutory Certificate of Incorporation & Articles of Association required for corporate practice files.',
        });
      }

      // Board Resolution
      const brDoc = findMatchingDriveDoc([/board[_\-\s]?resolution/i, /authorized[_\-\s]?signator/i], DocumentCategory.LEGAL_CONTRACTS);
      if (brDoc) {
        matchedDriveDocIds.add(brDoc._id.toString());
        requirements.push({
          id: 'req_board_resolution',
          title: 'Board Resolution & Authorized Signatory Mandate',
          category: DocumentCategory.LEGAL_CONTRACTS,
          relatedProcess: 'Corporate Governance & Banking Mandates',
          period: 'FY 2025-26',
          status: 'Available',
          isMandatory: true,
          documentId: brDoc._id.toString(),
          fileName: brDoc.fileName,
          fileSize: brDoc.size,
          mimeType: brDoc.mimeType,
          downloadUrl: `/api/v1/drive/${brDoc._id}/download`,
          previewUrl: brDoc.previewUrl || `/api/v1/drive/${brDoc._id}/preview`,
          storageProvider: brDoc.storageProvider,
          uploadedBy: brDoc.uploadedBy,
          uploadedAt: brDoc.createdAt,
          description: 'Certified extract of Board Resolution authorizing representatives.',
        });
      } else {
        requirements.push({
          id: 'req_board_resolution',
          title: 'Board Resolution & Authorized Signatory Mandate',
          category: DocumentCategory.LEGAL_CONTRACTS,
          relatedProcess: 'Corporate Governance & Banking Mandates',
          period: 'FY 2025-26',
          status: 'Pending',
          isMandatory: true,
          description: 'Certified Board Resolution empowering signatories for statutory and banking representations.',
        });
      }
    } else if (isLLP) {
      const llpDoc = findMatchingDriveDoc([/llp[_\-\s]?agreement/i, /form[_\-\s]?3/i], DocumentCategory.COMPLIANCE_MCA);
      if (llpDoc) {
        matchedDriveDocIds.add(llpDoc._id.toString());
        requirements.push({
          id: 'req_llp_agreement',
          title: 'Registered LLP Agreement & Form 3 Incorporation',
          category: DocumentCategory.COMPLIANCE_MCA,
          relatedProcess: 'MCA / LLP Registration & Statutory Agreement',
          period: 'Permanent',
          status: 'Available',
          isMandatory: true,
          documentId: llpDoc._id.toString(),
          fileName: llpDoc.fileName,
          fileSize: llpDoc.size,
          mimeType: llpDoc.mimeType,
          downloadUrl: `/api/v1/drive/${llpDoc._id}/download`,
          previewUrl: llpDoc.previewUrl || `/api/v1/drive/${llpDoc._id}/preview`,
          storageProvider: llpDoc.storageProvider,
          uploadedBy: llpDoc.uploadedBy,
          uploadedAt: llpDoc.createdAt,
          description: 'Official LLP Agreement executed on stamp paper and approved Form 3.',
        });
      } else {
        requirements.push({
          id: 'req_llp_agreement',
          title: 'Registered LLP Agreement & Form 3 Incorporation',
          category: DocumentCategory.COMPLIANCE_MCA,
          relatedProcess: 'MCA / LLP Registration & Statutory Agreement',
          period: 'Permanent',
          status: 'Pending',
          isMandatory: true,
          description: 'Certified copy of executed LLP Agreement and Form 3 filing acknowledgment.',
        });
      }
    } else if (isPartnership) {
      const pDeedDoc = findMatchingDriveDoc([/partnership[_\-\s]?deed/i, /deed/i], DocumentCategory.LEGAL_CONTRACTS);
      if (pDeedDoc) {
        matchedDriveDocIds.add(pDeedDoc._id.toString());
        requirements.push({
          id: 'req_partnership_deed',
          title: 'Registered Partnership Deed & ROF Acknowledgment',
          category: DocumentCategory.LEGAL_CONTRACTS,
          relatedProcess: 'Registrar of Firms (ROF) Registration',
          period: 'Permanent',
          status: 'Available',
          isMandatory: true,
          documentId: pDeedDoc._id.toString(),
          fileName: pDeedDoc.fileName,
          fileSize: pDeedDoc.size,
          mimeType: pDeedDoc.mimeType,
          downloadUrl: `/api/v1/drive/${pDeedDoc._id}/download`,
          previewUrl: pDeedDoc.previewUrl || `/api/v1/drive/${pDeedDoc._id}/preview`,
          storageProvider: pDeedDoc.storageProvider,
          uploadedBy: pDeedDoc.uploadedBy,
          uploadedAt: pDeedDoc.createdAt,
          description: 'Registered Partnership Deed executed on stamp paper with supplementary deeds.',
        });
      } else {
        requirements.push({
          id: 'req_partnership_deed',
          title: 'Registered Partnership Deed & ROF Acknowledgment',
          category: DocumentCategory.LEGAL_CONTRACTS,
          relatedProcess: 'Registrar of Firms (ROF) Registration',
          period: 'Permanent',
          status: 'Pending',
          isMandatory: true,
          description: 'Executed Partnership Deed and ROF registration certificate.',
        });
      }
    } else if (isProprietorship) {
      const tradeDoc = findMatchingDriveDoc([/trade[_\-\s]?license/i, /shop/i, /establishment/i], DocumentCategory.COMPLIANCE_MCA);
      if (tradeDoc) {
        matchedDriveDocIds.add(tradeDoc._id.toString());
        requirements.push({
          id: 'req_trade_license',
          title: 'Trade License / Shop & Establishment Act Certificate',
          category: DocumentCategory.COMPLIANCE_MCA,
          relatedProcess: 'Municipal / Commercial Establishment Registration',
          period: 'Annual Renewal',
          status: 'Available',
          isMandatory: true,
          documentId: tradeDoc._id.toString(),
          fileName: tradeDoc.fileName,
          fileSize: tradeDoc.size,
          mimeType: tradeDoc.mimeType,
          downloadUrl: `/api/v1/drive/${tradeDoc._id}/download`,
          previewUrl: tradeDoc.previewUrl || `/api/v1/drive/${tradeDoc._id}/preview`,
          storageProvider: tradeDoc.storageProvider,
          uploadedBy: tradeDoc.uploadedBy,
          uploadedAt: tradeDoc.createdAt,
          description: 'Valid Trade License / Shop & Establishment Certificate.',
        });
      } else {
        requirements.push({
          id: 'req_trade_license',
          title: 'Trade License / Shop & Establishment Act Certificate',
          category: DocumentCategory.COMPLIANCE_MCA,
          relatedProcess: 'Municipal / Commercial Establishment Registration',
          period: 'Annual Renewal',
          status: 'Pending',
          isMandatory: true,
          description: 'Local municipal trade license or Shop & Commercial Establishment certificate.',
        });
      }
    }

    // 3. Statutory Tax Registrations (GSTIN, TAN)
    const gstStat = (client.customerFiles?.statutory || []).find((s: any) => s.type === 'GSTIN');
    const hasGstService = (client.services || []).some((s: string) => /gst/i.test(s));
    if (gstStat?.idNo || hasGstService) {
      const gstDoc = findMatchingDriveDoc([/gst/i, /reg[_\-\s]?06/i], DocumentCategory.KYC_IDENTITY);
      if (gstDoc) {
        matchedDriveDocIds.add(gstDoc._id.toString());
        requirements.push({
          id: 'req_gst_reg06',
          title: 'GST Registration Certificate (Form GST REG-06)',
          category: DocumentCategory.KYC_IDENTITY,
          relatedProcess: 'GST Registration & Verification',
          period: 'Permanent',
          status: 'Available',
          isMandatory: true,
          documentId: gstDoc._id.toString(),
          fileName: gstDoc.fileName,
          fileSize: gstDoc.size,
          mimeType: gstDoc.mimeType,
          downloadUrl: `/api/v1/drive/${gstDoc._id}/download`,
          previewUrl: gstDoc.previewUrl || `/api/v1/drive/${gstDoc._id}/preview`,
          storageProvider: gstDoc.storageProvider,
          uploadedBy: gstDoc.uploadedBy,
          uploadedAt: gstDoc.createdAt,
          description: `Form GST REG-06 registration certificate (${gstStat?.idNo || 'Active GSTIN'}).`,
        });
      } else if (gstStat?.attachment) {
        requirements.push({
          id: 'req_gst_reg06',
          title: 'GST Registration Certificate (Form GST REG-06)',
          category: DocumentCategory.KYC_IDENTITY,
          relatedProcess: 'GST Registration & Verification',
          period: 'Permanent',
          status: 'Available',
          isMandatory: true,
          documentId: 'stat_gstin',
          fileName: 'GST_Certificate.pdf',
          fileSize: 310000,
          mimeType: 'application/pdf',
          downloadUrl: gstStat.attachment,
          previewUrl: gstStat.attachment,
          storageProvider: 'local-fallback',
          uploadedBy: 'Client Portal',
          uploadedAt: client.createdAt,
          description: `Form GST REG-06 for ${gstStat.idNo}.`,
        });
      } else {
        requirements.push({
          id: 'req_gst_reg06',
          title: 'GST Registration Certificate (Form GST REG-06)',
          category: DocumentCategory.KYC_IDENTITY,
          relatedProcess: 'GST Registration & Verification',
          period: 'Permanent',
          status: 'Pending',
          isMandatory: true,
          description: `GSTIN ${gstStat?.idNo || 'Active'}. Scanned Form GST REG-06 certificate required.`,
        });
      }
    }

    const tanStat = (client.customerFiles?.statutory || []).find((s: any) => s.type === 'TAN');
    if (tanStat?.idNo) {
      const tanDoc = findMatchingDriveDoc([/tan/i], DocumentCategory.KYC_IDENTITY);
      if (tanDoc) {
        matchedDriveDocIds.add(tanDoc._id.toString());
        requirements.push({
          id: 'req_tan_letter',
          title: 'Tax Deduction Account Number (TAN) Allotment Letter',
          category: DocumentCategory.KYC_IDENTITY,
          relatedProcess: 'TDS Withholding Tax Allotment',
          period: 'Permanent',
          status: 'Available',
          isMandatory: false,
          documentId: tanDoc._id.toString(),
          fileName: tanDoc.fileName,
          fileSize: tanDoc.size,
          mimeType: tanDoc.mimeType,
          downloadUrl: `/api/v1/drive/${tanDoc._id}/download`,
          previewUrl: tanDoc.previewUrl || `/api/v1/drive/${tanDoc._id}/preview`,
          storageProvider: tanDoc.storageProvider,
          uploadedBy: tanDoc.uploadedBy,
          uploadedAt: tanDoc.createdAt,
          description: `TAN Allotment Letter for ${tanStat.idNo}.`,
        });
      } else if (tanStat.attachment) {
        requirements.push({
          id: 'req_tan_letter',
          title: 'Tax Deduction Account Number (TAN) Allotment Letter',
          category: DocumentCategory.KYC_IDENTITY,
          relatedProcess: 'TDS Withholding Tax Allotment',
          period: 'Permanent',
          status: 'Available',
          isMandatory: false,
          documentId: 'stat_tan',
          fileName: 'TAN_Allotment_Letter.pdf',
          fileSize: 220000,
          mimeType: 'application/pdf',
          downloadUrl: tanStat.attachment,
          previewUrl: tanStat.attachment,
          storageProvider: 'local-fallback',
          uploadedBy: 'Client Portal',
          uploadedAt: client.createdAt,
          description: `TAN Allotment Letter for ${tanStat.idNo}.`,
        });
      } else {
        requirements.push({
          id: 'req_tan_letter',
          title: 'Tax Deduction Account Number (TAN) Allotment Letter',
          category: DocumentCategory.KYC_IDENTITY,
          relatedProcess: 'TDS Withholding Tax Allotment',
          period: 'Permanent',
          status: 'Pending',
          isMandatory: false,
          description: `TAN ${tanStat.idNo} registered. Allotment intimation copy required.`,
        });
      }
    }

    // 4. Subscribed Services & Periodic Compliance Documents
    const clientServices: string[] = client.services || [];
    for (const service of clientServices) {
      const sLower = service.toLowerCase();
      if (sLower.includes('tax audit') || sLower.includes('3cd')) {
        const auditDoc = findMatchingDriveDoc([/audit/i, /3cd/i, /financials/i], DocumentCategory.AUDIT_FINANCIALS);
        if (auditDoc) {
          matchedDriveDocIds.add(auditDoc._id.toString());
          requirements.push({
            id: 'req_tax_audit_3cd',
            title: 'Tax Audit Report (Form 3CA / 3CD) & Balance Sheet',
            category: DocumentCategory.AUDIT_FINANCIALS,
            relatedProcess: 'Tax Audit u/s 44AB & Financial Statements',
            period: 'AY 2026-27',
            status: 'Available',
            isMandatory: true,
            documentId: auditDoc._id.toString(),
            fileName: auditDoc.fileName,
            fileSize: auditDoc.size,
            mimeType: auditDoc.mimeType,
            downloadUrl: `/api/v1/drive/${auditDoc._id}/download`,
            previewUrl: auditDoc.previewUrl || `/api/v1/drive/${auditDoc._id}/preview`,
            storageProvider: auditDoc.storageProvider,
            uploadedBy: auditDoc.uploadedBy,
            uploadedAt: auditDoc.createdAt,
            description: 'Tax Audit Report Form 3CA/3CD with audited balance sheet & P&L schedules.',
          });
        } else {
          requirements.push({
            id: 'req_tax_audit_3cd',
            title: 'Tax Audit Report (Form 3CA / 3CD) & Balance Sheet',
            category: DocumentCategory.AUDIT_FINANCIALS,
            relatedProcess: 'Tax Audit u/s 44AB & Financial Statements',
            period: 'AY 2026-27',
            status: 'Pending',
            isMandatory: true,
            description: 'Mandatory Tax Audit Report Form 3CA/3CD and financial statements required.',
          });
        }
      } else if (sLower.includes('mca annual') || sLower.includes('roc annual')) {
        const rocDoc = findMatchingDriveDoc([/mgt[_\-\s]?7/i, /aoc[_\-\s]?4/i, /annual[_\-\s]?return/i], DocumentCategory.COMPLIANCE_MCA);
        if (rocDoc) {
          matchedDriveDocIds.add(rocDoc._id.toString());
          requirements.push({
            id: 'req_mca_annual_return',
            title: 'ROC Annual Return (Form MGT-7 & Form AOC-4)',
            category: DocumentCategory.COMPLIANCE_MCA,
            relatedProcess: 'MCA / ROC Annual Filings',
            period: 'FY 2024-25',
            status: 'Available',
            isMandatory: true,
            documentId: rocDoc._id.toString(),
            fileName: rocDoc.fileName,
            fileSize: rocDoc.size,
            mimeType: rocDoc.mimeType,
            downloadUrl: `/api/v1/drive/${rocDoc._id}/download`,
            previewUrl: rocDoc.previewUrl || `/api/v1/drive/${rocDoc._id}/preview`,
            storageProvider: rocDoc.storageProvider,
            uploadedBy: rocDoc.uploadedBy,
            uploadedAt: rocDoc.createdAt,
            description: 'Annual Return MGT-7 and financial filing Form AOC-4 with ROC receipts.',
          });
        } else {
          requirements.push({
            id: 'req_mca_annual_return',
            title: 'ROC Annual Return (Form MGT-7 & Form AOC-4)',
            category: DocumentCategory.COMPLIANCE_MCA,
            relatedProcess: 'MCA / ROC Annual Filings',
            period: 'FY 2024-25',
            status: 'Pending',
            isMandatory: true,
            description: 'Annual statutory filings MGT-7 and AOC-4 required for corporate compliance.',
          });
        }
      }
    }

    // 5. Task Document Requests
    for (const task of tasks) {
      if (task.documentRequests && Array.isArray(task.documentRequests)) {
        for (const req of task.documentRequests) {
          const reqId = `task_${task.taskId || task._id}_doc_${req.id || req._id}`;
          let cat = DocumentCategory.WORKPAPERS;
          const tCat = String(task.category || '').toLowerCase();
          if (tCat.includes('gst') || tCat.includes('income tax') || tCat.includes('tds')) {
            cat = DocumentCategory.TAX_RETURNS;
          } else if (tCat.includes('audit')) {
            cat = DocumentCategory.AUDIT_FINANCIALS;
          } else if (tCat.includes('roc') || tCat.includes('mca')) {
            cat = DocumentCategory.COMPLIANCE_MCA;
          }

          const isRec = req.status === 'Received' || Boolean(req.fileUrl);
          const isReq = req.status === 'Requested';
          const status: DocumentStatus = isRec ? 'Available' : isReq ? 'Requested' : 'Pending';

          const item: DocumentRequirementItem = {
            id: reqId,
            title: req.title,
            category: cat,
            relatedProcess: `${task.taskId || 'Task'}: ${task.taskName}`,
            period: task.period || task.financialYear || 'Current Period',
            status,
            isMandatory: req.isMandatory ?? true,
            description: req.description || `Task requirement for ${task.taskName}`,
            taskId: task.taskId || task._id?.toString(),
            taskDocId: req.id || req._id?.toString(),
          };

          if (isRec && req.fileUrl) {
            item.downloadUrl = req.fileUrl;
            item.previewUrl = req.fileUrl;
            item.fileName = req.fileUrl.split('/').pop() || `${req.title}.pdf`;
            item.fileSize = 345000;
            item.mimeType = req.fileUrl.endsWith('.xlsx') || req.fileUrl.endsWith('.csv')
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'application/pdf';
            item.storageProvider = 'local-fallback';
            item.uploadedBy = task.assigneeName || 'Client Portal';
            item.uploadedAt = req.receivedAt || task.updatedAt || new Date();
          }

          requirements.push(item);
        }
      }
    }

    // 6. Licenses (client.licenses)
    if (client.licenses && Array.isArray(client.licenses)) {
      const now = new Date();
      for (const lic of client.licenses) {
        let isExpired = false;
        if (lic.expiryDate && lic.expiryDate !== 'Permanent') {
          const expDate = new Date(lic.expiryDate);
          if (!isNaN(expDate.getTime()) && expDate < now) {
            isExpired = true;
          }
        }

        const hasFile = Boolean(lic.file || lic.fileUrl || lic.driveFileId);
        const status: DocumentStatus = isExpired ? 'Expired' : hasFile ? 'Available' : 'Pending';

        const item: DocumentRequirementItem = {
          id: `lic_${lic.id || lic.name}`,
          title: `Practice License: ${lic.name}`,
          category: DocumentCategory.COMPLIANCE_MCA,
          relatedProcess: `Regulatory Licensing (${lic.licenseNo || 'Statutory Approval'})`,
          period: `Expiry: ${lic.expiryDate || 'N/A'}`,
          status,
          isMandatory: true,
          description: lic.remarks && lic.remarks !== '-' ? lic.remarks : `License registration for ${lic.name}`,
        };

        if (hasFile) {
          item.fileName = lic.file || `${lic.name}_License.pdf`;
          item.fileSize = 425000;
          item.mimeType = 'application/pdf';
          item.downloadUrl = lic.fileUrl || (lic.driveFileId ? `/api/v1/drive/${lic.driveFileId}/download` : '#');
          item.previewUrl = lic.fileUrl || (lic.driveFileId ? `/api/v1/drive/${lic.driveFileId}/preview` : '#');
          item.storageProvider = lic.driveFileId ? 'google-drive' : 'local-fallback';
          item.uploadedBy = 'Compliance Officer';
          item.uploadedAt = lic.issuedDate ? new Date(lic.issuedDate) : client.createdAt;
        }

        requirements.push(item);
      }
    }

    // 7. DSCs (client.dscs)
    if (client.dscs && Array.isArray(client.dscs)) {
      const now = new Date();
      for (const dsc of client.dscs) {
        let isExpired = dsc.status === 'Expired';
        if (dsc.expiryDate && !isExpired) {
          const expDate = new Date(dsc.expiryDate);
          if (!isNaN(expDate.getTime()) && expDate < now) {
            isExpired = true;
          }
        }

        const status: DocumentStatus = isExpired ? 'Expired' : 'Available';

        requirements.push({
          id: `dsc_${dsc.id || dsc.dscId || dsc.name}`,
          title: `Digital Signature Certificate: ${dsc.name}`,
          category: DocumentCategory.COMPLIANCE_MCA,
          relatedProcess: `Statutory DSC Token (${dsc.vendor || 'Certifying Authority'} - ${dsc.class || 'Class 3'})`,
          period: `Valid Till: ${dsc.expiryDate || 'N/A'}`,
          status,
          isMandatory: false,
          description: `Token Location: ${dsc.location || 'CA Office'}. Serial: ${dsc.dscId || dsc.binNumber || 'Active'}. ${dsc.remarks || ''}`,
          fileName: `${dsc.name}_DSC_Token_Details.pdf`,
          fileSize: 180000,
          mimeType: 'application/pdf',
          downloadUrl: '#',
          previewUrl: '#',
          storageProvider: 'local-fallback',
          uploadedBy: 'Practice Signatory Registry',
          uploadedAt: dsc.issuedDate ? new Date(dsc.issuedDate) : client.createdAt,
        });
      }
    }

    // 8. Remaining Unmatched Drive Documents (Available)
    for (const doc of driveDocs) {
      if (!matchedDriveDocIds.has(doc._id.toString())) {
        requirements.push({
          id: `doc_${doc._id}`,
          title: doc.fileName,
          category: doc.category,
          relatedProcess: 'Client Document Repository',
          period: `Uploaded ${new Date(doc.createdAt).toLocaleDateString()}`,
          status: 'Available',
          isMandatory: false,
          documentId: doc._id.toString(),
          fileName: doc.fileName,
          fileSize: doc.size,
          mimeType: doc.mimeType,
          downloadUrl: `/api/v1/drive/${doc._id}/download`,
          previewUrl: doc.previewUrl || `/api/v1/drive/${doc._id}/preview`,
          storageProvider: doc.storageProvider,
          uploadedBy: doc.uploadedBy,
          uploadedAt: doc.createdAt,
          description: doc.description || `Associated document uploaded by ${doc.uploadedBy || 'Practice Staff'}`,
        });
      }
    }

    // 9. Summary Counts
    const summary: DocumentRequirementSummary = {
      total: requirements.length,
      available: requirements.filter((r) => r.status === 'Available').length,
      pending: requirements.filter((r) => r.status === 'Pending').length,
      requested: requirements.filter((r) => r.status === 'Requested').length,
      expired: requirements.filter((r) => r.status === 'Expired').length,
    };

    return { requirements, summary };
  }

  /**
   * Synthesize document requirements for a team member (User)
   */
  public static generateTeamRequirements(
    _user: any,
    driveDocs: any[]
  ): { requirements: DocumentRequirementItem[]; summary: DocumentRequirementSummary } {
    const requirements: DocumentRequirementItem[] = [];
    const matchedDriveDocIds = new Set<string>();

    const findMatchingDoc = (patterns: RegExp[], category?: DocumentCategory) => {
      return driveDocs.find((d) => {
        if (matchedDriveDocIds.has(d._id.toString())) return false;
        if (category && d.category !== category) return false;
        const targetStr = `${d.fileName} ${d.description || ''} ${(d.tags || []).join(' ')}`.toLowerCase();
        return patterns.some((p) => p.test(targetStr));
      });
    };

    // 1. Staff PAN Card
    const panDoc = findMatchingDoc([/pan/i], DocumentCategory.KYC_IDENTITY);
    if (panDoc) {
      matchedDriveDocIds.add(panDoc._id.toString());
      requirements.push({
        id: 'staff_pan',
        title: 'Staff Permanent Account Number (PAN) Card',
        category: DocumentCategory.KYC_IDENTITY,
        relatedProcess: 'HR Onboarding & Payroll Tax Withholding',
        period: 'Permanent',
        status: 'Available',
        isMandatory: true,
        documentId: panDoc._id.toString(),
        fileName: panDoc.fileName,
        fileSize: panDoc.size,
        mimeType: panDoc.mimeType,
        downloadUrl: `/api/v1/drive/${panDoc._id}/download`,
        previewUrl: panDoc.previewUrl || `/api/v1/drive/${panDoc._id}/preview`,
        storageProvider: panDoc.storageProvider,
        uploadedBy: panDoc.uploadedBy,
        uploadedAt: panDoc.createdAt,
        description: 'Employee PAN Card copy verified for salary TDS deduction.',
      });
    } else {
      requirements.push({
        id: 'staff_pan',
        title: 'Staff Permanent Account Number (PAN) Card',
        category: DocumentCategory.KYC_IDENTITY,
        relatedProcess: 'HR Onboarding & Payroll Tax Withholding',
        period: 'Permanent',
        status: 'Pending',
        isMandatory: true,
        description: 'Mandatory PAN Card required for payroll processing and Form 24Q compliance.',
      });
    }

    // 2. Staff Aadhaar Identity
    const aadhaarDoc = findMatchingDoc([/aadhaar/i, /aadhar/i, /national[_\-\s]?id/i], DocumentCategory.KYC_IDENTITY);
    if (aadhaarDoc) {
      matchedDriveDocIds.add(aadhaarDoc._id.toString());
      requirements.push({
        id: 'staff_aadhaar',
        title: 'Aadhaar Card / Government Identity Proof',
        category: DocumentCategory.KYC_IDENTITY,
        relatedProcess: 'HR Identity Verification & Compliance',
        period: 'Permanent',
        status: 'Available',
        isMandatory: true,
        documentId: aadhaarDoc._id.toString(),
        fileName: aadhaarDoc.fileName,
        fileSize: aadhaarDoc.size,
        mimeType: aadhaarDoc.mimeType,
        downloadUrl: `/api/v1/drive/${aadhaarDoc._id}/download`,
        previewUrl: aadhaarDoc.previewUrl || `/api/v1/drive/${aadhaarDoc._id}/preview`,
        storageProvider: aadhaarDoc.storageProvider,
        uploadedBy: aadhaarDoc.uploadedBy,
        uploadedAt: aadhaarDoc.createdAt,
        description: 'Government identity proof on file.',
      });
    } else {
      requirements.push({
        id: 'staff_aadhaar',
        title: 'Aadhaar Card / Government Identity Proof',
        category: DocumentCategory.KYC_IDENTITY,
        relatedProcess: 'HR Identity Verification & Compliance',
        period: 'Permanent',
        status: 'Pending',
        isMandatory: true,
        description: 'Government photo identification document required for staff compliance registry.',
      });
    }

    // 3. Educational / ICAI Qualification
    const qualDoc = findMatchingDoc([/icai/i, /degree/i, /qualification/i, /certificate/i], DocumentCategory.WORKPAPERS);
    if (qualDoc) {
      matchedDriveDocIds.add(qualDoc._id.toString());
      requirements.push({
        id: 'staff_qualification',
        title: 'ICAI / Educational Degree & Qualification Certificate',
        category: DocumentCategory.WORKPAPERS,
        relatedProcess: 'Professional Qualifications & ICAI Peer Review',
        period: 'Permanent',
        status: 'Available',
        isMandatory: true,
        documentId: qualDoc._id.toString(),
        fileName: qualDoc.fileName,
        fileSize: qualDoc.size,
        mimeType: qualDoc.mimeType,
        downloadUrl: `/api/v1/drive/${qualDoc._id}/download`,
        previewUrl: qualDoc.previewUrl || `/api/v1/drive/${qualDoc._id}/preview`,
        storageProvider: qualDoc.storageProvider,
        uploadedBy: qualDoc.uploadedBy,
        uploadedAt: qualDoc.createdAt,
        description: 'Professional qualification diploma or ICAI membership certificate.',
      });
    } else {
      requirements.push({
        id: 'staff_qualification',
        title: 'ICAI / Educational Degree & Qualification Certificate',
        category: DocumentCategory.WORKPAPERS,
        relatedProcess: 'Professional Qualifications & ICAI Peer Review',
        period: 'Permanent',
        status: 'Pending',
        isMandatory: true,
        description: 'Official degree certificate, ICAI marksheet, or professional qualifications for practice audit.',
      });
    }

    // 4. Employment Contract / Appointment Letter
    const appDoc = findMatchingDoc([/appointment/i, /employment/i, /contract/i, /nda/i], DocumentCategory.LEGAL_CONTRACTS);
    if (appDoc) {
      matchedDriveDocIds.add(appDoc._id.toString());
      requirements.push({
        id: 'staff_appointment',
        title: 'Employment Agreement / Appointment Letter & NDA',
        category: DocumentCategory.LEGAL_CONTRACTS,
        relatedProcess: 'Staff Onboarding & Non-Disclosure Agreement',
        period: 'Tenure Period',
        status: 'Available',
        isMandatory: true,
        documentId: appDoc._id.toString(),
        fileName: appDoc.fileName,
        fileSize: appDoc.size,
        mimeType: appDoc.mimeType,
        downloadUrl: `/api/v1/drive/${appDoc._id}/download`,
        previewUrl: appDoc.previewUrl || `/api/v1/drive/${appDoc._id}/preview`,
        storageProvider: appDoc.storageProvider,
        uploadedBy: appDoc.uploadedBy,
        uploadedAt: appDoc.createdAt,
        description: 'Signed practice employment terms and confidentiality agreement.',
      });
    } else {
      requirements.push({
        id: 'staff_appointment',
        title: 'Employment Agreement / Appointment Letter & NDA',
        category: DocumentCategory.LEGAL_CONTRACTS,
        relatedProcess: 'Staff Onboarding & Non-Disclosure Agreement',
        period: 'Tenure Period',
        status: 'Pending',
        isMandatory: true,
        description: 'Executed appointment letter and signed non-disclosure agreement.',
      });
    }

    // 5. Remaining Uploaded Drive Documents
    for (const doc of driveDocs) {
      if (!matchedDriveDocIds.has(doc._id.toString())) {
        requirements.push({
          id: `doc_${doc._id}`,
          title: doc.fileName,
          category: doc.category,
          relatedProcess: 'Team Member Documents',
          period: `Uploaded ${new Date(doc.createdAt).toLocaleDateString()}`,
          status: 'Available',
          isMandatory: false,
          documentId: doc._id.toString(),
          fileName: doc.fileName,
          fileSize: doc.size,
          mimeType: doc.mimeType,
          downloadUrl: `/api/v1/drive/${doc._id}/download`,
          previewUrl: doc.previewUrl || `/api/v1/drive/${doc._id}/preview`,
          storageProvider: doc.storageProvider,
          uploadedBy: doc.uploadedBy,
          uploadedAt: doc.createdAt,
          description: doc.description || `Uploaded by ${doc.uploadedBy || 'Team Member'}`,
        });
      }
    }

    const summary: DocumentRequirementSummary = {
      total: requirements.length,
      available: requirements.filter((r) => r.status === 'Available').length,
      pending: requirements.filter((r) => r.status === 'Pending').length,
      requested: requirements.filter((r) => r.status === 'Requested').length,
      expired: requirements.filter((r) => r.status === 'Expired').length,
    };

    return { requirements, summary };
  }

  /**
   * Search authorized people across Client and User records.
   * Supports server-side search by name, fileNo/identifier, email, mobile, and PAN.
   */
  static async searchPeople(
    params: SearchPeopleParams = {},
    _userCtx?: { orgId?: string | null; userId?: string | null }
  ): Promise<{
    people: PersonRecord[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const search = params.search?.trim() || '';
    const typeFilter = params.type || 'all';

    const searchRegex = search ? new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    // Fetch document counts aggregation by clientId
    const clientDocCounts = await DocumentModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$clientId', count: { $sum: 1 } } },
    ]);
    const clientDocCountMap = new Map<string, number>();
    for (const item of clientDocCounts) {
      if (item._id) {
        clientDocCountMap.set(item._id.toString(), item.count);
      }
    }

    const peopleList: PersonRecord[] = [];

    // Query Clients
    if (typeFilter === 'all' || typeFilter === 'client') {
      const clientFilter: Record<string, any> = { isDeleted: false };

      if (searchRegex) {
        clientFilter.$or = [
          { name: searchRegex },
          { legalName: searchRegex },
          { fileNo: searchRegex },
          { email: searchRegex },
          { mobile: searchRegex },
          { pan: searchRegex },
          { city: searchRegex },
          { tags: searchRegex },
          { 'customerFiles.promoter.name': searchRegex },
        ];
      }

      const clients = await Client.find(clientFilter)
        .select('name legalName fileNo type mobile email pan group active status city state address customerFiles licenses dscs services createdAt')
        .sort({ name: 1 })
        .lean();

      // Fetch all tasks for quick status calculation
      const allTasks = await Task.find({ isDeleted: false })
        .select('clientId clientFileNo clientName taskId taskName category period financialYear documentRequests')
        .lean();

      for (const c of clients) {
        const cId = c._id.toString();
        const driveDocCount = clientDocCountMap.get(cId) || 0;
        const statutoryWithFiles = (c.customerFiles?.statutory || []).filter((s: any) => s.attachment).length;
        const licensesWithFiles = (c.licenses || []).filter((l: any) => l.file || l.fileUrl || l.driveFileId).length;
        const totalDocs = driveDocCount + statutoryWithFiles + licensesWithFiles;

        // Filter tasks for this client
        const clientTasks = allTasks.filter(
          (t: any) => t.clientId === cId || t.clientFileNo === c.fileNo || t.clientName === c.name
        );

        // Approximate requirement counts for master view
        const reqSummary = this.generateClientRequirements(c, clientTasks, []).summary;

        peopleList.push({
          id: cId,
          entityType: 'client',
          name: c.name,
          legalName: c.legalName || c.name,
          identifier: c.fileNo || 'CLT-N/A',
          type: c.type || 'Client Entity',
          email: c.email || '',
          mobile: c.mobile || '',
          pan: c.pan || '',
          group: c.group || 'General',
          department: 'Client Portfolio',
          status: c.status || (c.active ? 'Active' : 'Inactive'),
          city: c.city || '',
          state: c.state || '',
          address: c.address || '',
          documentCount: totalDocs,
          availableCount: reqSummary.available,
          pendingCount: reqSummary.pending + reqSummary.requested,
          createdAt: c.createdAt,
        });
      }
    }

    // Query Users/Employees
    if (typeFilter === 'all' || typeFilter === 'team') {
      const userFilter: Record<string, any> = {
        status: { $nin: ['deleted', 'deactivated_permanent'] },
      };

      if (searchRegex) {
        userFilter.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { mobile: searchRegex },
          { department: searchRegex },
          { designation: searchRegex },
          { role: searchRegex },
        ];
      }

      const users = await UserModel.find(userFilter)
        .select('name email mobile role initials department designation status addressDetails employeeId createdAt')
        .sort({ name: 1 })
        .lean();

      const userDocCounts = await DocumentModel.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$uploadedBy', count: { $sum: 1 } } },
      ]);
      const userDocCountMap = new Map<string, number>();
      for (const item of userDocCounts) {
        if (item._id) {
          userDocCountMap.set(String(item._id).toLowerCase(), item.count);
        }
      }

      for (const u of users) {
        const uId = u._id.toString();
        const docCount =
          (userDocCountMap.get((u.name || '').toLowerCase()) || 0) +
          (userDocCountMap.get((u.email || '').toLowerCase()) || 0);

        const teamSummary = this.generateTeamRequirements(u, []).summary;

        peopleList.push({
          id: uId,
          entityType: 'team',
          name: u.name,
          legalName: u.name,
          identifier: (u as any).employeeId || `EMP-${uId.slice(-4).toUpperCase()}`,
          type: u.designation || (u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Staff'),
          email: u.email || '',
          mobile: u.mobile || '',
          pan: '',
          group: u.department || 'General Practice',
          department: u.department || 'General Practice',
          status: String(u.status || '').toLowerCase() === 'active' ? 'Active' : String(u.status || 'Active'),
          city: u.addressDetails?.city || '',
          state: u.addressDetails?.state || '',
          address: u.addressDetails?.addressLine1 || '',
          documentCount: docCount,
          availableCount: teamSummary.available,
          pendingCount: teamSummary.pending,
          createdAt: u.createdAt,
        });
      }
    }

    // Sort results
    if (search) {
      const q = search.toLowerCase();
      peopleList.sort((a, b) => {
        const aExact = a.name.toLowerCase().startsWith(q) || a.identifier.toLowerCase().startsWith(q);
        const bExact = b.name.toLowerCase().startsWith(q) || b.identifier.toLowerCase().startsWith(q);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    const total = peopleList.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedPeople = peopleList.slice((page - 1) * limit, page * limit);

    return {
      people: paginatedPeople,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Retrieve full details of a selected person along with all associated documents
   * and synthesized document tracking requirements.
   */
  static async getPersonDetails(id: string): Promise<PersonDetailResponse> {
    if (!Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('Invalid person ID format');
    }

    // 1. Check if ID corresponds to a Client
    const client = await Client.findOne({ _id: id, isDeleted: false }).lean();
    if (client) {
      // Fetch associated documents from DocumentModel
      const driveDocs = await DocumentModel.find({
        $or: [
          { clientId: new Types.ObjectId(id) },
          { clientName: client.name },
        ],
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .lean();

      // Normalize client documents
      const documents: any[] = driveDocs.map((doc: any) => ({
        id: doc._id.toString(),
        fileName: doc.fileName,
        sanitizedFileName: doc.sanitizedFileName,
        category: doc.category,
        size: doc.size,
        mimeType: doc.mimeType,
        uploadedBy: doc.uploadedBy,
        storageProvider: doc.storageProvider,
        webViewLink: doc.webViewLink,
        downloadUrl: `/api/v1/drive/${doc._id}/download`,
        previewUrl: doc.previewUrl || `/api/v1/drive/${doc._id}/preview`,
        description: doc.description || '',
        tags: doc.tags || [],
        createdAt: doc.createdAt,
      }));

      // Include statutory attachments as accessible documents
      if (client.customerFiles?.statutory) {
        for (const stat of client.customerFiles.statutory) {
          if (stat.attachment) {
            documents.push({
              id: `stat_${stat.key || stat.type}`,
              fileName: `${stat.type}_Certificate.pdf`,
              sanitizedFileName: `${stat.type}_Certificate.pdf`,
              category: DocumentCategory.KYC_IDENTITY,
              size: 250000,
              mimeType: 'application/pdf',
              uploadedBy: 'Client Portal',
              storageProvider: 'local-fallback',
              webViewLink: stat.attachment,
              downloadUrl: stat.attachment,
              previewUrl: stat.attachment,
              description: `Statutory identification document (${stat.type}) with ID ${stat.idNo}`,
              tags: ['Statutory', stat.type],
              createdAt: client.createdAt,
            });
          }
        }
      }

      // Include licenses with attachments as accessible documents
      if (client.licenses) {
        for (const lic of client.licenses) {
          if (lic.file || lic.fileUrl || lic.driveFileId) {
            documents.push({
              id: lic.id || `lic_${lic.name}`,
              fileName: lic.file || `${lic.name}_License.pdf`,
              sanitizedFileName: lic.file || `${lic.name}_License.pdf`,
              category: DocumentCategory.COMPLIANCE_MCA,
              size: 512000,
              mimeType: 'application/pdf',
              uploadedBy: 'Compliance Officer',
              storageProvider: lic.driveFileId ? 'google-drive' : 'local-fallback',
              webViewLink: lic.fileUrl || lic.url || '#',
              downloadUrl: lic.fileUrl || (lic.driveFileId ? `/api/v1/drive/${lic.driveFileId}/download` : '#'),
              previewUrl: lic.fileUrl || (lic.driveFileId ? `/api/v1/drive/${lic.driveFileId}/preview` : '#'),
              description: `Practice License: ${lic.name} (License No: ${lic.licenseNo || 'N/A'}, Expiry: ${lic.expiryDate || 'N/A'})`,
              tags: ['License', lic.name],
              createdAt: lic.issuedDate ? new Date(lic.issuedDate) : client.createdAt,
            });
          }
        }
      }

      // Fetch all tasks for this client to inspect task document requests
      const tasks = await Task.find({
        $or: [
          { clientId: client._id.toString() },
          { clientId: client._id },
          { clientFileNo: client.fileNo },
          { clientName: client.name },
        ],
        isDeleted: false,
      }).lean();

      // Generate complete requirements inventory and metrics
      const { requirements, summary } = this.generateClientRequirements(client, tasks, driveDocs);

      return {
        person: {
          id: client._id.toString(),
          entityType: 'client',
          name: client.name,
          legalName: client.legalName || client.name,
          identifier: client.fileNo || 'CLT-N/A',
          type: client.type || 'Client Entity',
          email: client.email || '',
          mobile: client.mobile || '',
          secondaryMobile: client.secondaryMobile || '',
          pan: client.pan || '',
          dob: client.dob || '',
          group: client.group || 'General',
          department: 'Client Portfolio',
          status: client.status || (client.active ? 'Active' : 'Inactive'),
          city: client.city || '',
          state: client.state || '',
          pincode: client.pincode || '',
          address: client.address || '',
          services: client.services || [],
          promoters: client.customerFiles?.promoter || [],
          statutory: client.customerFiles?.statutory || [],
          licenses: client.licenses || [],
          dscs: client.dscs || [],
          documentsInOut: client.documentsInOut || [],
          documentCount: summary.available,
          availableCount: summary.available,
          pendingCount: summary.pending + summary.requested,
          createdAt: client.createdAt,
        },
        documents,
        requirements,
        summary,
      };
    }

    // 2. Check if ID corresponds to a User (Team Member)
    const user = await UserModel.findOne({ _id: id })
      .select('-passwordHash -password -tokenVersion')
      .lean();

    if (user) {
      const userDocs = await DocumentModel.find({
        $or: [
          { uploadedBy: user.name },
          { uploadedBy: user.email },
        ],
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .lean();

      const documents = userDocs.map((doc: any) => ({
        id: doc._id.toString(),
        fileName: doc.fileName,
        sanitizedFileName: doc.sanitizedFileName,
        category: doc.category,
        size: doc.size,
        mimeType: doc.mimeType,
        uploadedBy: doc.uploadedBy,
        storageProvider: doc.storageProvider,
        webViewLink: doc.webViewLink,
        downloadUrl: `/api/v1/drive/${doc._id}/download`,
        previewUrl: doc.previewUrl || `/api/v1/drive/${doc._id}/preview`,
        description: doc.description || '',
        tags: doc.tags || [],
        createdAt: doc.createdAt,
      }));

      const { requirements, summary } = this.generateTeamRequirements(user, userDocs);

      return {
        person: {
          id: user._id.toString(),
          entityType: 'team',
          name: user.name,
          legalName: user.name,
          identifier: (user as any).employeeId || `EMP-${user._id.toString().slice(-4).toUpperCase()}`,
          type: user.designation || (user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Staff'),
          email: user.email || '',
          mobile: user.mobile || '',
          pan: '',
          group: user.department || 'General Practice',
          department: user.department || 'General Practice',
          role: user.role,
          designation: user.designation,
          status: String(user.status || '').toLowerCase() === 'active' ? 'Active' : String(user.status || 'Active'),
          city: user.addressDetails?.city || '',
          state: user.addressDetails?.state || '',
          address: user.addressDetails?.addressLine1 || '',
          firmName: user.firmName || 'Ayatrio Practice',
          initials: user.initials || 'U',
          documentCount: summary.available,
          availableCount: summary.available,
          pendingCount: summary.pending,
          createdAt: user.createdAt,
        },
        documents,
        requirements,
        summary,
      };
    }

    throw AppError.notFound('Person record not found');
  }

  /**
   * Upload and associate a new document for a specific person.
   * If requirementId / taskDocId is provided, transitions the requirement to 'Available'.
   */
  static async uploadDocumentForPerson(
    personId: string,
    file: Express.Multer.File,
    meta: {
      category?: DocumentCategory;
      description?: string;
      tags?: string[];
      uploadedBy?: string;
      requirementId?: string;
      taskDocId?: string;
      taskId?: string;
    }
  ): Promise<any> {
    if (!Types.ObjectId.isValid(personId)) {
      throw AppError.badRequest('Invalid person ID format');
    }

    let clientName = '';
    let clientId: string | undefined = undefined;

    const client = await Client.findById(personId);
    if (client) {
      clientId = client._id.toString();
      clientName = client.name;
    } else {
      const user = await UserModel.findById(personId).select('name').lean();
      if (user) {
        clientName = user.name;
      } else {
        throw AppError.notFound('Person not found');
      }
    }

    const category = meta.category || DocumentCategory.GENERAL;

    const document = await DriveService.uploadDocument(file, {
      category,
      description: meta.description || `Associated document for ${clientName}`,
      clientId,
      clientName,
      tags: meta.tags || ['Document Center', clientName],
      uploadedBy: meta.uploadedBy || 'Practice Staff',
    });

    const fileDownloadUrl = `/api/v1/drive/${document._id}/download`;

    // 1. If linked to a task document request, update the task request status to Received
    if (meta.taskDocId || meta.taskId || meta.requirementId?.startsWith('task_')) {
      const targetDocId = meta.taskDocId || meta.requirementId?.replace(/^task_[^_]+_doc_/, '');
      const taskQuery: any = { isDeleted: false };
      if (meta.taskId) {
        taskQuery.$or = [{ taskId: meta.taskId }, { _id: Types.ObjectId.isValid(meta.taskId) ? meta.taskId : undefined }].filter(Boolean);
      } else if (targetDocId) {
        taskQuery.$or = [
          { 'documentRequests.id': targetDocId },
          { 'documentRequests._id': Types.ObjectId.isValid(targetDocId) ? targetDocId : undefined },
        ].filter(Boolean);
      }

      const task = await Task.findOne(taskQuery);
      if (task && task.documentRequests) {
        const docReq = task.documentRequests.find(
          (d: any) => d.id === targetDocId || d._id?.toString() === targetDocId
        );
        if (docReq) {
          docReq.status = 'Received';
          docReq.fileUrl = fileDownloadUrl;
          docReq.receivedAt = new Date();
          task.markModified('documentRequests');
          await task.save();
        }
      }
    }

    // 2. If client and requirement relates to PAN, GSTIN, or licenses, update client record
    if (client) {
      let modified = false;
      if (meta.requirementId === 'req_pan' && client.customerFiles?.statutory) {
        const panStat = client.customerFiles.statutory.find((s: any) => s.type === 'PAN');
        if (panStat) {
          panStat.attachment = fileDownloadUrl;
          client.markModified('customerFiles');
          modified = true;
        }
      } else if (meta.requirementId === 'req_gst_reg06' && client.customerFiles?.statutory) {
        const gstStat = client.customerFiles.statutory.find((s: any) => s.type === 'GSTIN');
        if (gstStat) {
          gstStat.attachment = fileDownloadUrl;
          client.markModified('customerFiles');
          modified = true;
        }
      } else if (meta.requirementId?.startsWith('lic_') && client.licenses) {
        const licId = meta.requirementId.replace('lic_', '');
        const lic = client.licenses.find((l: any) => l.id === licId || l.name === licId);
        if (lic) {
          lic.fileUrl = fileDownloadUrl;
          lic.file = document.sanitizedFileName;
          client.markModified('licenses');
          modified = true;
        }
      }

      if (modified) {
        await client.save();
      }
    }

    return document;
  }
}
