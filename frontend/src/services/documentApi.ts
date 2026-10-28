import { request, ApiResponse, API_BASE_URL } from './apiClient';

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
  category: string;
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
  uploadedAt?: string;
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

export interface PersonItem {
  id: string;
  entityType: 'client' | 'team';
  name: string;
  legalName?: string;
  identifier: string; // CLT-XXXX or EMP-XXXX
  type: string;       // Private Limited / Individual / Role
  email: string;
  mobile: string;
  pan?: string;
  group?: string;     // Group or Department
  department?: string;
  status: string;
  city?: string;
  state?: string;
  address?: string;
  documentCount: number;
  availableCount?: number;
  pendingCount?: number;
  createdAt?: string;
}

export interface AssociatedDocument {
  id: string;
  fileName: string;
  sanitizedFileName?: string;
  category: string;
  size: number;
  mimeType: string;
  uploadedBy?: string;
  storageProvider: 'google-drive' | 'local-fallback';
  webViewLink?: string;
  downloadUrl: string;
  previewUrl: string;
  description?: string;
  tags?: string[];
  createdAt?: string;
}

export interface PersonDetail {
  person: PersonItem & {
    secondaryMobile?: string;
    dob?: string;
    pincode?: string;
    services?: string[];
    promoters?: Array<{
      key?: number;
      name: string;
      pan?: string;
      share?: string;
      designation?: string;
      mcaId?: string;
    }>;
    statutory?: Array<{
      key?: number;
      type: string;
      idNo: string;
      userId?: string;
      attachment?: string | null;
    }>;
    licenses?: Array<{
      id?: string;
      name: string;
      licenseNo?: string;
      issuedDate?: string;
      expiryDate?: string;
      url?: string;
      file?: string | null;
      fileUrl?: string;
      remarks?: string;
    }>;
    dscs?: Array<{
      id?: string;
      dscId?: string;
      name: string;
      issuedDate?: string;
      expiryDate?: string;
      vendor?: string;
      class?: string;
      location?: string;
      status?: string;
      remarks?: string;
    }>;
    documentsInOut?: Array<{
      id?: string;
      documentName: string;
      personName?: string;
      date?: string;
      status?: string;
      returnable?: string | boolean;
      returnDate?: string;
      remarks?: string;
      file?: string | null;
    }>;
    role?: string;
    designation?: string;
    shift?: string;
    firmName?: string;
    initials?: string;
  };
  documents: AssociatedDocument[];
  requirements: DocumentRequirementItem[];
  summary: DocumentRequirementSummary;
}

export interface SearchPeopleParams {
  search?: string;
  type?: 'all' | 'client' | 'team';
  page?: number;
  limit?: number;
}

export interface PeopleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: PersonItem[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const documentApi = {
  /**
   * Search authorized people across clients and team members
   */
  searchPeople: async (params: SearchPeopleParams = {}): Promise<PeopleResponse> => {
    const searchParams = new URLSearchParams();
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.type && params.type !== 'all') searchParams.set('type', params.type);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    const url = `/documents/people${queryString ? `?${queryString}` : ''}`;
    return request<PersonItem[]>(url) as Promise<PeopleResponse>;
  },

  /**
   * Fetch full details, requirements, and associated documents for a person
   */
  getPersonDetails: async (id: string): Promise<ApiResponse<PersonDetail>> => {
    return request<PersonDetail>(`/documents/people/${id}`);
  },

  /**
   * Upload a new document and associate it with a specific person.
   * Can accept requirementId / taskDocId in the FormData to update requirements dynamically.
   */
  uploadPersonDocument: async (
    personId: string,
    formData: FormData
  ): Promise<ApiResponse<AssociatedDocument>> => {
    return request<AssociatedDocument>(`/documents/people/${personId}/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Generate direct download URL
   */
  getDownloadUrl: (docId: string): string => {
    return `${API_BASE_URL}/drive/${docId}/download`;
  },

  /**
   * Generate inline preview URL
   */
  getPreviewUrl: (docId: string): string => {
    return `${API_BASE_URL}/drive/${docId}/preview`;
  },
};
