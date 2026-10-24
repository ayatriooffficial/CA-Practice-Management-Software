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
}

export interface ClientServiceSetting {
  id?: string;
  serviceId?: string;
  serviceName: string;
  category: string;
  compliance: boolean;
  recTask: 'Enabled' | 'Disabled' | string;
  recInvoice: 'Enabled' | 'Disabled' | string;
  frequency: string;
  start: string;
  target: string;
  end: string;
  invFreq?: string;
  invDay?: number | string;
  amount: number;
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
  { name: 'MD AZIZUL MIDDYA', pan: 'BPNPB2655N', mcaId: 'afaque_27@yahoo.co.in', mcaPassword: '••••••••' },
  { name: 'RAJESH KUMAR VERMA', pan: 'ABCDE1234F', mcaId: 'rajesh_mca_v3', mcaPassword: '••••••••' },
  { name: 'POOJA SINGHANIA', pan: 'BPMSP5432K', mcaId: 'pooja_singh_dir', mcaPassword: '••••••••' },
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

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-1',
    fullName: 'Rajesh Kumar Verma',
    firstName: 'Rajesh',
    middleName: 'Kumar',
    lastName: 'Verma',
    abbreviation: 'RKV',
    dob: '1984-05-14',
    aadhaarMobile: '9876543210',
    mobile: '9876543210',
    email: 'rajesh.verma@example.com',
    pan: 'ABCDE1234F',
    panAttachment: 'pan_rajesh_card.pdf',
    aadhaar: '453218907654',
    aadhaarAttachment: 'aadhaar_rajesh.pdf',
    gender: 'Male',
    address: '42/B, Civil Lines, Near High Court',
    country: 'India',
    state: 'Uttar Pradesh',
    pincode: '211001',
    nationality: 'Indian',
    policeStation: 'Civil Lines PS',
    postOffice: 'Allahabad H.O.',
    din: '08432190',
    dinAttachment: null,
    mcaId: 'rajesh_mca_v3',
    mcaPassword: '••••••••',
    referredBy: 'Adv. Suresh Sharma',
    photo: null,
    createdAt: '2026-03-12T09:30:00Z',
    updatedAt: '2026-04-02T14:15:00Z',
  },
  {
    id: 'lead-2',
    fullName: 'Pooja Sanjay Singhania',
    firstName: 'Pooja',
    middleName: 'Sanjay',
    lastName: 'Singhania',
    abbreviation: 'PSS',
    dob: '1990-11-20',
    aadhaarMobile: '9823012345',
    mobile: '9823012345',
    email: 'pooja.singhania@apexholding.in',
    pan: 'BPMSP5432K',
    panAttachment: 'pooja_pan.jpg',
    aadhaar: '674321908765',
    aadhaarAttachment: 'pooja_aadhaar_scan.pdf',
    gender: 'Female',
    address: 'Flat 904, Marvel Heights, Koregaon Park',
    country: 'India',
    state: 'Maharashtra',
    pincode: '411001',
    nationality: 'Indian',
    policeStation: 'Koregaon Park PS',
    postOffice: 'Pune H.O.',
    din: '09124567',
    dinAttachment: 'din_letter_pooja.pdf',
    mcaId: 'pooja_singh_dir',
    mcaPassword: '••••••••',
    referredBy: 'Direct Website Inquiry',
    photo: null,
    createdAt: '2026-03-20T11:20:00Z',
    updatedAt: '2026-04-08T16:45:00Z',
  },
  {
    id: 'lead-3',
    fullName: 'Amitabh Chandra Bose',
    firstName: 'Amitabh',
    middleName: 'Chandra',
    lastName: 'Bose',
    abbreviation: 'ACB',
    dob: '1976-08-04',
    aadhaarMobile: '9748011223',
    mobile: '9748011223',
    email: 'acbose@boseenterprises.com',
    pan: 'AACFB9876Q',
    panAttachment: null,
    aadhaar: '782390145612',
    aadhaarAttachment: 'aadhaar_acbose.pdf',
    gender: 'Male',
    address: '15/2, Ballygunge Circular Road',
    country: 'India',
    state: 'West Bengal',
    pincode: '700019',
    nationality: 'Indian',
    policeStation: 'Ballygunge',
    postOffice: 'Ballygunge P.O.',
    din: '01894562',
    dinAttachment: null,
    mcaId: 'acbose_v3_dir',
    mcaPassword: '••••••••',
    referredBy: 'CA Mohit Agarwal',
    photo: null,
    createdAt: '2026-03-25T14:10:00Z',
    updatedAt: '2026-04-10T10:00:00Z',
  },
  {
    id: 'lead-4',
    fullName: 'Sunita Ramanathan',
    firstName: 'Sunita',
    middleName: '',
    lastName: 'Ramanathan',
    abbreviation: 'SR',
    dob: '1988-02-17',
    aadhaarMobile: '9444055667',
    mobile: '9444055667',
    email: 'sunita.ram@chennaitrust.org',
    pan: 'CLKPR4321M',
    panAttachment: 'sunita_pan_doc.pdf',
    aadhaar: '321456789012',
    aadhaarAttachment: null,
    gender: 'Female',
    address: '24, TTK Road, Alwarpet',
    country: 'India',
    state: 'Tamil Nadu',
    pincode: '600018',
    nationality: 'Indian',
    policeStation: 'Alwarpet PS',
    postOffice: 'Teynampet S.O.',
    din: '',
    dinAttachment: null,
    mcaId: '',
    mcaPassword: '',
    referredBy: 'Trustee Board',
    photo: null,
    createdAt: '2026-04-01T08:45:00Z',
    updatedAt: '2026-04-12T12:30:00Z',
  },
  {
    id: 'lead-5',
    fullName: 'Harpreet Singh Gill',
    firstName: 'Harpreet',
    middleName: 'Singh',
    lastName: 'Gill',
    abbreviation: 'HSG',
    dob: '1992-09-28',
    aadhaarMobile: '9815099887',
    mobile: '9815099887',
    email: 'harpreet@gilllogistics.in',
    pan: 'DFGPG7890L',
    panAttachment: null,
    aadhaar: '541298763421',
    aadhaarAttachment: 'aadhaar_harpreet.pdf',
    gender: 'Male',
    address: 'SCO 112-113, Sector 34A',
    country: 'India',
    state: 'Chandigarh',
    pincode: '160022',
    nationality: 'Indian',
    policeStation: 'Sector 34 PS',
    postOffice: 'Sector 34 S.O.',
    din: '09781234',
    dinAttachment: 'din_copy_gill.pdf',
    mcaId: 'gill_mca_portal',
    mcaPassword: '••••••••',
    referredBy: 'HDFC Bank Manager',
    photo: null,
    createdAt: '2026-04-05T15:20:00Z',
    updatedAt: '2026-04-14T11:10:00Z',
  },
];

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
