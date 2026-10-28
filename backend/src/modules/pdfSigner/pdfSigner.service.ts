import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require('archiver');
import { PDFDocument } from 'pdf-lib';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../shared/utils/apiError';
import { SignedDocument, PdfSignerAudit, ISignedDocument, DocumentSigningStatus } from './pdfSigner.model';
import { Client } from '../client/client.model';
import { parseDscExpiryDate } from './utils/dateParser';
import { getSignerProvider } from './signer/providerFactory';
import { PdfSignerEngine } from './engine/pdfSignerEngine';
import { PdfVerifier, VerificationReport } from './engine/pdfVerifier';

export class PdfSignerService {
  private static getStorageDirs() {
    const baseDir = path.resolve(process.cwd(), env.PDF_SIGNER_STORAGE_DIR || './storage/pdf-signer');
    const originalsDir = path.join(baseDir, 'originals');
    const signedDir = path.join(baseDir, 'signed');

    if (!fs.existsSync(originalsDir)) fs.mkdirSync(originalsDir, { recursive: true });
    if (!fs.existsSync(signedDir)) fs.mkdirSync(signedDir, { recursive: true });

    return { baseDir, originalsDir, signedDir };
  }

  private static sanitizeFileName(name: string): string {
    const basename = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
    return basename.toLowerCase().endsWith('.pdf') ? basename : `${basename}.pdf`;
  }

  /**
   * Health and Provider status
   */
  static async getSignerStatus() {
    const provider = getSignerProvider();
    const health = await provider.health();
    let certificates: any[] = [];

    if (health.available) {
      try {
        certificates = await provider.listCertificates();
      } catch {
        certificates = [];
      }
    }

    return {
      provider: provider.id,
      available: health.available,
      detail: health.detail || (health.available ? 'Signer ready' : 'Signer unavailable'),
      certificates,
    };
  }

  /**
   * Upload batch of original PDFs
   */
  static async uploadDocuments(
    files: Express.Multer.File[],
    userCtx: { userId: string; orgId?: string }
  ): Promise<ISignedDocument[]> {
    if (!files || files.length === 0) {
      throw AppError.badRequest('No files provided for upload');
    }

    const { originalsDir } = this.getStorageDirs();
    const createdDocs: ISignedDocument[] = [];

    for (const file of files) {
      // 1. Validate magic bytes (%PDF)
      const buffer = file.buffer;
      if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== '%PDF') {
        throw AppError.badRequest(`File "${file.originalname}" is not a valid PDF document (missing %PDF header)`);
      }

      // 2. Enforce size limit
      const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;
      if (buffer.length > maxBytes) {
        throw AppError.badRequest(
          `File "${file.originalname}" exceeds maximum allowed file size of ${env.MAX_FILE_SIZE_MB}MB`
        );
      }

      // 3. Compute SHA-256
      const originalSha256 = crypto.createHash('sha256').update(buffer).digest('hex');

      // 4. Inspect pages & encryption
      let pageCount = 1;
      let passwordProtected = false;
      let status: 'Ready' | 'Password protected' = 'Ready';

      try {
        const loaded = await PDFDocument.load(buffer, { ignoreEncryption: false });
        pageCount = loaded.getPageCount();
      } catch (err: any) {
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('encrypt') || msg.includes('password') || msg.includes('decrypt')) {
          passwordProtected = true;
          status = 'Password protected';
          pageCount = 1;
        } else {
          throw AppError.badRequest(`Failed to read PDF "${file.originalname}": ${err?.message}`);
        }
      }

