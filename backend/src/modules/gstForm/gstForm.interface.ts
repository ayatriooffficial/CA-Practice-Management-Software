import { Document, Types } from 'mongoose';

export type GstLinkStatus = 'ACTIVE' | 'EXPIRED' | 'SUBMITTED' | 'REVOKED';
export type FilingFrequency = 'Monthly' | 'Quarterly-QRMP';
export type TurnoverSlab = 'Up to ₹5 crore' | 'Above ₹5 crore';
export type RegistrationType = 'Regular' | 'Composition';

export interface IGstFormLink extends Document {
  client_id: Types.ObjectId;
  gstin: string;
  legal_name: string;
  trade_name: string;
  state_code: string;
  return_period: string; // MMYYYY (e.g. 102026)
  filing_frequency: FilingFrequency;
  aggregate_turnover_slab: TurnoverSlab;
  registration_type: RegistrationType;
  token_hash: string;
  custom_slug?: string;
  custom_url?: string;
  status: GstLinkStatus;
  created_by?: string;
  created_at: Date;
  expires_at: Date;
  submitted_at?: Date | null;
  revoked_at?: Date | null;
  superseded_by?: Types.ObjectId | null;
  isExpired(): boolean;
}

export interface IGstFormDraft extends Document {
  link_id: Types.ObjectId;
  payload: any;
  updated_at: Date;
}

// B2B Section Types
export type InvoiceType = 'R' | 'DE' | 'SEWP' | 'SEWOP' | 'CBW';

export interface Gstr1RateItem {
  rt: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
  // Internal helper fields
  hsn?: string;
  uqc?: string;
  qty?: number;
}

export interface Gstr1B2BInvoice {
  id: string;
  inv_type: InvoiceType;
  rchrg: boolean;
  diff_percent?: number; // 0.65 if checked
  ctin: string; // Recipient GSTIN
  cname: string; // Recipient Name
  name_as_in_master?: string;
  inum: string;
  idt: string; // DD/MM/YYYY
  val: number;
  pos: string; // e.g. "07-Delhi" or "07"
  sply_ty: 'Intra-State' | 'Inter-State';
  srctyp: 'Manual' | 'E-Invoice';
  irn?: string;
  irngendate?: string;
  items: Gstr1RateItem[];
}

export interface Gstr1B2CLInvoice {
  id: string;
  pos: string;
  inum: string;
  idt: string;
  val: number;
  diff_percent?: number;
  etin?: string; // E-commerce operator GSTIN
  items: Gstr1RateItem[];
}

export interface Gstr1B2CSItem {
  id: string;
  pos: string;
  sply_ty: 'INTRA' | 'INTER';
  typ: 'OE';
  rt: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
  diff_percent?: number;
}

export interface Gstr1NilSupplyRow {
  sply_ty: 'INTRB2B' | 'INTRAB2B' | 'INTRB2C' | 'INTRAB2C';
  label: string;
  nil_amt: number;
  expt_amt: number;
  ngsup_amt: number;
}

export interface Gstr1CdnItem {
  id: string;
  registered: boolean;
  ctin?: string;
  cname?: string;
  ntty: 'C' | 'D'; // Credit or Debit
  nt_num: string;
  nt_dt: string;
  val: number;
  pos: string;
  rchrg?: boolean;
  inv_typ?: InvoiceType;
  diff_percent?: number;
  p_gst?: 'Y' | 'N';
  inum?: string; // original invoice no
  idt?: string; // original invoice date
  ur_type?: 'B2CL' | 'EXPWP' | 'EXPWOP'; // for unregistered CDN
  items: Gstr1RateItem[];
}

