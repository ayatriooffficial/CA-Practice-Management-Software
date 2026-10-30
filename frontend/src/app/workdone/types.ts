export interface WorkDoneService {
  serviceId?: string;
  serviceName: string;
  description?: string;

  // Invoice details
  invoiceId?: string;
  invoiceNumber?: string;
  receiptNo?: string;

  // Service period
  frequency: string;
  period: string;
  compliancePeriod?: string;
  financialYear?: string;

  // Fee breakdown
  governmentFee: number;
  professionalFee: number;
  tax: string;
  gstRate: number;
  gstAmount: number;
  totalServiceFee: number;

  // Amounts
  total: number;
  invoiceCost: number;
  cost: number;
  paid: number;

  // Payment details
  paymentDate?: string | Date;
  paymentMethod?: string;
  referenceNumber?: string;
  isAdvance?: boolean;
}

export interface WorkDoneClient {
  clientId: string;
  businessName: string;
  legalName: string;
  totalCost: number;
  totalPaid: number;
  services: WorkDoneService[];
}

export interface WorkDoneApiResponse {
  success: boolean;
  data: WorkDoneClient[];
}

export type WorkDoneFrequency =
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "YEARLY"
  | "ONE_TIME";

export interface WorkDonePeriod {
  name: string;
  label: string;
  start: number;
  span: number;
}


export interface Client {
  clientId: string;
  businessName: string;
  legalName: string;
  totalCost: number;
  totalPaid: number;
  services: WorkDoneService[];
}


export interface SelectedPeriod {
  serviceName: string;
  frequency: string;
  periodLabel: string;
  receipts: WorkDoneService[];

  governmentFee: number;
  professionalFee: number;
  tax: string;
  gstAmount: number;
  totalServiceFee: number;
  total: number;
}
