import { Schema, model, Document } from 'mongoose';

export type DocumentSigningStatus =
  | 'Ready'
  | 'Password protected'
  | 'Signed'
  | 'Verified'
  | 'Tampered'
  | 'Unsigned'
  | 'Failed';

export interface ISignedDocument extends Document {
  fileName: string;
  fileSize: number;
  pageCount: number;
  originalPath: string;
  originalSha256: string;
  status: DocumentSigningStatus;
  passwordProtected: boolean;
  clientId?: string;
  clientName?: string;
  signedPath?: string;
  signedSha256?: string;
  signedAt?: Date;
  signedBy?: string;
  dscRecordId?: string;
  providerId?: 'software' | 'token';
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
  orgId?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const signedDocumentSchema = new Schema<ISignedDocument>(
  {
    fileName: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true },
    pageCount: { type: Number, required: true, default: 1 },
    originalPath: { type: String, required: true },
    originalSha256: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['Ready', 'Password protected', 'Signed', 'Verified', 'Tampered', 'Unsigned', 'Failed'],
      default: 'Ready',
      index: true,
    },

    passwordProtected: { type: Boolean, default: false },
    clientId: { type: String, default: null, index: true },
    clientName: { type: String, default: '' },
    signedPath: { type: String, default: null },
    signedSha256: { type: String, default: null },
    signedAt: { type: Date, default: null },
    signedBy: { type: String, default: null },
    dscRecordId: { type: String, default: null },
    providerId: { type: String, enum: ['software', 'token'], default: 'software' },
    certFingerprint: { type: String, default: null },
    certSerial: { type: String, default: null },
    signatureReason: { type: String, default: '' },
    signatureLocation: { type: String, default: '' },
    signaturePage: { type: String, default: 'First' },
    signaturePlacement: {
      xPct: { type: Number, default: 60 },
      yPct: { type: Number, default: 80 },
      wPct: { type: Number, default: 35 },
      hPct: { type: Number, default: 12 },
    },
    errorMessage: { type: String, default: null },
    orgId: { type: String, default: null, index: true },
    createdBy: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

signedDocumentSchema.index({ createdAt: -1 });
signedDocumentSchema.index({ orgId: 1, status: 1 });

export const SignedDocument = model<ISignedDocument>('SignedDocument', signedDocumentSchema);

// ==============================================================================
// Append-Only Audit Trail Collection (No update or delete methods defined)
// ==============================================================================

export type AuditAction = 'upload' | 'sign_success' | 'sign_failure' | 'verify' | 'download';

export interface IPdfSignerAudit extends Document {
  userId: string;
  orgId?: string;
  timestamp: Date;
  action: AuditAction;
  documentId: string;
  documentName: string;
  dscRecordId?: string;
  providerId?: string;
  certFingerprint?: string;
  certSerial?: string;
  originalSha256?: string;
  signedSha256?: string;
  errorDetail?: string;
  metadata?: Record<string, any>;
}

const pdfSignerAuditSchema = new Schema<IPdfSignerAudit>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, default: null, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    action: {
      type: String,
      enum: ['upload', 'sign_success', 'sign_failure', 'verify', 'download'],
      required: true,
      index: true,
    },
    documentId: { type: String, required: true, index: true },
    documentName: { type: String, required: true },
    dscRecordId: { type: String, default: null },
    providerId: { type: String, default: null },
    certFingerprint: { type: String, default: null },
    certSerial: { type: String, default: null },
    originalSha256: { type: String, default: null },
    signedSha256: { type: String, default: null },
    errorDetail: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Append-only: forbid updates and deletes at schema level
pdfSignerAuditSchema.pre('updateOne', function () {
  throw new Error('PdfSignerAudit is an append-only collection. Updates are strictly forbidden.');
});
pdfSignerAuditSchema.pre('updateMany', function () {
  throw new Error('PdfSignerAudit is an append-only collection. Updates are strictly forbidden.');
});
pdfSignerAuditSchema.pre('findOneAndDelete', function () {
  throw new Error('PdfSignerAudit is an append-only collection. Deletions are strictly forbidden.');
});
pdfSignerAuditSchema.pre('deleteOne', function () {
  throw new Error('PdfSignerAudit is an append-only collection. Deletions are strictly forbidden.');
});
pdfSignerAuditSchema.pre('deleteMany', function () {
  throw new Error('PdfSignerAudit is an append-only collection. Deletions are strictly forbidden.');
});

export const PdfSignerAudit = model<IPdfSignerAudit>('PdfSignerAudit', pdfSignerAuditSchema);
