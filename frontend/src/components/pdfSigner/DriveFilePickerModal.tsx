'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  HardDrive,
  Search,
  Filter,
  Check,
  X,
  Loader2,
  FileText,
  AlertCircle,
  Building,
} from 'lucide-react';
import {
  driveApi,
  IDocumentItem,
  DocumentCategory,
  CATEGORY_MAP,
} from '@/services/driveApi';

interface DriveFilePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStageDocuments: (docIds: string[]) => Promise<void>;
}

const INITIAL_PRACTICE_DOCS: IDocumentItem[] = [
  {
    _id: 'doc_tax_01',
    id: 'doc_tax_01',
    fileName: 'GSTR_3B_September_2026.pdf',
    sanitizedFileName: 'GSTR_3B_September_2026.pdf',
    category: DocumentCategory.TAX_RETURNS,
    driveFileId: '1gDrIvE_tAx_001_GstR3B',
    driveFolderId: '01_Tax_and_GST_Filings',
    mimeType: 'application/pdf',
    size: 1420000,
    checksum: '8f4a7c1b9e2d3f6a5b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
    description: 'Monthly summary return filed for Q2, tax liability reconciled with Input Tax Credit (ITC).',
    clientName: 'Tata Consultancy Services Ltd',
    tags: ['GST', 'GSTR-3B', 'FY-2026-27'],
    uploadedBy: 'Senior Tax Associate',
    storageProvider: 'google-drive',
    verification: {
      passed: true,
      sanitizedFileName: 'GSTR_3B_September_2026.pdf',
      fileExtension: '.pdf',
      detectedMime: 'application/pdf',
      claimedMime: 'application/pdf',
      magicBytesHex: '25504446',
      fileSizeBytes: 1420000,
      checks: { safeExtension: true, magicByteMatch: true, sizeLimitOk: true, nonEmpty: true, categoryAllowed: true, executableScanClean: true },
      reasons: [],
    },
    createdAt: '2026-10-18T14:30:00.000Z',
    updatedAt: '2026-10-18T14:30:00.000Z',
  },
  {
    _id: 'doc_audit_02',
    id: 'doc_audit_02',
    fileName: 'Statutory_Audit_Report_Form_3CA_3CD.pdf',
    sanitizedFileName: 'Statutory_Audit_Report_Form_3CA_3CD.pdf',
    category: DocumentCategory.AUDIT_FINANCIALS,
    driveFileId: '1gDrIvE_auDit_002_StatReport',
    driveFolderId: '02_Audited_Financials',
    mimeType: 'application/pdf',
    size: 4890000,
    checksum: '3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c',
    description: 'Independent Auditor Report, Balance Sheet, P&L Statement, and Form 3CD Tax Audit disclosures.',
    clientName: 'Reliance Retail Ventures',
    tags: ['Audit', 'Form-3CD', 'Balance-Sheet'],
    uploadedBy: 'Audit Partner',
    storageProvider: 'google-drive',
    verification: {
      passed: true,
      sanitizedFileName: 'Statutory_Audit_Report_Form_3CA_3CD.pdf',
      fileExtension: '.pdf',
      detectedMime: 'application/pdf',
      claimedMime: 'application/pdf',
      magicBytesHex: '25504446',
      fileSizeBytes: 4890000,
      checks: { safeExtension: true, magicByteMatch: true, sizeLimitOk: true, nonEmpty: true, categoryAllowed: true, executableScanClean: true },
      reasons: [],
    },
    createdAt: '2026-10-15T11:20:00.000Z',
    updatedAt: '2026-10-15T11:20:00.000Z',
  },
  {
    _id: 'doc_inv_03',
    id: 'doc_inv_03',
    fileName: 'Professional_Fee_Invoice_INV-2026-118.pdf',
    sanitizedFileName: 'Professional_Fee_Invoice_INV-2026-118.pdf',
    category: DocumentCategory.INVOICES_BILLING,
    driveFileId: '1gDrIvE_inV_003_FeeReceipt',
    driveFolderId: '03_Invoices_and_Billing',
    mimeType: 'application/pdf',
    size: 820000,
    checksum: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
    description: 'Tax Advisory & Compliance retainer fee bill for October 2026.',
    clientName: 'Mahindra Logistics Pvt Ltd',
    tags: ['Billing', 'Invoice', 'Retainer'],
    uploadedBy: 'Accounts Team',
    storageProvider: 'google-drive',
    verification: {
      passed: true,
      sanitizedFileName: 'Professional_Fee_Invoice_INV-2026-118.pdf',
      fileExtension: '.pdf',
      detectedMime: 'application/pdf',
      claimedMime: 'application/pdf',
      magicBytesHex: '25504446',
      fileSizeBytes: 820000,
      checks: { safeExtension: true, magicByteMatch: true, sizeLimitOk: true, nonEmpty: true, categoryAllowed: true, executableScanClean: true },
      reasons: [],
    },
    createdAt: '2026-10-12T09:15:00.000Z',
    updatedAt: '2026-10-12T09:15:00.000Z',
  },
  {
    _id: 'doc_kyc_05',
    id: 'doc_kyc_05',
    fileName: 'Client_Incorporation_Certificate_COI.pdf',
    sanitizedFileName: 'Client_Incorporation_Certificate_COI.pdf',
    category: DocumentCategory.KYC_IDENTITY,
    driveFileId: '1gDrIvE_kYc_005_COI_Cert',
    driveFolderId: '05_KYC_and_Identity_Proofs',
    mimeType: 'application/pdf',
    size: 1980000,
    checksum: '4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d',
    description: 'Certificate of Incorporation & statutory directorship appointment records under MCA V3.',
    clientName: 'Infosys Technologies Ltd',
    tags: ['KYC', 'COI', 'Incorporation'],
    uploadedBy: 'Compliance Officer',
    storageProvider: 'google-drive',
    verification: {
      passed: true,
      sanitizedFileName: 'Client_Incorporation_Certificate_COI.pdf',
      fileExtension: '.pdf',
      detectedMime: 'application/pdf',
      claimedMime: 'application/pdf',
      magicBytesHex: '25504446',
      fileSizeBytes: 1980000,
      checks: { safeExtension: true, magicByteMatch: true, sizeLimitOk: true, nonEmpty: true, categoryAllowed: true, executableScanClean: true },
      reasons: [],
    },
    createdAt: '2026-10-08T10:10:00.000Z',
    updatedAt: '2026-10-08T10:10:00.000Z',
  },
];

