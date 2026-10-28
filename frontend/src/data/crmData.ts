export interface LeadScore {
  score: number;
  businessSize: number;
  responseTime: number;
  engagement: number;
  sourceQuality: number;
}

export interface LeadNoteItem {
  id: string;
  note: string;
  author: string;
  createdAt: string;
}

export interface LeadFollowUpTask {
  id: string;
  leadId: string;
  title: string;
  taskDate: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
  assigneeId?: string;
  assigneeName: string;
  assigneeInitials?: string;
  startTime?: string;
  endTime?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  contactMethod: 'Call' | 'Email' | 'WhatsApp' | 'Meeting';
  outcome?: string;
  author: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

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

export interface Lead {
  id: string;
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  abbreviation: string;
  dob: string;
  aadhaarMobile: string;
  mobile: string;
  email: string;
  pan: string;
  panAttachment: string | null;
  aadhaar: string;
  aadhaarAttachment: string | null;
  gender: 'Male' | 'Female' | 'Others' | 'Transgender' | '';
  address: string;
  country: string;
  state: string;
  pincode: string;
  nationality: string;
  policeStation: string;
  postOffice: string;
  din: string;
  dinAttachment: string | null;
  mcaId: string;
  mcaPassword?: string;
  referredBy: string;
  photo?: string | null;
  createdAt: string;
  updatedAt: string;
  status?: string;
  pipelineStage?: string;
  leadScore?: LeadScore;
  dealValue?: number;
  daysInStage?: number;
  businessName?: string;
  businessType?: string;
  servicesInterested?: string[];
  gstin?: string;
  detailNotes?: LeadNoteItem[];
  addressDetails?: AddressDetails;
  paymentDetails?: PaymentDetails;
}

export interface ClientLicense {
  id?: string;
  name: string;
  licenseNo?: string;
  issuedDate?: string;
  expiryDate?: string;
  url?: string;
  file?: string | null;
  fileUrl?: string;
  remarks?: string;
}

export interface ClientDsc {
  id?: string;
  dscId?: string;
  name: string;
  issuedDate?: string;
  expiryDate: string;
  binNumber?: string;
  vendor?: string;
  class?: string;
  location: 'CA Office' | 'Client Office' | 'Missing' | string;
  status: 'Active' | 'Expired' | string;
  remarks?: string;
}

export interface GlobalDsc extends ClientDsc {
  clientId: string;
  clientName: string;
  clientFileNo?: string;
}

export interface ClientDocumentInOut {
  id?: string;
  documentName: string;
  personName: string;
  date: string;
  status: 'In' | 'Out' | string;
  returnable: boolean | string;
  returnDate?: string;
  remarks?: string;
  file?: string | null;
  fileUrl?: string;
}

export interface ClientServiceSetting {
  id?: string;
  serviceId?: string;
  serviceName: string;
  category: string;
  compliance: boolean;
  isActive?: boolean;
  recTask: 'Enabled' | 'Disabled' | string;
  recInvoice: 'Enabled' | 'Disabled' | string;
  frequency: string;
  start: string;
  target: string;
  end: string;
  invFreq?: string;
  invDay?: number | string;
  amount: number;
  taskName?: string;
  priority?: string;
  assignee?: string;
  reviewer?: string;
  startDate?: string;
  targetDate?: string;
  endDate?: string;
}

export interface ClientPassword {
  id?: string;
  portal: string;
  userId: string;
  password?: string;
  url?: string;
  remarks?: string;
}

export interface ClientNote {
  id?: string;
  title: string;
  content: string;
  createdAt: string;
  author?: string;
}

export interface ClientContact {
  id?: string;
  name: string;
  isPrimary?: boolean;
  designation?: string;
  din?: string;
  dinStatus?: string;
  appointmentDate?: string;
  dob?: string;
  email?: string;
  mobile?: string;
  pan?: string;
  aadhar?: string;
  passport?: string;
  fatherName?: string;
  address?: string;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  fileNo: string;
  type: string;
  mobile: string;
  secondaryMobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  group: string;
  tags: string[];
  active: boolean;
  status?: string;
  legalName?: string;
  services: string[];
  users: string[];
  pan?: string;
  dob?: string;
  referredBy?: string;
  photo?: string | null;
  createdAt: string;
  customerFiles?: {
    promoter: any[];
    statutory: any[];
    recurring: any[];
  };
  promoters?: any[];
  contacts?: ClientContact[];
  licenses?: ClientLicense[];
  dscs?: ClientDsc[];
  documentsInOut?: ClientDocumentInOut[];
  serviceSettings?: ClientServiceSetting[];
  passwords?: ClientPassword[];
  notes?: ClientNote[];
  addressDetails?: AddressDetails;
  paymentDetails?: PaymentDetails;
}

export const STATES = [
  { code: '35', label: 'Andaman and Nicobar Islands' },
  { code: '37', label: 'Andhra Pradesh' },
  { code: '12', label: 'Arunachal Pradesh' },
  { code: '18', label: 'Assam' },
  { code: '10', label: 'Bihar' },
  { code: '04', label: 'Chandigarh' },
  { code: '22', label: 'Chhattisgarh' },
  { code: '26', label: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '07', label: 'Delhi' },
  { code: '30', label: 'Goa' },
  { code: '24', label: 'Gujarat' },
  { code: '06', label: 'Haryana' },
  { code: '02', label: 'Himachal Pradesh' },
  { code: '01', label: 'Jammu and Kashmir' },
  { code: '20', label: 'Jharkhand' },
  { code: '29', label: 'Karnataka' },
  { code: '32', label: 'Kerala' },
  { code: '38', label: 'Ladakh' },
  { code: '31', label: 'Lakshadweep' },
  { code: '23', label: 'Madhya Pradesh' },
  { code: '27', label: 'Maharashtra' },
  { code: '14', label: 'Manipur' },
  { code: '17', label: 'Meghalaya' },
  { code: '15', label: 'Mizoram' },
  { code: '13', label: 'Nagaland' },
  { code: '21', label: 'Odisha' },
  { code: '34', label: 'Puducherry' },
  { code: '03', label: 'Punjab' },
  { code: '08', label: 'Rajasthan' },
  { code: '11', label: 'Sikkim' },
  { code: '33', label: 'Tamil Nadu' },
  { code: '36', label: 'Telangana' },
  { code: '16', label: 'Tripura' },
  { code: '09', label: 'Uttar Pradesh' },
  { code: '05', label: 'Uttarakhand' },
  { code: '19', label: 'West Bengal' },
];

export const CLIENT_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership Firm' },
  { value: 'llp', label: 'LLP' },
  { value: 'huf', label: 'HUF' },
  { value: 'private-limited', label: 'Private Limited' },
  { value: 'public-limited', label: 'Limited Company' },
  { value: 'joint-venture', label: 'Joint-Venture Company' },
  { value: 'opc', label: 'One Person Company' },
  { value: 'ngo', label: 'NGO' },
  { value: 'trust', label: 'Trust' },
  { value: 'section-8', label: 'Section 8 Company' },
  { value: 'others', label: 'Other' },
];