      // 5. Store file on disk
      const safeName = this.sanitizeFileName(file.originalname);
      const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName}`;
      const diskPath = path.join(originalsDir, uniqueName);
      fs.writeFileSync(diskPath, buffer);

      // 6. Create database record
      const docRecord = await SignedDocument.create({
        fileName: file.originalname,
        fileSize: buffer.length,
        pageCount,
        originalPath: diskPath,
        originalSha256,
        status,
        passwordProtected,
        orgId: userCtx.orgId || null,
        createdBy: userCtx.userId,
      });

      // 7. Audit log (Append-only)
      await PdfSignerAudit.create({
        userId: userCtx.userId,
        orgId: userCtx.orgId || null,
        action: 'upload',
        documentId: String(docRecord._id),
        documentName: file.originalname,
        originalSha256,
        metadata: {
          fileSize: buffer.length,
          pageCount,
          passwordProtected,
        },
      });

      createdDocs.push(docRecord);
    }

    return createdDocs;
  }

  /**
   * List documents with search, status filters, and pagination
   */
  static async listDocuments(
    query: {
      search?: string;
      status?: string;
      page: number;
      limit: number;
    },
    userCtx: { orgId?: string }
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (userCtx.orgId) {
      filter.$or = [{ orgId: userCtx.orgId }, { orgId: null }];
    }

    if (query.status && query.status !== 'All') {
      filter.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      const regex = new RegExp(q, 'i');
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [{ fileName: regex }, { clientName: regex }, { signedBy: regex }],
        },
      ];
    }

    const [items, total] = await Promise.all([
      SignedDocument.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      SignedDocument.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Batch signing
   */
  static async signBatch(
    payload: {
      documentIds: string[];
      dscRecordId: string;
      reason?: string;
      location?: string;
      page: 'First' | 'Last' | 'Custom';
      customPages?: number[];
      placement: { xPct: number; yPct: number; wPct: number; hPct: number };
      appearance: { showSignerName: boolean; showDateTime: boolean; showReasonLocation: boolean };
    },
    userCtx: { userId: string; orgId?: string }
  ) {
    // 1. Retrieve and validate DSC record from Client database
    const client = await Client.findOne({
      isDeleted: { $ne: true },
      $or: [
        { 'dscs.id': payload.dscRecordId },
        { 'dscs.dscId': payload.dscRecordId },
        { 'dscs._id': payload.dscRecordId },
      ],
    }).exec();

    if (!client || !client.dscs) {
      throw AppError.notFound('Selected DSC record was not found in client profiles.');
    }

    const dscRecord = (client.dscs as any[]).find(
      (d) => d.id === payload.dscRecordId || d.dscId === payload.dscRecordId || d._id?.toString() === payload.dscRecordId
    );

    if (!dscRecord) {
      throw AppError.notFound('Selected DSC record was not found.');
    }

    // Expiry Guard
    const expiryEval = parseDscExpiryDate(dscRecord.expiryDate, dscRecord.status);
    if (expiryEval.isExpired) {
      throw AppError.badRequest(
        `Signing blocked: The selected DSC (${dscRecord.name} - ${dscRecord.dscId || ''}) is expired or marked expired (${expiryEval.raw}).`
      );
    }

    // 2. Resolve SignerProvider
    const provider = getSignerProvider();
    const health = await provider.health();
    if (!health.available) {
      throw AppError.badRequest(`Signer is unavailable: ${health.detail || 'Provider not available'}`);
    }

    const certs = await provider.listCertificates();
    if (!certs || certs.length === 0) {
      throw AppError.badRequest('No active signing certificates found in signer provider');
    }
    const cert = certs[0];

    // 3. Process each document in batch
    const { signedDir } = this.getStorageDirs();
    const results: Array<{
      documentId: string;
      fileName: string;
      success: boolean;
      status: string;
      error?: string;
    }> = [];

    for (const docId of payload.documentIds) {
      const doc = await SignedDocument.findById(docId);
      if (!doc) {
        results.push({
          documentId: docId,
          fileName: 'Unknown',
          success: false,
          status: 'Failed',
          error: 'Document record not found',
        });
        continue;
      }

      if (doc.passwordProtected) {
        doc.status = 'Password protected';
        doc.errorMessage = 'Cannot sign password-protected or encrypted document';
        await doc.save();
        results.push({
          documentId: String(doc._id),
          fileName: doc.fileName,
          success: false,
          status: 'Password protected',
          error: 'Cannot sign password-protected or encrypted document',
        });
        continue;
      }

      try {
        if (!fs.existsSync(doc.originalPath)) {
          throw new Error('Original PDF file is missing on storage server');
        }

        const originalPdfBytes = fs.readFileSync(doc.originalPath);

        // Run cryptographic PDF signing engine
        const signResult = await PdfSignerEngine.signPdf(originalPdfBytes, provider, cert, {
          reason: payload.reason,
          location: payload.location,
          page: payload.page,
          customPages: payload.customPages,
          placement: payload.placement,
          appearance: payload.appearance,
        });

        // Store signed copy
        const safeName = this.sanitizeFileName(doc.fileName);
        const signedFileName = `signed-${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName}`;
        const signedDiskPath = path.join(signedDir, signedFileName);
        fs.writeFileSync(signedDiskPath, signResult.signedPdfBuffer);

        // Update document record
        doc.status = 'Signed';
        doc.signedPath = signedDiskPath;
        doc.signedSha256 = signResult.signedSha256;
        doc.signedAt = signResult.signingTime;
        doc.signedBy = signResult.signerSubject;
        doc.dscRecordId = dscRecord.id || dscRecord.dscId || payload.dscRecordId;
        doc.providerId = provider.id;
        doc.certFingerprint = signResult.certFingerprint;
        doc.certSerial = signResult.certSerial;
        doc.signatureReason = payload.reason || '';
        doc.signatureLocation = payload.location || '';
        doc.signaturePage = payload.page;
        doc.signaturePlacement = payload.placement;
        doc.errorMessage = undefined;
        await doc.save();

        // Audit Trail (Append-only)
        await PdfSignerAudit.create({
          userId: userCtx.userId,
          orgId: userCtx.orgId || null,
          action: 'sign_success',
          documentId: String(doc._id),
          documentName: doc.fileName,
          dscRecordId: dscRecord.id || dscRecord.dscId,
          providerId: provider.id,
          certFingerprint: signResult.certFingerprint,
          certSerial: signResult.certSerial,
          originalSha256: doc.originalSha256,
          signedSha256: signResult.signedSha256,
          metadata: {
            page: payload.page,
            reason: payload.reason,
            location: payload.location,
          },
        });

        results.push({
          documentId: String(doc._id),
          fileName: doc.fileName,
          success: true,
          status: 'Signed',
        });
      } catch (err: any) {
        logger.error(`Failed to sign document ${doc.fileName} (${doc._id}):`, err);
        doc.status = 'Failed';
        doc.errorMessage = err?.message || 'Cryptographic signing failure';
        await doc.save();

        // Audit Trail (Append-only)
        await PdfSignerAudit.create({
          userId: userCtx.userId,
          orgId: userCtx.orgId || null,
          action: 'sign_failure',
          documentId: String(doc._id),
          documentName: doc.fileName,
          dscRecordId: dscRecord.id || dscRecord.dscId,
          providerId: provider.id,
          originalSha256: doc.originalSha256,
          errorDetail: err?.message || 'Cryptographic signing failure',
        });

        results.push({
          documentId: String(doc._id),
          fileName: doc.fileName,
          success: false,
          status: 'Failed',
          error: err?.message || 'Signing failed',
        });
      }
    }

    return {
      total: payload.documentIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Retry failed document
   */
  static async retryDocument(id: string, userCtx: { userId: string; orgId?: string }) {
    const doc = await SignedDocument.findById(id);
    if (!doc) throw AppError.notFound('Document not found');

    if (doc.status !== 'Failed') {
      throw AppError.badRequest('Only failed documents can be retried');
    }

    // Default retry placement if not set
    const placement = doc.signaturePlacement || { xPct: 60, yPct: 80, wPct: 35, hPct: 12 };
    const appearance = { showSignerName: true, showDateTime: true, showReasonLocation: true };

    const dscRecordId = doc.dscRecordId || 'default';
    return await this.signBatch(
      {
        documentIds: [String(doc._id)],
        dscRecordId,
        reason: doc.signatureReason || 'Approved for filing',
        location: doc.signatureLocation || 'India',
        page: (doc.signaturePage as any) || 'First',
        placement,
        appearance,
      },
      userCtx
    );
  }

  /**
   * Download single signed or original document
   */
  static async getDownloadStream(id: string, userCtx: { userId: string; orgId?: string }) {
    const doc = await SignedDocument.findById(id);
    if (!doc) throw AppError.notFound('Document not found');

    const targetPath = doc.signedPath && fs.existsSync(doc.signedPath) ? doc.signedPath : doc.originalPath;

    if (!fs.existsSync(targetPath)) {
      throw AppError.notFound('Document file is missing on storage disk');
    }

    // Audit log (Append-only)
    await PdfSignerAudit.create({
      userId: userCtx.userId,
      orgId: userCtx.orgId || null,
      action: 'download',
      documentId: String(doc._id),
      documentName: doc.fileName,
      originalSha256: doc.originalSha256,
      signedSha256: doc.signedSha256 || undefined,
    });

    const isSigned = Boolean(doc.signedPath && targetPath === doc.signedPath);
    const downloadName = isSigned ? `signed-${doc.fileName}` : doc.fileName;

    return {
      stream: fs.createReadStream(targetPath),
      fileName: downloadName,
      fileSize: fs.statSync(targetPath).size,
    };
  }

  /**
   * Download multiple signed documents as ZIP archive
   */
  static async getZipDownloadStream(
    documentIds: string[],
    userCtx: { userId: string; orgId?: string }
  ) {
    const docs = await SignedDocument.find({ _id: { $in: documentIds } });
    if (!docs || docs.length === 0) {
      throw AppError.notFound('No matching documents found to download');
    }

    const archive = archiver('zip', { zlib: { level: 6 } });

    for (const doc of docs) {
      const filePath = doc.signedPath && fs.existsSync(doc.signedPath) ? doc.signedPath : doc.originalPath;
      if (fs.existsSync(filePath)) {
        const entryName = doc.signedPath ? `signed-${doc.fileName}` : doc.fileName;
        archive.file(filePath, { name: entryName });

        // Audit log
        await PdfSignerAudit.create({
          userId: userCtx.userId,
          orgId: userCtx.orgId || null,
          action: 'download',
          documentId: String(doc._id),
          documentName: doc.fileName,
          originalSha256: doc.originalSha256,
          signedSha256: doc.signedSha256 || undefined,
          metadata: { batchZip: true },
        });
      }
    }

    return archive;
  }

  /**
   * Verify digital signature on stored signed document
   */
  static async verifyDocument(id: string, userCtx: { userId: string; orgId?: string }): Promise<VerificationReport> {
    const doc = await SignedDocument.findById(id);
    if (!doc) throw AppError.notFound('Document not found');

    const targetPath = doc.signedPath && fs.existsSync(doc.signedPath) ? doc.signedPath : doc.originalPath;
    if (!fs.existsSync(targetPath)) {
      throw AppError.notFound('Document file is missing on storage disk');
    }

    const fileBuffer = fs.readFileSync(targetPath);
    const report = PdfVerifier.verifyPdf(fileBuffer);

    // Audit log (Append-only)
    await PdfSignerAudit.create({
      userId: userCtx.userId,
      orgId: userCtx.orgId || null,
      action: 'verify',
      documentId: String(doc._id),
      documentName: doc.fileName,
      originalSha256: doc.originalSha256,
      signedSha256: doc.signedSha256 || undefined,
      metadata: {
        isValid: report.isValid,
        coversWholeFile: report.coversWholeFile,
        trustStatus: report.trust.status,
      },
    });

    return report;
  }

  /**
   * Read-only audit trail for a document
   */
  static async getAuditTrail(documentId: string) {
    return await PdfSignerAudit.find({ documentId }).sort({ timestamp: -1 }).exec();
  }

  /**
   * Update client association on an uploaded document
   */
  static async updateClient(documentId: string, clientId?: string, clientName?: string) {
    const doc = await SignedDocument.findById(documentId);
    if (!doc) throw AppError.notFound('Document not found');
    doc.clientId = clientId || undefined;
    doc.clientName = clientName || '';
    return await doc.save();
  }

  /**
   * Delete staged / unsigned document
   */
  static async deleteDocument(id: string, _userCtx: { userId: string; orgId?: string }) {
    const doc = await SignedDocument.findById(id);
    if (!doc) throw AppError.notFound('Document not found');

    if (doc.status === 'Signed') {
      throw AppError.badRequest('Signed documents cannot be removed as they are part of official signed records.');
    }

    if (doc.originalPath && fs.existsSync(doc.originalPath)) {
      try {
        fs.unlinkSync(doc.originalPath);
      } catch (err) {
        logger.warn(`Could not delete physical file ${doc.originalPath}:`, err);
      }
    }

    await SignedDocument.findByIdAndDelete(id);
    return { id, deleted: true };
  }

  /**
   * Verify an uploaded PDF for cryptographic authenticity and store directly in verified table
   */
  static async verifyAndStoreUploadedFile(
    file: Express.Multer.File,
    clientId: string | undefined,
    clientName: string | undefined,
    userCtx: { userId: string; orgId?: string }
  ) {
    if (!file || !file.buffer) {
      throw AppError.badRequest('No PDF file provided for verification');
    }

    const header = file.buffer.subarray(0, 5).toString('latin1');
    if (!header.startsWith('%PDF-')) {
      throw AppError.badRequest(`Invalid file "${file.originalname}": Not a valid PDF document.`);
    }

    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const report = PdfVerifier.verifyPdf(file.buffer);

    let status: DocumentSigningStatus = 'Verified';
    if (!report.isSigned) {
      status = 'Unsigned';
    } else if (report.contentTampered || report.signatureTampered || !report.isValid) {
      status = 'Tampered';
    } else {
      status = 'Verified';
    }

    let pageCount = 1;
    try {
      const pdfDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
    } catch {
      pageCount = 1;
    }

    const { signedDir } = this.getStorageDirs();
    const safeName = this.sanitizeFileName(file.originalname);
    const targetPath = path.join(signedDir, `verified-${Date.now()}-${safeName}`);
    fs.writeFileSync(targetPath, file.buffer);

    const doc = await SignedDocument.create({
      fileName: file.originalname,
      fileSize: file.size,
      pageCount,
      originalPath: targetPath,
      signedPath: targetPath,
      originalSha256: sha256,
      signedSha256: sha256,
      status,
      passwordProtected: false,
      clientId: clientId || undefined,
      clientName: clientName || '',
      signedBy: report.signer?.commonName || (report.isSigned ? 'Unknown Signer' : 'Unsigned'),
      signedAt: report.signingTime ? new Date(report.signingTime) : (report.isSigned ? new Date() : undefined),
      errorMessage: report.tamperReason || report.error || undefined,
      orgId: userCtx.orgId || null,
      createdBy: userCtx.userId,
    });

    await PdfSignerAudit.create({
      userId: userCtx.userId,
      orgId: userCtx.orgId || null,
      action: 'verify',
      documentId: String(doc._id),
      documentName: doc.fileName,
      originalSha256: sha256,
      signedSha256: sha256,
      metadata: {
        status,
        isValid: report.isValid,
        contentTampered: report.contentTampered,
        signatureTampered: report.signatureTampered,
        tamperReason: report.tamperReason,
      },
    });

    return { document: doc, report };
  }

  /**
   * Verify a staged document and transfer it directly to verified documents table
   */
  static async verifyStagedDocument(id: string, userCtx: { userId: string; orgId?: string }) {
    const doc = await SignedDocument.findById(id);
    if (!doc) throw AppError.notFound('Document not found');

    if (!fs.existsSync(doc.originalPath)) {
      throw AppError.notFound('Original PDF file is missing on storage disk');
    }

    const fileBuffer = fs.readFileSync(doc.originalPath);
    const report = PdfVerifier.verifyPdf(fileBuffer);

    let status: DocumentSigningStatus = 'Verified';
    if (!report.isSigned) {
      status = 'Unsigned';
    } else if (report.contentTampered || report.signatureTampered || !report.isValid) {
      status = 'Tampered';
    } else {
      status = 'Verified';
    }

    doc.status = status;
    doc.signedPath = doc.originalPath;
    doc.signedSha256 = doc.originalSha256;
    doc.signedBy = report.signer?.commonName || (report.isSigned ? 'Unknown Signer' : 'Unsigned');
    doc.signedAt = report.signingTime ? new Date(report.signingTime) : (report.isSigned ? new Date() : undefined);
    doc.errorMessage = report.tamperReason || report.error || undefined;
    await doc.save();

    await PdfSignerAudit.create({
      userId: userCtx.userId,
      orgId: userCtx.orgId || null,
      action: 'verify',
      documentId: String(doc._id),
      documentName: doc.fileName,
      originalSha256: doc.originalSha256,
      metadata: {
        status,
        isValid: report.isValid,
        contentTampered: report.contentTampered,
        signatureTampered: report.signatureTampered,
        tamperReason: report.tamperReason,
      },
    });

    return { document: doc, report };
  }
}


