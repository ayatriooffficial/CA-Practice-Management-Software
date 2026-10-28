import { request, ApiResponse, API_BASE_URL } from './apiClient';

export interface SignerStatusResponse {
  provider: 'software' | 'token';
  available: boolean;
  detail: string;
  certificates: Array<{
    certId: string;
    subject: string;
    issuer: string;
    serialNumber: string;
    validFrom: string;
    validTo: string;
    fingerprintSha256: string;
  }>;
}

export interface SignedDocItem {
  id: string;
  _id?: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  originalSha256: string;
  status: 'Ready' | 'Password protected' | 'Signed' | 'Verified' | 'Tampered' | 'Unsigned' | 'Failed';
  passwordProtected: boolean;
  clientId?: string;
  clientName?: string;
  signedPath?: string;
  signedSha256?: string;
  signedAt?: string;
  signedBy?: string;
  dscRecordId?: string;
  providerId?: string;
  certFingerprint?: string;
  certSerial?: string;
  signatureReason?: string;
  signatureLocation?: string;
  signaturePage?: string;
  signaturePlacement?: {
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
  };
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListDocumentsResponse {
  items: SignedDocItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SignBatchPayload {
  documentIds: string[];
  dscRecordId: string;
  reason?: string;
  location?: string;
  page: 'First' | 'Last' | 'Custom';
  customPages?: number[];
  placement: {
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
  };
  appearance: {
    showSignerName: boolean;
    showDateTime: boolean;
    showReasonLocation: boolean;
  };
}

export interface SignBatchResponse {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    documentId: string;
    fileName: string;
    success: boolean;
    status: string;
    error?: string;
  }>;
}

export interface VerificationResponse {
  isSigned: boolean;
  isValid: boolean;
  coversWholeFile: boolean;
  contentTampered: boolean;
  signatureTampered: boolean;
  signingTime: string | null;
  signer: {
    commonName: string;
    subject: string;
    issuer: string;
    serialNumber: string;
    validFrom: string;
    validTo: string;
    isValidAtSigningTime: boolean;
    isExpiredNow: boolean;
  } | null;
  trust: {
    status: 'trusted' | 'unknown_signer' | 'untrusted';
    description: string;
  };
  details: {
    byteRange: number[];
    fileSize: number;
    expectedDigestHex: string;
    computedDigestHex: string;
  } | null;
  tamperReason?: string;
  error?: string;
}


export interface AuditTrailItem {
  id: string;
  userId: string;
  action: 'upload' | 'sign_success' | 'sign_failure' | 'verify' | 'download';
  documentId: string;
  documentName: string;
  timestamp: string;
  dscRecordId?: string;
  providerId?: string;
  certFingerprint?: string;
  certSerial?: string;
  originalSha256?: string;
  signedSha256?: string;
  errorDetail?: string;
  metadata?: Record<string, any>;
}

export const pdfSignerApi = {
  /**
   * Get truthful provider status
   */
  getStatus: async (): Promise<ApiResponse<SignerStatusResponse>> => {
    return request<SignerStatusResponse>('/pdf-signer/signer/status', {
      method: 'GET',
    });
  },

  /**
   * List uploaded and signed documents
   */
  listDocuments: async (params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<ListDocumentsResponse>> => {
    const searchParams = new URLSearchParams();
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.status && params.status !== 'All') searchParams.set('status', params.status);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return request<ListDocumentsResponse>(`/pdf-signer${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * Upload batch of PDF documents (multipart)
   */
  uploadDocuments: async (files: File[]): Promise<ApiResponse<SignedDocItem[]>> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    return request<SignedDocItem[]>('/pdf-signer/documents', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Update client association on an uploaded document
   */
  updateClient: async (
    id: string,
    payload: { clientId?: string; clientName?: string }
  ): Promise<ApiResponse<SignedDocItem>> => {
    return request<SignedDocItem>(`/pdf-signer/documents/${id}/client`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Sign batch of documents
   */
  signBatch: async (payload: SignBatchPayload): Promise<ApiResponse<SignBatchResponse>> => {
    return request<SignBatchResponse>('/pdf-signer/sign', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Retry signing a failed document
   */
  retryDocument: async (id: string): Promise<ApiResponse<SignBatchResponse>> => {
    return request<SignBatchResponse>(`/pdf-signer/documents/${id}/retry`, {
      method: 'POST',
    });
  },

  /**
   * Get direct download URL for a document
   */
  getDownloadUrl: (id: string): string => {
    return `${API_BASE_URL}/pdf-signer/documents/${id}/download`;
  },

  /**
   * Download selected documents as ZIP archive
   */
  downloadZip: async (documentIds: string[]): Promise<Blob> => {
    const res = await fetch(`${API_BASE_URL}/pdf-signer/documents/download-zip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documentIds }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Download failed');
      throw new Error(errText || 'Failed to download ZIP archive');
    }

    return await res.blob();
  },

  /**
   * Verify digital signature on stored signed document
   */
  verifyDocument: async (id: string): Promise<ApiResponse<VerificationResponse>> => {
    return request<VerificationResponse>(`/pdf-signer/documents/${id}/verify`, {
      method: 'POST',
    });
  },

  /**
   * Get read-only audit trail
   */
  getAuditTrail: async (id: string): Promise<ApiResponse<AuditTrailItem[]>> => {
    return request<AuditTrailItem[]>(`/pdf-signer/documents/${id}/audit`, {
      method: 'GET',
    });
  },

  /**
   * Delete staged / unsigned document
   */
  deleteDocument: async (id: string): Promise<ApiResponse<{ id: string; deleted: boolean }>> => {
    return request<{ id: string; deleted: boolean }>(`/pdf-signer/documents/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Verify an uploaded PDF for cryptographic authenticity and store directly in verified table
   */
  verifyUploadedFile: async (
    file: File,
    clientId?: string,
    clientName?: string
  ): Promise<ApiResponse<{ document: SignedDocItem; report: VerificationResponse }>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (clientId) formData.append('clientId', clientId);
    if (clientName) formData.append('clientName', clientName);

    return request<{ document: SignedDocItem; report: VerificationResponse }>('/pdf-signer/verify-upload', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Verify a staged document and transfer it directly to verified documents table
   */
  verifyStagedDocument: async (
    id: string
  ): Promise<ApiResponse<{ document: SignedDocItem; report: VerificationResponse }>> => {
    return request<{ document: SignedDocItem; report: VerificationResponse }>(
      `/pdf-signer/documents/${id}/verify-staged`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Stage a document directly from Drive into PDF Signer
   */
  stageFromDrive: async (driveDocumentId: string): Promise<ApiResponse<SignedDocItem>> => {
    return request<SignedDocItem>('/pdf-signer/stage-from-drive', {
      method: 'POST',
      body: JSON.stringify({ driveDocumentId }),
    });
  },

  /**
   * Stage an invoice PDF directly into PDF Signer
   */
  stageInvoice: async (payload: {
    invoiceNumber: string;
    clientName: string;
    clientId?: string;
    date?: string;
    dueDate?: string;
    totalAmount: number;
    services?: Array<{ serviceName: string; amount: number; description?: string }>;
    billingOrg?: string;
  }): Promise<ApiResponse<SignedDocItem>> => {
    return request<SignedDocItem>('/pdf-signer/stage-invoice', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};



