import { Request, Response } from 'express';
import { DriveService } from './drive.service';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { AppError } from '../../shared/utils/apiError';
import { DocumentCategory } from './drive.interface';
import { logger } from '../../config/logger';

export class DriveController {
  /**
   * Upload and verify file, routing to Google Drive category folder.
   * POST /api/v1/drive/upload
   */
  static uploadDocument = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw AppError.badRequest('No file uploaded. Please attach a file under the "file" field.');
    }

    const { category, description, clientId, clientName, leadId, tags, uploadedBy } = req.body;

    if (!category) {
      throw AppError.badRequest('Document category is required.');
    }

    const document = await DriveService.uploadDocument(req.file, {
      category: category as DocumentCategory,
      description,
      clientId,
      clientName,
      leadId,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : [],
      uploadedBy,
    });

    return ApiResponse.created(
      res,
      document,
      `Document verified and securely uploaded to Google Drive [${document.category}] folder`
    );
  });

  /**
   * Dry-run file verification without uploading.
   * POST /api/v1/drive/verify
   */
  static verifyDocumentOnly = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw AppError.badRequest('No file provided to verify');
    }

    const category = (req.body.category as DocumentCategory) || DocumentCategory.GENERAL;
    const result = DriveService.verifyFileOnly(req.file, category);

    return ApiResponse.success(res, result, 'File verification check completed');
  });

  /**
   * List documents with category filter, search, and category counts breakdown.
   * GET /api/v1/drive
   */
  static getDocuments = asyncHandler(async (req: Request, res: Response) => {
    const { items, pagination, categoryCounts } = await DriveService.getDocuments(
      req.query as any
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Documents retrieved successfully',
      data: items,
      pagination,
      categoryCounts,
    });
  });

  /**
   * Get single document metadata.
   * GET /api/v1/drive/:id
   */
  static getDocumentById = asyncHandler(async (req: Request, res: Response) => {
    const documentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const document = await DriveService.getDocumentById(documentId);
    return ApiResponse.success(res, document, 'Document details retrieved');
  });

  /**
   * Stream download file from Google Drive.
   * GET /api/v1/drive/:id/download
   */
  static downloadDocument = asyncHandler(async (req: Request, res: Response) => {
    const documentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const { stream, document } = await DriveService.getFileStream(documentId);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(document.sanitizedFileName || 'download')}"`
      );
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      if (document.size) {
        res.setHeader('Content-Length', document.size.toString());
      }

      stream.pipe(res);
      return;
    } catch (err: any) {
      if (err?.message?.includes('invalid_grant') || err?.response?.data?.error === 'invalid_grant') {
        logger.warn(
          `⚠️ Google Drive token expired (invalid_grant) for ${documentId}. Run 'npm run get-drive-token' in backend to re-authorize.`
        );
        res.status(503).json({
          success: false,
          message: 'Google Drive authentication expired (invalid_grant). Run npm run get-drive-token in backend to re-authorize.',
        });
        return;
      }
      throw err;
    }
  });

  /**
   * Stream preview file inline (for images, PDFs, browser preview).
   * GET /api/v1/drive/:id/preview
   */
  static previewDocument = asyncHandler(async (req: Request, res: Response) => {
    const documentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const { stream, document } = await DriveService.getFileStream(documentId);

      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(document.sanitizedFileName || 'preview')}"`
      );
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      if (document.size) {
        res.setHeader('Content-Length', document.size.toString());
      }
      res.setHeader('Cache-Control', 'no-cache, private');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      stream.pipe(res);
      return;
    } catch (err: any) {
      if (err?.message?.includes('invalid_grant') || err?.response?.data?.error === 'invalid_grant') {
        logger.warn(
          `⚠️ Google Drive token expired (invalid_grant) for preview ${documentId}. Run 'npm run get-drive-token' in backend to re-authorize.`
        );
        const transparentPng = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          'base64'
        );
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.status(200).send(transparentPng);
        return;
      }

      // If client requested image preview or browser <img> tag, return clean SVG avatar placeholder instead of breaking
      const isImageRequest =
        req.headers.accept?.includes('image/') ||
        /\.(png|jpe?g|webp|gif|svg)$/i.test(documentId) ||
        documentId.includes('photo') ||
        documentId.includes('logo') ||
        documentId.includes('sign');

      if (isImageRequest) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f8fafc"/><circle cx="100" cy="80" r="35" fill="#cbd5e1"/><path d="M40 160 c0 -30 30 -45 60 -45 s60 15 60 45" fill="#cbd5e1"/></svg>`;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-cache, private');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.status(200).send(svg);
        return;
      }

      throw err;
    }
  });

  /**
   * Soft-delete document from DB and remove from Google Drive.
   * DELETE /api/v1/drive/:id
   */
  static deleteDocument = asyncHandler(async (req: Request, res: Response) => {
    const documentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deletedBy = (req.headers['x-user-id'] as string) || 'Admin';
    await DriveService.deleteDocument(documentId, deletedBy);

    return ApiResponse.success(
      res,
      null,
      'Document removed from Google Drive and archived successfully'
    );
  });

  /**
   * Storage and category statistics.
   * GET /api/v1/drive/stats
   */
  static getCategoryStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await DriveService.getCategoryStats();
    return ApiResponse.success(res, stats, 'Category storage statistics retrieved');
  });

  /**
   * Google Drive connection status and quota check.
   * GET /api/v1/drive/status
   */
  static getDriveStatus = asyncHandler(async (_req: Request, res: Response) => {
    const status = await DriveService.getDriveStatus();
    return ApiResponse.success(res, status, 'Google Drive integration status');
  });
}
