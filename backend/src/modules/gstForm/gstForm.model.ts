import { Schema, model } from 'mongoose';
import {
  IGstFormLink,
  IGstFormDraft,
  IGstFormSubmission,
} from './gstForm.interface';

// 1. Link Model
const gstFormLinkSchema = new Schema<IGstFormLink>(
  {
    client_id: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    gstin: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    legal_name: {
      type: String,
      required: true,
      trim: true,
    },
    trade_name: {
      type: String,
      trim: true,
      default: '',
    },
    state_code: {
      type: String,
      required: true,
      trim: true,
    },
    return_period: {
      type: String,
      required: true,
      trim: true, // MMYYYY e.g. 102026
      index: true,
    },
    filing_frequency: {
      type: String,
      enum: ['Monthly', 'Quarterly-QRMP'],
      default: 'Monthly',
    },
    aggregate_turnover_slab: {
      type: String,
      default: 'Up to ₹5 crore',
    },
    registration_type: {
      type: String,
      enum: ['Regular', 'Composition'],
      default: 'Regular',
    },
    token_hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    custom_slug: {
      type: String,
      default: '',
      index: true,
    },
    custom_url: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'SUBMITTED', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    created_by: {
      type: String,
      default: null,
    },
    expires_at: {
      type: Date,
      default: null,
      index: true,
    },
    submitted_at: {
      type: Date,
      default: null,
    },
    revoked_at: {
      type: Date,
      default: null,
    },
    superseded_by: {
      type: Schema.Types.ObjectId,
      ref: 'GstFormLink',
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'gst_form_links',
  }
);

// Method to verify if active or expired
gstFormLinkSchema.methods.isExpired = function (): boolean {
  return false;
};

export const GstFormLinkModel = model<IGstFormLink>(
  'GstFormLink',
  gstFormLinkSchema
);

// 2. Draft Model
const gstFormDraftSchema = new Schema<IGstFormDraft>(
  {
    link_id: {
      type: Schema.Types.ObjectId,
      ref: 'GstFormLink',
      required: true,
      unique: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updated_at' },
    collection: 'gst_form_drafts',
  }
);

export const GstFormDraftModel = model<IGstFormDraft>(
  'GstFormDraft',
  gstFormDraftSchema
);

// 3. Submission Model
const gstFormSubmissionSchema = new Schema<IGstFormSubmission>(
  {
    link_id: {
      type: Schema.Types.ObjectId,
      ref: 'GstFormLink',
      required: true,
      index: true,
    },
    client_id: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    gstin: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    return_period: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    schema_version: {
      type: String,
      default: '1.0.0',
    },
    gstr1: {
      type: Schema.Types.Mixed,
      required: true,
    },
    gstr3b: {
      type: Schema.Types.Mixed,
      required: true,
    },
    raw_draft: {
      type: Schema.Types.Mixed,
      required: true,
    },
    validation_report: {
      type: Schema.Types.Mixed,
      default: () => ({ isValid: true, errors: [], warnings: [] }),
    },
    payload_sha256: {
      type: String,
      required: true,
    },
    submitted_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    submitted_ip: {
      type: String,
      default: '',
    },
    user_agent: {
      type: String,
      default: '',
    },
    file_paths: {
      gstr1: { type: String, default: '' },
      gstr3b: { type: String, default: '' },
      meta: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
    collection: 'gst_form_submissions',
  }
);

export const GstFormSubmissionModel = model<IGstFormSubmission>(
  'GstFormSubmission',
  gstFormSubmissionSchema
);

// 4. Normalized Models for Reporting & Querying (Section 9.1)
const gstr1B2BSchema = new Schema(
  {
    submission_id: { type: Schema.Types.ObjectId, ref: 'GstFormSubmission', index: true },
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
    gstin: { type: String, index: true },
    return_period: { type: String, index: true },
    ctin: { type: String, index: true },
    cname: String,
    inum: String,
    idt: String,
    val: Number,
    pos: String,
    rchrg: Boolean,
    inv_typ: String,
    items: [Schema.Types.Mixed],
  },
  { timestamps: true, collection: 'gstr1_b2b_invoices' }
);
export const Gstr1B2BModel = model('Gstr1B2BInvoice', gstr1B2BSchema);

const gstr1B2clSchema = new Schema(
  {
    submission_id: { type: Schema.Types.ObjectId, ref: 'GstFormSubmission', index: true },
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
    gstin: { type: String, index: true },
    return_period: { type: String, index: true },
    pos: String,
    inum: String,
    idt: String,
    val: Number,
    items: [Schema.Types.Mixed],
  },
  { timestamps: true, collection: 'gstr1_b2cl' }
);
export const Gstr1B2clModel = model('Gstr1B2cl', gstr1B2clSchema);

const gstr1B2csSchema = new Schema(
  {
    submission_id: { type: Schema.Types.ObjectId, ref: 'GstFormSubmission', index: true },
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
    gstin: { type: String, index: true },
    return_period: { type: String, index: true },
    pos: String,
    sply_ty: String,
    typ: { type: String, default: 'OE' },
    rt: Number,
    txval: Number,
    iamt: Number,
    camt: Number,
    samt: Number,
    csamt: Number,
  },
  { timestamps: true, collection: 'gstr1_b2cs' }
);
export const Gstr1B2csModel = model('Gstr1B2cs', gstr1B2csSchema);

const gstr1CdnSchema = new Schema(
  {
    submission_id: { type: Schema.Types.ObjectId, ref: 'GstFormSubmission', index: true },
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
    gstin: { type: String, index: true },
    return_period: { type: String, index: true },
    registered: Boolean,
    ctin: String,
    cname: String,
    ntty: String,
    nt_num: String,
    nt_dt: String,
    val: Number,
    pos: String,
    items: [Schema.Types.Mixed],
  },
  { timestamps: true, collection: 'gstr1_cdn' }
);
export const Gstr1CdnModel = model('Gstr1Cdn', gstr1CdnSchema);

const gstr1NilSchema = new Schema(
  {
    submission_id: { type: Schema.Types.ObjectId, ref: 'GstFormSubmission', index: true },
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
    gstin: { type: String, index: true },
    return_period: { type: String, index: true },
    sply_ty: String,
    nil_amt: Number,
    expt_amt: Number,
    ngsup_amt: Number,
  },
  { timestamps: true, collection: 'gstr1_nil' }
);
export const Gstr1NilModel = model('Gstr1Nil', gstr1NilSchema);

const gstr1HsnSchema = new Schema(
  {
    submission_id: { type: Schema.Types.ObjectId, ref: 'GstFormSubmission', index: true },
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
    gstin: { type: String, index: true },
    return_period: { type: String, index: true },
    tab: { type: String, enum: ['B2B', 'B2C'], index: true },
    hsn_sc: String,
    desc: String,
    uqc: String,
    qty: Number,
    txval: Number,
    rt: Number,
    iamt: Number,
    camt: Number,
    samt: Number,
    csamt: Number,
  },
  { timestamps: true, collection: 'gstr1_hsn' }
);
export const Gstr1HsnModel = model('Gstr1Hsn', gstr1HsnSchema);

const gstr1DocIssueSchema = new Schema(
  {
    submission_id: { type: Schema.Types.ObjectId, ref: 'GstFormSubmission', index: true },
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
    gstin: { type: String, index: true },
    return_period: { type: String, index: true },
    doc_num: Number,
    name: String,
    docs: [Schema.Types.Mixed],
  },
  { timestamps: true, collection: 'gstr1_doc_issue' }
);
export const Gstr1DocIssueModel = model('Gstr1DocIssue', gstr1DocIssueSchema);

const gstr3bSummarySchema = new Schema(
  {
    submission_id: { type: Schema.Types.ObjectId, ref: 'GstFormSubmission', index: true },
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
    gstin: { type: String, index: true },
    return_period: { type: String, index: true },
    sup_details: Schema.Types.Mixed,
    inter_sup: Schema.Types.Mixed,
    itc_elg: Schema.Types.Mixed,
    inward_sup: Schema.Types.Mixed,
    intr_ltfee: Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'gstr3b_summary' }
);
export const Gstr3bSummaryModel = model('Gstr3bSummary', gstr3bSummarySchema);

// 5. Audit Log Model (Section 9.1)
const gstAuditLogSchema = new Schema(
  {
    link_id: { type: Schema.Types.ObjectId, ref: 'GstFormLink', index: true },
    event: {
      type: String,
      enum: ['LINK_CREATED', 'LINK_OPENED', 'DRAFT_SAVED', 'CSV_IMPORTED', 'SUBMITTED', 'LINK_REVOKED'],
      required: true,
    },
    ip: String,
    user_agent: String,
    metadata: Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'gst_audit_logs' }
);
export const GstAuditLogModel = model('GstAuditLog', gstAuditLogSchema);

// 6. v3 Enhancements: Client Import Mappings
const clientImportMappingSchema = new Schema(
  {
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    section: { type: String, required: true },
    mapping: { type: Schema.Types.Mixed, required: true },
    date_format: { type: String, default: 'DD/MM/YYYY' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'client_import_mappings' }
);
clientImportMappingSchema.index({ client_id: 1, section: 1 }, { unique: true });
export const ClientImportMappingModel = model('ClientImportMapping', clientImportMappingSchema);

// 7. Client Master Suggestions (pending review by CA staff)
const clientMasterSuggestionSchema = new Schema(
  {
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    kind: { type: String, enum: ['RECIPIENT', 'ITEM'], required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    source_submission_id: { type: Schema.Types.ObjectId, ref: 'GstFormSubmission', default: null },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, collection: 'client_master_suggestions' }
);
export const ClientMasterSuggestionModel = model('ClientMasterSuggestion', clientMasterSuggestionSchema);

// 8. Import Batches
const gstImportBatchSchema = new Schema(
  {
    link_id: { type: Schema.Types.ObjectId, ref: 'GstFormLink', required: true, index: true },
    section: { type: String, required: true },
    file_name: { type: String, required: true },
    row_count: { type: Number, default: 0 },
    valid_count: { type: Number, default: 0 },
    error_count: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, collection: 'gst_import_batches' }
);
export const GstImportBatchModel = model('GstImportBatch', gstImportBatchSchema);
