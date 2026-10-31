import { API_BASE_URL, ApiResponse } from './apiClient';

export interface GstLinkItem {
  _id: string;
  client_id: string;
  gstin: string;
  legal_name: string;
  trade_name?: string;
  state_code: string;
  return_period: string;
  filing_frequency: 'Monthly' | 'Quarterly-QRMP';
  aggregate_turnover_slab: 'Up to ₹5 crore' | 'Above ₹5 crore';
  registration_type: 'Regular' | 'Composition';
  status: 'ACTIVE' | 'EXPIRED' | 'SUBMITTED' | 'REVOKED';
  created_at: string;
  expires_at?: string | null;
  submitted_at?: string;
  submission_id?: string;
  custom_slug?: string;
  custom_url?: string;
  rawToken?: string;
  publicUrl?: string;
}

export interface GstPublicContext {
  isAccessible: boolean;
  state: 'ACTIVE' | 'EXPIRED' | 'SUBMITTED' | 'REVOKED';
  message?: string;
  expiresAt?: string | null;
  submittedAt?: string;
  header: {
    gstin: string;
    legalName: string;
    tradeName?: string;
    stateCode: string;
    returnPeriod: string;
    filingFrequency: 'Monthly' | 'Quarterly-QRMP';
    turnoverSlab: 'Up to ₹5 crore' | 'Above ₹5 crore';
    registrationType: 'Regular' | 'Composition';
  };
  clientContext?: {
    enabledServices: {
      gstr1: boolean;
      gstr3b: boolean;
    };
    hasPreviousSubmission: boolean;
    previousSubmissionSummary?: {
      submissionId: string;
      returnPeriod: string;
      selectedSections?: string[];
    };
    seriesBook?: Array<{ prefix: string; lastNumber: number; docNum: number }>;
    commonDefaults?: {
      usualPos: string[];
      usualRates: number[];
      usualHsn: string[];
    };
  };
  draft?: any;
  masters: {
    taxRates: number[];
    uqc: Array<{ code: string; name: string }>;
    hsn: Array<{ hsn: string; description: string; isService?: boolean }>;
  };
}

export interface ValidationReport {
  isValid: boolean;
  hasWarnings: boolean;
  errors: Array<{ section: string; field?: string; message: string; blocking: boolean }>;
  warnings: Array<{ section: string; field?: string; message: string; blocking: boolean }>;
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === '127.0.0.1' || h === 'localhost') {
      return `http://${h}:5000/api/v1`;
    }
  }
  return API_BASE_URL;
}

