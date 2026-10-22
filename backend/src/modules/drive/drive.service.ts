import { Types } from 'mongoose';
import { DocumentModel } from './drive.model';
import {
  DocumentCategory,
  IDocumentDocument,
  IDocumentUploadInput,
  IVerificationResult,
  CATEGORY_DEFINITIONS,
  IDriveStatusResponse,
} from './drive.interface';
import {
  verifyUploadedFile,
  computeFileChecksum,
} from './fileVerification';
import { googleDriveService } from './drive.google.service';
import { AppError } from '../../shared/utils/apiError';
import { Client } from '../client/client.model';
import { PaginationMeta } from '../../shared/utils/apiResponse';

export interface IDocumentsQueryParams {
  page?: number;
  limit?: number;
  category?: DocumentCategory;
  search?: string;
  clientId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class DriveService {
  /**
   * Uploads and verifies a document, uploading to the specific Google Drive category folder.
   */
  static async uploadDocument(
    file: Express.Multer.File,
    input: IDocumentUploadInput
  ): Promise<IDocumentDocument> {
    if (!file) {
      throw AppError.badRequest('No file provided for upload');
    }

    // 1. Comprehensive verification (Magic bytes, extension, size, security heuristics, category match)
    const verification: IVerificationResult = verifyUploadedFile(file, input.category);
    if (!verification.passed) {
      throw AppError.badRequest(
        `File verification failed: ${verification.reasons.join('; ')}`,
        verification
      );
    }

    // 2. Compute cryptographic checksum
    const checksum = computeFileChecksum(file.buffer);

    // 3. Resolve client entity name if clientId is provided
    let resolvedClientName = input.clientName || '';
    if (input.clientId && !resolvedClientName) {
      try {
        const client = await Client.findById(input.clientId).select('name');
        if (client) {
          resolvedClientName = client.name;
        }
      } catch {
        // non-blocking
      }
    }

    // 4. Upload file to designated Google Drive Category or Client Folder
    const driveUpload = await googleDriveService.uploadFile(
      file,
      input.category,
      verification.sanitizedFileName,
      input.description,
      {
        clientName: resolvedClientName,
        subFolder: input.subFolder,
        customFileName: input.customFileName,
      }
    );

    const previewUrl = `/api/v1/drive/${driveUpload.fileId}/preview`;
    const thumbnailUrl = `/api/v1/drive/${driveUpload.fileId}/preview`;

    // 5. Store metadata in MongoDB
    const document = await DocumentModel.create({
      fileName: file.originalname,
      sanitizedFileName: verification.sanitizedFileName,
      category: input.category,
      driveFileId: driveUpload.fileId,
      driveFolderId: driveUpload.folderId,
      webViewLink: driveUpload.webViewLink || '',
      webContentLink: driveUpload.webContentLink || '',
      previewUrl,
      thumbnailUrl,
      mimeType: verification.detectedMime || file.mimetype,
      size: file.size,
      checksum,
      description: input.description || '',
      clientId: input.clientId ? new Types.ObjectId(input.clientId) : null,
      clientName: resolvedClientName,
      leadId: input.leadId ? new Types.ObjectId(input.leadId) : null,
      tags: input.tags || [],
      uploadedBy: input.uploadedBy || 'Ayatrio Practice Team',
      storageProvider: driveUpload.provider,
      verification,
    });

    return document;
  }

  /**
   * Helper to parse and convert a base64 data string into a Multer file object
   */
  static createFileFromBase64(
    base64Data: string,
    defaultName: string = 'document'
  ): Express.Multer.File | null {
    if (!base64Data || typeof base64Data !== 'string') return null;

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    let ext = '.bin';
    if (mimeType.includes('pdf')) ext = '.pdf';
    else if (mimeType.includes('png')) ext = '.png';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('zip')) ext = '.zip';
    else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) ext = '.xlsx';

    const originalname = defaultName.includes('.') ? defaultName : `${defaultName}${ext}`;