export const DriveFilePickerModal: React.FC<DriveFilePickerModalProps> = ({
  isOpen,
  onClose,
  onStageDocuments,
}) => {
  const [documents, setDocuments] = useState<IDocumentItem[]>(INITIAL_PRACTICE_DOCS);
  const [isLoading, setIsLoading] = useState(false);
  const [isStaging, setIsStaging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load documents when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);
    setSelectedDocIds([]);

    driveApi
      .getDocuments({ limit: 100 })
      .then((res) => {
        if (!isMounted) return;
        const serverDocs = res?.data || [];
        const merged = [
          ...serverDocs,
          ...INITIAL_PRACTICE_DOCS.filter(
            (m) => !serverDocs.some((s) => s.fileName === m.fileName || s._id === m._id)
          ),
        ];
        const pdfOnly = merged.filter(
          (d) =>
            (d.mimeType && d.mimeType.includes('pdf')) ||
            (d.fileName && d.fileName.toLowerCase().endsWith('.pdf'))
        );
        setDocuments(pdfOnly);
      })
      .catch(() => {
        if (!isMounted) setDocuments(INITIAL_PRACTICE_DOCS);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCategory =
        selectedCategory === 'ALL' || doc.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        doc.fileName.toLowerCase().includes(q) ||
        (doc.clientName && doc.clientName.toLowerCase().includes(q)) ||
        (doc.description && doc.description.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [documents, selectedCategory, searchQuery]);

  const handleToggleSelect = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedDocIds.length === filteredDocs.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocs.map((d) => d._id || d.id || ''));
    }
  };

  const handleConfirmStage = async () => {
    if (selectedDocIds.length === 0) return;
    setIsStaging(true);
    setErrorMsg(null);
    try {
      await onStageDocuments(selectedDocIds);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to stage documents from Cloud Drive');
    } finally {
      setIsStaging(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#1e293b] rounded-none shadow-2xl border border-[#dde2e8] dark:border-[#334155] flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#dde2e8] dark:border-[#334155] flex items-center justify-between bg-gray-50/80 dark:bg-[#0f172a]/50">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-none flex items-center justify-center text-white"
              style={{ backgroundColor: 'var(--premium-blue-dark, #31719B)' }}
            >
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Choose from Cloud Drive
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Directly import client PDFs from secure Cloud Drive folders for DSC signing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Search & Category Filter */}
        <div className="p-4 border-b border-[#dde2e8] dark:border-[#334155] flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#1e293b]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by file name or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-none border border-[#dde2e8] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white outline-none focus:border-[#31719B]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-none transition cursor-pointer whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-[#31719B] text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All Categories
            </button>
            {Object.values(DocumentCategory).map((cat) => {
              const meta = CATEGORY_MAP[cat];
              if (!meta) return null;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-none transition cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-[#31719B] text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-800 flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[260px] max-h-[460px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#31719B]" />
              <p className="text-xs">Loading Cloud Drive documents...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center text-gray-400">
              <FileText className="w-8 h-8 stroke-1 text-gray-300 dark:text-gray-600" />
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                No PDF documents found
              </p>
              <p className="text-[11px] text-gray-400 max-w-sm">
                Make sure documents are uploaded to Drive and are in PDF format.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#dde2e8] dark:border-[#334155] text-[11px] text-gray-500">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={
                      filteredDocs.length > 0 &&
                      selectedDocIds.length === filteredDocs.length
                    }
                    onChange={handleSelectAllFiltered}
                    className="w-3.5 h-3.5 rounded-none text-[#31719B] accent-[#31719B] cursor-pointer"
                  />
                  <span>Select all ({filteredDocs.length})</span>
                </label>
                <span>{selectedDocIds.length} selected</span>
              </div>

              {filteredDocs.map((doc) => {
                const id = doc._id || doc.id || '';
                const isSelected = selectedDocIds.includes(id);
                const categoryMeta = CATEGORY_MAP[doc.category];

                return (
                  <div
                    key={id}
                    onClick={() => handleToggleSelect(id)}
                    className={`flex items-center justify-between p-2.5 rounded-none border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#31719B] bg-blue-50/60 dark:bg-blue-950/40'
                        : 'border-[#dde2e8] dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Controlled by outer div click
                        className="w-3.5 h-3.5 rounded-none text-[#31719B] accent-[#31719B] cursor-pointer"
                      />
                      <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {doc.fileName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-gray-500">
                          {doc.clientName && (
                            <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300 truncate">
                              <Building className="w-3 h-3 text-gray-400 shrink-0" />
                              {doc.clientName}
                            </span>
                          )}
                          <span>·</span>
                          <span>{formatFileSize(doc.size)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-none bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {categoryMeta?.label || doc.category}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#dde2e8] dark:border-[#334155] flex items-center justify-between bg-gray-50/80 dark:bg-[#0f172a]/50">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            {selectedDocIds.length} document{selectedDocIds.length === 1 ? '' : 's'} selected
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isStaging}
              className="px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800 rounded-none border border-[#dde2e8] dark:border-[#334155] transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmStage}
              disabled={isStaging || selectedDocIds.length === 0}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#31719B] hover:bg-[#25587a] disabled:opacity-50 disabled:cursor-not-allowed rounded-none flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              {isStaging ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Import & Stage Selected ({selectedDocIds.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