export const gstFormApi = {
  // Staff methods
  async generateLink(data: {
    clientId: string;
    gstin: string;
    legalName: string;
    tradeName?: string;
    pan?: string;
    stateCode: string;
    returnPeriod: string;
    filingFrequency?: string;
    turnoverSlab?: string;
    registrationType?: string;
  }): Promise<{ linkId: string; rawToken: string; publicUrl: string; expiresAt?: string | null; status: string; customSlug?: string }> {
    const res = await fetch(`${getBaseUrl()}/gst-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    const json: ApiResponse<any> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to generate GST form link');
    }
    return json.data;
  },

  async getClientLinks(clientId: string): Promise<GstLinkItem[]> {
    const res = await fetch(`${getBaseUrl()}/gst-links/client/${clientId}`, {
      credentials: 'include',
    });
    const json: ApiResponse<GstLinkItem[]> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to load GST form links');
    }
    return json.data || [];
  },

  async revokeLink(linkId: string): Promise<any> {
    const res = await fetch(`${getBaseUrl()}/gst-links/${linkId}/revoke`, {
      method: 'POST',
      credentials: 'include',
    });
    const json: ApiResponse<any> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to revoke link');
    }
    return json.data;
  },

  async regenerateLink(linkId: string): Promise<{ linkId: string; rawToken: string; publicUrl: string; expiresAt?: string | null }> {
    const res = await fetch(`${getBaseUrl()}/gst-links/${linkId}/regenerate`, {
      method: 'POST',
      credentials: 'include',
    });
    const json: ApiResponse<any> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to regenerate link');
    }
    return json.data;
  },

  async getSubmission(submissionId: string): Promise<any> {
    const res = await fetch(`${getBaseUrl()}/gst-submissions/${submissionId}`, {
      credentials: 'include',
    });
    const json: ApiResponse<any> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to load submission');
    }
    return json.data;
  },

  // Public Form methods
  async getPublicContext(token: string): Promise<GstPublicContext> {
    const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}`);
    const json: ApiResponse<GstPublicContext> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Invalid or expired form link');
    }
    return json.data;
  },

  async saveDraft(token: string, payload: any): Promise<{ success: boolean; updatedAt: string }> {
    const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}/draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    const json: ApiResponse<any> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to auto-save draft');
    }
    return json.data;
  },

  async validateForm(token: string, payload: any): Promise<ValidationReport> {
    const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    const json: ApiResponse<ValidationReport> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Validation request failed');
    }
    return json.data;
  },

  getCsvTemplateUrl(token: string, section: string): string {
    return `${getBaseUrl()}/public/gst-form/${token}/csv-template/${section}`;
  },

  async submitForm(token: string, payload: any): Promise<any> {
    const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    const json: ApiResponse<any> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to submit form');
    }
    return json.data;
  },

  // v3 API Client Methods

  async searchRecipients(token: string, q: string): Promise<Array<{ gstin: string; name: string; state: string; lastPos?: string }>> {
    if (!q || q.trim().length < 2) return [];
    const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}/recipients?q=${encodeURIComponent(q)}`);
    const json: ApiResponse<any> = await res.json();
    return json.data || [];
  },

  async searchItems(token: string, q: string): Promise<Array<{ name: string; hsn: string; uqc: string; defaultRate: number }>> {
    if (!q || q.trim().length < 2) return [];
    const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}/items?q=${encodeURIComponent(q)}`);
    const json: ApiResponse<any> = await res.json();
    return json.data || [];
  },

  async getSeriesBook(token: string): Promise<{ series: Array<{ prefix: string; lastNumber: number; docNum: number }> }> {
    const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}/series`);
    const json: ApiResponse<any> = await res.json();
    return json.data || { series: [] };
  },

  async getCarryOver(token: string): Promise<any> {
    const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}/carry-over`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json: ApiResponse<any> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to load carry-over structure');
    }
    return json.data;
  },

  async smartMapHeaders(token: string, section: string, headers: string[]): Promise<{ mapping: Record<string, string>; dateFormat: string; isSaved: boolean }> {
    const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}/csv-import/${section}/map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headers }),
    });
    const json: ApiResponse<any> = await res.json();
    return json.data || { mapping: {}, dateFormat: 'DD/MM/YYYY', isSaved: false };
  },

  async saveImportMapping(token: string, section: string, mapping: Record<string, string>, dateFormat?: string): Promise<any> {
    const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}/csv-import/${section}/save-map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapping, dateFormat }),
    });
    const json: ApiResponse<any> = await res.json();
    return json.data;
  },

  async previewImport(token: string, section: string, data: { file?: File; fileContent?: string; fileType?: string; fileName?: string; mapping?: any; dateFormat?: string }): Promise<any> {
    if (data.file) {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('fileType', data.fileType || (data.file.name.endsWith('.xlsx') ? 'xlsx' : 'csv'));
      formData.append('fileName', data.fileName || data.file.name);
      formData.append('mapping', JSON.stringify(data.mapping || {}));
      if (data.dateFormat) formData.append('dateFormat', data.dateFormat);

      const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}/csv-import/${section}/preview`, {
        method: 'POST',
        body: formData,
      });
      const json: ApiResponse<any> = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Import preview failed');
      return json.data;
    } else {
      const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}/csv-import/${section}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<any> = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Import preview failed');
      return json.data;
    }
  },

  async deriveHsn(token: string, payload: any): Promise<any> {
    const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}/derive/hsn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    const json: ApiResponse<any> = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'HSN auto-derivation failed');
    return json.data;
  },

  async deriveDocuments(token: string, payload: any): Promise<any> {
    const res = await fetch(`${getBaseUrl()}/public/gst-form/${token}/derive/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    const json: ApiResponse<any> = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Documents auto-derivation failed');
    return json.data;
  },

  // CA Staff Master Suggestions
  async getMasterSuggestions(clientId: string): Promise<any[]> {
    const res = await fetch(`${getBaseUrl()}/gst-links/client/${clientId}/master-suggestions`, {
      credentials: 'include',
    });
    const json: ApiResponse<any> = await res.json();
    return json.data || [];
  },

  async updateSuggestionStatus(suggestionId: string, status: 'APPROVED' | 'REJECTED'): Promise<any> {
    const res = await fetch(`${getBaseUrl()}/gst-links/master-suggestions/${suggestionId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    const json: ApiResponse<any> = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update suggestion status');
    return json.data;
  },
};

