import { request, ApiResponse } from './apiClient';

export interface AddressDetails {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  country?: string;
  landmark?: string;
}

export interface BankDetails {
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  ifscCode?: string;
  branchName?: string;
  accountType?: string;
  upiId?: string;
  qrCodeUrl?: string;
}

export interface PaymentDetails {
  bankDetails?: BankDetails;
  paymentMode?: string;
  currency?: string;
  terms?: string;
  isDefault?: boolean;
}

export interface OrganizationDetails {
  id?: string;
  _id?: string;
  name: string;
  code?: string;
  pan?: string;
  gstin?: string;
  email?: string;
  mobile?: string;
  website?: string;
  lutNumber?: string;
  lutDisabled?: boolean;
  address?: string;
  addressDetails?: AddressDetails;
  paymentDetails?: PaymentDetails;
  currency?: string;
  businessEntity?: string;
  businessType?: string;
  isGstRegistered?: boolean;
  cinNumber?: string;
  tanNumber?: string;
  udyamNumber?: string;
  msmeCategory?: string;
  professionalTaxNumber?: string;
  providentFundNumber?: string;
  esiRegistrationNumber?: string;
  invoiceSettings?: Record<string, any>;
  businessHours?: Record<string, any>;
  integrations?: Record<string, any>;
  onboardingStep?: number;
  onboardingCompleted?: boolean;
  totalSeats?: number;
  isActive?: boolean;
}

export const organizationApi = {
  getOrganization: async (orgId?: string): Promise<ApiResponse<OrganizationDetails>> => {
    return request<OrganizationDetails>(`/auth/organization${orgId ? `?orgId=${orgId}` : ''}`);
  },

  updateOrganization: async (payload: Partial<OrganizationDetails>): Promise<ApiResponse<OrganizationDetails>> => {
    return request<OrganizationDetails>('/auth/organization', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