export interface Gstr1HsnItem {
  id: string;
  tab: 'B2B' | 'B2C';
  hsn_sc: string;
  desc: string;
  product_name?: string;
  desc_master?: string;
  uqc: string;
  qty: number;
  txval: number;
  rt: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface Gstr1DocSeries {
  id: string;
  num: number;
  from: string;
  to: string;
  totnum: number;
  cancel: number;
  net_issue: number;
}

export interface Gstr1DocNatureSection {
  doc_num: number; // 1 to 12
  name: string;
  docs: Gstr1DocSeries[];
}

// Complete GSTR-1 Payload State
export interface Gstr1Payload {
  is_nil: boolean;
  b2b: Gstr1B2BInvoice[];
  b2cl: Gstr1B2CLInvoice[];
  b2cs: Gstr1B2CSItem[];
  nil: Gstr1NilSupplyRow[];
  cdnr: Gstr1CdnItem[];
  cdnur: Gstr1CdnItem[];
  hsn_b2b: Gstr1HsnItem[];
  hsn_b2c: Gstr1HsnItem[];
  doc_issue: Gstr1DocNatureSection[];
}

// Complete GSTR-3B Payload State
export interface Gstr3BPayload {
  is_nil: boolean;
  table3_1: {
    osup_det: { txval: number; iamt: number; camt: number; samt: number; csamt: number };
    osup_zero: { txval: number; iamt: number; csamt: number };
    osup_nil_exmp: { txval: number };
    isup_rev: { txval: number; iamt: number; camt: number; samt: number; csamt: number };
    osup_nongst: { txval: number };
  };
  table3_1_1?: {
    eco_taxable: { txval: number; iamt: number; camt: number; samt: number; csamt: number };
    eco_registered: { txval: number; iamt: number; camt: number; samt: number; csamt: number };
  };
  table3_2: Array<{
    group: 'unreg' | 'comp' | 'uin';
    pos: string;
    txval: number;
    iamt: number;
  }>;
  table4: {
    itc_avl: {
      impg: { iamt: number; csamt: number };
      imps: { iamt: number; csamt: number };
      isrc: { iamt: number; camt: number; samt: number; csamt: number };
      isd: { iamt: number; camt: number; samt: number; csamt: number };
      oth: { iamt: number; camt: number; samt: number; csamt: number };
    };
    itc_rev: {
      rul: { iamt: number; camt: number; samt: number; csamt: number };
      oth: { iamt: number; camt: number; samt: number; csamt: number };
    };
    itc_net: { iamt: number; camt: number; samt: number; csamt: number };
    itc_inelg: {
      rul: { iamt: number; camt: number; samt: number; csamt: number };
      oth: { iamt: number; camt: number; samt: number; csamt: number };
    };
  };
  table5: {
    comp_nil: { inter: number; intra: number };
    non_gst: { inter: number; intra: number };
  };
  table5_1: {
    interest: { iamt: number; camt: number; samt: number; csamt: number };
    late_fee: { camt: number; samt: number };
  };
  previous_period_liability?: {
    period?: string;
    iamt: number;
    camt: number;
    samt: number;
    csamt: number;
  };
  verification: {
    declared: boolean;
    signatory_name: string;
    date: string;
    place: string;
  };
}

export interface ValidationErrorItem {
  section: string;
  field?: string;
  message: string;
  blocking: boolean; // true = blocking error, false = warning
}

export interface ValidationReport {
  isValid: boolean;
  hasWarnings: boolean;
  errors: ValidationErrorItem[];
  warnings: ValidationErrorItem[];
}

export interface IGstFormSubmission extends Document {
  link_id: Types.ObjectId;
  client_id: Types.ObjectId;
  gstin: string;
  return_period: string;
  schema_version: string;
  gstr1: any; // Canonical GSTN GSTR-1
  gstr3b: any; // Canonical GSTN GSTR-3B
  raw_draft: {
    gstr1: Gstr1Payload;
    gstr3b: Gstr3BPayload;
  };
  validation_report: ValidationReport;
  payload_sha256: string;
  submitted_at: Date;
  submitted_ip?: string;
  user_agent?: string;
  file_paths?: {
    gstr1: string;
    gstr3b: string;
    meta: string;
  };
}

// v3 Enhancements

export interface IClientImportMapping extends Document {
  client_id: Types.ObjectId;
  section: string;
  mapping: Record<string, string>;
  date_format: string;
  created_at: Date;
  updated_at: Date;
}

export type SuggestionKind = 'RECIPIENT' | 'ITEM';
export type SuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IClientMasterSuggestion extends Document {
  client_id: Types.ObjectId;
  kind: SuggestionKind;
  payload: any;
  source_submission_id?: Types.ObjectId;
  status: SuggestionStatus;
  created_at: Date;
}

export interface IGstImportBatch extends Document {
  link_id: Types.ObjectId;
  section: string;
  file_name: string;
  row_count: number;
  valid_count: number;
  error_count: number;
  created_at: Date;
}

export interface SharedRecipient {
  gstin: string;
  name: string;
  state: string;
  lastPos?: string;
}

export interface SharedItem {
  name: string;
  hsn: string;
  uqc: string;
  defaultRate: number;
}

export interface SharedSeries {
  prefix: string;
  lastNumber: number;
}

export interface SharedBook {
  recipients: SharedRecipient[];
  items: SharedItem[];
  series: SharedSeries[];
  stickyDefaults?: {
    lastDate?: string;
    lastPos?: string;
    lastRate?: number;
  };
}

export interface ClientContext {
  header: {
    gstin: string;
    legalName: string;
    tradeName?: string;
    stateCode: string;
    returnPeriod: string;
    filingFrequency: FilingFrequency;
    turnoverSlab: TurnoverSlab;
    registrationType: RegistrationType;
  };
  enabledServices: {
    gstr1: boolean;
    gstr3b: boolean;
  };
  hasPreviousSubmission: boolean;
  previousSubmissionSummary?: {
    submissionId: string;
    returnPeriod: string;
    selectedSections?: string[];
    b2csPosRates?: Array<{ pos: string; rate: number }>;
    seriesList?: Array<{ prefix: string; lastNumber: number; docNum: number }>;
    hsnList?: Array<{ hsn: string; uqc: string; rate: number }>;
  };
  seriesBook: Array<{ prefix: string; lastNumber: number; docNum: number }>;
  commonDefaults: {
    usualPos: string[];
    usualRates: number[];
    usualHsn: string[];
  };
}
