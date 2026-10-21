import { Schema, model } from 'mongoose';
import {
  DocumentCategory,
  IDocumentDocument,
  IVerificationResult,
} from './drive.interface';
import { softDeletePlugin, ISoftDeleteModel } from '../../shared/plugins/softDelete.plugin';

const verificationSchema = new Schema<IVerificationResult>(
  {
    passed: { type: Boolean, required: true },
    sanitizedFileName: { type: String, required: true },
    fileExtension: { type: String, required: true },
    detectedMime: { type: String, required: true },
    claimedMime: { type: String, required: true },
    magicBytesHex: { type: String, default: '' },
    fileSizeBytes: { type: Number, required: true },
    checks: {
      safeExtension: { type: Boolean, required: true },
      magicByteMatch: { type: Boolean, required: true },
      sizeLimitOk: { type: Boolean, required: true },
      nonEmpty: { type: Boolean, required: true },
      categoryAllowed: { type: Boolean, required: true },
      executableScanClean: { type: Boolean, required: true },
    },
    reasons: [{ type: String }],
  },
  { _id: false }
);

const documentSchema = new Schema<IDocumentDocument>(
  {
    fileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
      index: true,
    },
    sanitizedFileName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(DocumentCategory),
      required: [true, 'Document category is required'],
      index: true,
    },
    driveFileId: {
      type: String,
      required: [true, 'Google Drive file ID is required'],
      unique: true,
      index: true,
    },
    driveFolderId: {
      type: String,
      required: true,
      index: true,
    },
    webViewLink: {
      type: String,
      default: '',
    },
    webContentLink: {
      type: String,
      default: '',
    },
    previewUrl: {
      type: String,
      default: '',
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: [1, 'File size must be greater than 0'],
    },
    checksum: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
      default: null,
    },
    clientName: {
      type: String,
      trim: true,
      index: true,
      default: '',
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      index: true,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    uploadedBy: {
      type: String,
      default: 'Admin / CA Staff',
      trim: true,
    },
    storageProvider: {
      type: String,
      enum: ['google-drive', 'local-fallback'],
      default: 'google-drive',
      index: true,
    },
    verification: {
      type: verificationSchema,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Search and compound indexes
documentSchema.index({ category: 1, createdAt: -1 });
documentSchema.index({ clientId: 1, category: 1 });
documentSchema.index(
  { fileName: 'text', description: 'text', clientName: 'text', tags: 'text' },
  { weights: { fileName: 10, clientName: 5, tags: 3, description: 1 } }
);

// Apply soft-delete plugin
documentSchema.plugin(softDeletePlugin);

export const DocumentModel = model<IDocumentDocument, ISoftDeleteModel<IDocumentDocument>>(
  'Document',
  documentSchema
);