    return {
      fieldname: 'file',
      originalname,
      encoding: '7bit',
      mimetype: mimeType,
      size: buffer.length,
      buffer,
      destination: '',
      filename: originalname,
      path: '',
      stream: null as any,
    };
  }

  /**
   * Universal helper: Takes either an Express.Multer.File or a base64 string,
   * runs full file verification, uploads to Google Drive category folder, saves Document,
   * and returns the Google Drive webViewLink or download link.
   */
  static async processAndUploadAttachment(
    fileOrBase64: Express.Multer.File | string,
    category: DocumentCategory,
    metadata: {
      defaultName?: string;
      clientId?: string;
      clientName?: string;
      leadId?: string;
      description?: string;
      tags?: string[];
      uploadedBy?: string;
    }
  ): Promise<{ url: string; document: IDocumentDocument }> {
    let file: Express.Multer.File | null = null;

    if (typeof fileOrBase64 === 'string') {
      if (!fileOrBase64.startsWith('data:')) {
        // If it's already an existing URL or filename, return as is
        return { url: fileOrBase64, document: null as any };
      }
      file = DriveService.createFileFromBase64(fileOrBase64, metadata.defaultName || 'attachment');
      if (!file) {
        throw AppError.badRequest('Invalid base64 attachment format');
      }
    } else {
      file = fileOrBase64;
    }

    const document = await DriveService.uploadDocument(file, {
      category,
      description: metadata.description,
      clientId: metadata.clientId,
      clientName: metadata.clientName,
      leadId: metadata.leadId,
      tags: metadata.tags || [],
      uploadedBy: metadata.uploadedBy || 'Ayatrio Practice Staff',
    });

    const url = document.webViewLink || `/api/v1/drive/${document._id}/download`;
    return { url, document };
  }

  /**
   * Verifies a file without uploading (pre-flight validation).
   */
  static verifyFileOnly(
    file: Express.Multer.File,
    category: DocumentCategory
  ): IVerificationResult {
    if (!file) {
      throw AppError.badRequest('No file provided for verification');
    }
    return verifyUploadedFile(file, category);
  }

  /**
   * Retrieves paginated documents with category filter, search, and category counts breakdown.
   */
  static async getDocuments(params: IDocumentsQueryParams): Promise<{
    items: IDocumentDocument[];
    pagination: PaginationMeta;
    categoryCounts: Record<string, number>;
  }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { isDeleted: false };

    if (params.category) {
      filter.category = params.category;
    }

    if (params.clientId) {
      filter.clientId = new Types.ObjectId(params.clientId);
    }

    if (params.search && params.search.trim()) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      filter.$or = [
        { fileName: searchRegex },
        { sanitizedFileName: searchRegex },
        { clientName: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
      ];
    }

    const sortField = params.sortBy || 'createdAt';
    const sortDirection = params.sortOrder === 'asc' ? 1 : -1;

    const [items, totalDocs, categoryAggregation] = await Promise.all([
      DocumentModel.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
      DocumentModel.countDocuments(filter),
      // Aggregate counts across categories for fast sidebar badge display
      DocumentModel.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    const categoryCounts: Record<string, number> = {};
    for (const cat of Object.values(DocumentCategory)) {
      categoryCounts[cat] = 0;
    }
    for (const group of categoryAggregation) {
      if (group._id) {
        categoryCounts[group._id] = group.count;
      }
    }

    const totalPages = Math.ceil(totalDocs / limit);

    const enrichedItems = items.map((doc: any) => ({
      ...doc,
      previewUrl: doc.previewUrl || `/api/v1/drive/${doc.driveFileId || doc._id}/preview`,
      thumbnailUrl: `/api/v1/drive/${doc.driveFileId || doc._id}/preview`,
    }));

    return {
      items: enrichedItems as unknown as IDocumentDocument[],
      pagination: {
        page,
        limit,
        totalDocs,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      categoryCounts,
    };
  }

  /**
   * Retrieves a single document by ID.
   */
  static async getDocumentById(id: string): Promise<IDocumentDocument> {
    const document = await DocumentModel.findOne({ _id: id, isDeleted: false });
    if (!document) {
      throw AppError.notFound('Document not found or has been deleted');
    }
    const docObj = document.toObject();
    docObj.previewUrl = `/api/v1/drive/${docObj.driveFileId || docObj._id}/preview`;
    docObj.thumbnailUrl = `/api/v1/drive/${docObj.driveFileId || docObj._id}/preview`;
    return docObj as unknown as IDocumentDocument;
  }

  /**
   * Deletes a document from both Google Drive and DB.
   */
  static async deleteDocument(id: string, deletedBy?: string): Promise<boolean> {
    const document = await DocumentModel.findOne({ _id: id, isDeleted: false });
    if (!document) {
      throw AppError.notFound('Document not found');
    }

    // 1. Delete from Google Drive
    await googleDriveService.deleteFile(document.driveFileId);

    // 2. Soft-delete in database
    await document.softDelete(deletedBy || 'System User');

    return true;
  }

  /**
   * Streams document file from Google Drive (or local storage).
   */
  static async getFileStream(
    id: string
  ): Promise<{ stream: any; document: Partial<IDocumentDocument> }> {
    let document: IDocumentDocument | null = null;

    if (Types.ObjectId.isValid(id)) {
      document = await DocumentModel.findOne({ _id: id, isDeleted: false });
    }
    if (!document) {
      document = await DocumentModel.findOne({ driveFileId: id, isDeleted: false });
    }

    if (document) {
      const stream = await googleDriveService.getFileStream(document.driveFileId);
      return { stream, document };
    }

    // Direct Google Drive or local file ID fallback
    try {
      const stream = await googleDriveService.getFileStream(id);
      return {
        stream,
        document: {
          sanitizedFileName: `preview_${id}`,
          mimeType: 'application/octet-stream',
          driveFileId: id,
        },
      };
    } catch {
      throw AppError.notFound('Document or file not found');
    }
  }

  /**
   * Aggregates stats: total storage used, total documents, and category breakdown.
   */
  static async getCategoryStats(): Promise<{
    totalDocuments: number;
    totalSizeBytes: number;
    totalSizeFormatted: string;
    categories: Array<{
      category: DocumentCategory;
      label: string;
      description: string;
      folderName: string;
      icon: string;
      color: string;
      count: number;
      sizeBytes: number;
      sizeFormatted: string;
    }>;
  }> {
    const [stats, totalDocs] = await Promise.all([
      DocumentModel.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalSize: { $sum: '$size' },
          },
        },
      ]),
      DocumentModel.countDocuments({ isDeleted: false }),
    ]);

    const statMap = new Map<string, { count: number; totalSize: number }>();
    let overallSizeBytes = 0;

    for (const item of stats) {
      statMap.set(item._id, { count: item.count, totalSize: item.totalSize });
      overallSizeBytes += item.totalSize;
    }

    const formatSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };

    const categories = Object.values(DocumentCategory).map((cat) => {
      const meta = CATEGORY_DEFINITIONS[cat];
      const entry = statMap.get(cat) || { count: 0, totalSize: 0 };
      return {
        category: cat,
        label: meta.label,
        description: meta.description,
        folderName: meta.folderName,
        icon: meta.icon,
        color: meta.color,
        count: entry.count,
        sizeBytes: entry.totalSize,
        sizeFormatted: formatSize(entry.totalSize),
      };
    });

    return {
      totalDocuments: totalDocs,
      totalSizeBytes: overallSizeBytes,
      totalSizeFormatted: formatSize(overallSizeBytes),
      categories,
    };
  }

  /**
   * Retrieves Google Drive service status.
   */
  static async getDriveStatus(): Promise<IDriveStatusResponse> {
    return await googleDriveService.getStatus();
  }
}