export const CLIENT_GROUPS = [
  'Accounting',
  'Annual Filing',
  'AUDIT',
  'Bharat Traders Group',
  'Coastal Exports',
  'Delta Foods Family',
  'Evergreen Textiles',
  'GST Monthly',
  'GST Quarterly',
  'GST REGISTRATION',
  'Harbor Logistics',
  'Indigo Pharma Group',
  'Jade Jewellers',
  'Kiran Industries',
  'Lotus Hardware',
  'Maple Agencies',
  'Nova Plastics',
  'Orchid Interiors',
  'Pinnacle Steel',
  'Quartz Electronics',
  'Ruby Motors',
  'Sapphire Garments',
  'Sharma Family',
  'TDS Clients',
  'Trust Audits',
  'Verma Family',
];

export const RECURRING_SERVICES = [
  { id: 'gst-monthly', name: 'GST Monthly' },
  { id: 'gst-quarterly', name: 'GST Quarterly' },
  { id: 'income-tax', name: 'Income Tax' },
  { id: 'tds', name: 'TDS' },
  { id: 'annual-filing', name: 'Annual Filing' },
  { id: '15cb', name: '15CB' },
  { id: 'aadhar-pan-link', name: 'Aadhar Pan Link' },
  { id: 'trust-audit', name: 'Trust Audit' },
  { id: 'consultancy-fee', name: 'Consultancy fee' },
  { id: 'audit', name: 'Audit' },
];

export const CLIENT_TAGS: Record<string, { label: string; bg: string; text: string }> = {
  '15cb': { label: '15CB', bg: '#e7f1fb', text: '#31719B' },
  'priority': { label: 'Priority', bg: '#fdeaea', text: '#e8655a' },
  'new-client': { label: 'New Client', bg: '#e6f6ec', text: '#1d8a4d' },
  'gst-monthly': { label: 'GST Monthly', bg: '#e3f4f4', text: '#117a7a' },
  'income-tax': { label: 'Income Tax', bg: '#fdf1e3', text: '#b86410' },
  'annual-filing': { label: 'Annual Filing', bg: '#e7f1fb', text: '#3D88BF' },
  'aadhar-pan-link': { label: 'Aadhaar Link', bg: '#f3e8ff', text: '#7e22ce' },
  'tds': { label: 'TDS', bg: '#f0fdf4', text: '#15803d' },
  'trust-audit': { label: 'Trust Audit', bg: '#f5e9f9', text: '#9b3fb8' },
  'consultancy-fee': { label: 'Advisory', bg: '#e6f6ec', text: '#1d8a4d' },
};

/* Customer Files Master Data & Promoters */
export const PROMOTERS = [
  { name: 'MD TAUSEF AHMED', pan: 'APNPA2652N', mcaId: 'sabmiswb@gmail.com', mcaPassword: '••••••••' },
];

export const STATUTORY_TYPES = [
  'PAN',
  'TAN',
  'Traces',
  'ROC',
  'EPFO',
  'ESIC',
  'P-Tax',
  'P-Tax Registration',
];

export const SERVICE_CATEGORIES = [
  'E.P.F.P',
  'E.S.I.C',
  'G.S.T',
  'Import Export',
  'Income Tax',
  'M.S.M.E',
  'Profession Tax',
  'R.O.C',
  'Shram Suvida',
  'Trade License',
];

export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_CLIENTS: Client[] = [];

export const MOCK_GSTIN_REGISTRY: Record<
  string,
  { legalName: string; type: string; address: string; city: string; state: string; pincode: string; pan: string }
> = {
  '24AAKCA1234F1Z5': {
    legalName: 'SUNRISE ENTERPRISES PRIVATE LIMITED',
    type: 'private-limited',
    address: '402, Sample Plaza, MG Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380015',
    pan: 'AAKCA1234F',
  },
  '27AABFV5678K1ZP': {
    legalName: 'MAPLE TRADING CO',
    type: 'partnership',
    address: 'Unit 12, Demo Industrial Estate',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400093',
    pan: 'AABFV5678K',
  },
  '07AAACS1429B1ZB': {
    legalName: 'SUPREME CONSULTANCY SERVICES LLP',
    type: 'llp',
    address: 'B-14, Barakhamba Road, Connaught Place',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    pan: 'AAACS1429B',
  },
};
