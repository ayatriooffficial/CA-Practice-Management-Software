import { request, ApiResponse } from './apiClient';

export interface QuotationItem {
  id?: string;
  _id?: string;
  serviceId?: string | null;
  serviceName: string;
  hsnSac?: string;
  quantity: number;
  price: number;
  discountType?: 'percentage' | 'flat';
  discountValue?: number;
  taxRate: number;
  sgst?: number;
  cgst?: number;
  igst?: number;
  amount: number;
  total: number;
  description?: string;
  isReimbursement?: boolean;
}

export interface BillingOrgDetails {
  orgId?: string | null;
  name: string;
  address: string;
  priority?: string;
  gstin?: string;
  pan?: string;
  lutNumber?: string;
  lutDisabled?: boolean;
  email?: string;
  mobile?: string;
  website?: string;
}

export interface QuotationToDetails {
  leadId?: string | null;
  clientId?: string | null;
  businessName?: string;
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state: string;
  stateCode?: string;
  placeOfSupply?: string;
  gstin?: string;
  pan?: string;
  email?: string;
  mobile?: string;
}

export interface QuotationBankDetails {
  paymentType: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  accountType: string;
  bankBranch: string;
  upi?: string;
  currencyCode: string;
}

export interface Quotation {
  id: string;
  _id?: string;
  quotationNo: string;
  quotationDate: string;
  dueDate: string;
  status: 'Draft' | 'Pending' | 'Accepted' | 'Rejected' | 'Expired';
  template: 'Aura' | 'Classic' | 'Modern';
  billingOrg: BillingOrgDetails;
  quotationTo: QuotationToDetails;
  bankDetails: QuotationBankDetails;
  items: QuotationItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  notes?: string;
  terms?: string;
  leadId?: string | null;
  clientId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationQueryParams {
  leadId?: string;
  clientId?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const quotationApi = {
  getQuotations: async (params: QuotationQueryParams = {}): Promise<ApiResponse<Quotation[]>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.leadId) searchParams.set('leadId', params.leadId);
    if (params.clientId) searchParams.set('clientId', params.clientId);
    if (params.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return request<Quotation[]>(`/quotations${query ? `?${query}` : ''}`);
  },

  getQuotationById: async (id: string): Promise<ApiResponse<Quotation>> => {
    return request<Quotation>(`/quotations/${id}`);
  },

  createQuotation: async (data: Partial<Quotation>): Promise<ApiResponse<Quotation>> => {
    return request<Quotation>('/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateQuotation: async (id: string, data: Partial<Quotation>): Promise<ApiResponse<Quotation>> => {
    return request<Quotation>(`/quotations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteQuotation: async (id: string): Promise<ApiResponse<{ id: string; message: string }>> => {
    return request<{ id: string; message: string }>(`/quotations/${id}`, {
      method: 'DELETE',
    });
  },
};
