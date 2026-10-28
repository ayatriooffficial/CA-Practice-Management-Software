import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { PdfSignerService } from './pdfSigner.service';

function getUserContext(req: Request) {
  const user = (req as any).user;
  const displayName =
    user?.name ||
    user?.email ||
    (user?.userId ? `User (${String(user.userId).slice(-4)})` : null) ||
    (user?.id ? `User (${String(user.id).slice(-4)})` : null) ||
    'Staff User';

  return {
    userId: displayName,
    orgId: user?.orgId || undefined,
  };
}


export class PdfSignerController {
  static getStatus = asyncHandler(async (_req: Request, res: Response) => {
    const status = await PdfSignerService.getSignerStatus();
    return ApiResponse.success(res, status, 'Signer status retrieved successfully');
  });

  static uploadDocuments = asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    const userCtx = getUserContext(req);
    const docs = await PdfSignerService.uploadDocuments(files, userCtx);
    return ApiResponse.created(res, docs, `${docs.length} document(s) uploaded successfully`);
  });

  static listDocuments = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContext(req);
    const result = await PdfSignerService.listDocuments(req.query as any, userCtx);
    return ApiResponse.success(res, result, 'Documents retrieved successfully');
  });

  static signBatch = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContext(req);
    const result = await PdfSignerService.signBatch(req.body, userCtx);
    return ApiResponse.success(res, result, 'Document batch signing completed');
  });

  static retryDocument = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContext(req);
    const result = await PdfSignerService.retryDocument(req.params.id as string, userCtx);
    return ApiResponse.success(res, result, 'Document retry processed');
  });

  static downloadDocument = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContext(req);
    const { stream, fileName, fileSize } = await PdfSignerService.getDownloadStream(
      req.params.id as string,
      userCtx
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', fileSize);
    stream.pipe(res);
  });

  static downloadZip = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContext(req);
    const { documentIds } = req.body;
    const archive = await PdfSignerService.getZipDownloadStream(documentIds, userCtx);

    const zipName = `signed-documents-${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    archive.pipe(res);
    await archive.finalize();
  });

  static verifyDocument = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContext(req);
    const report = await PdfSignerService.verifyDocument(req.params.id as string, userCtx);
    return ApiResponse.success(res, report, 'Signature verification completed');
  });

  static getAuditTrail = asyncHandler(async (req: Request, res: Response) => {
    const audits = await PdfSignerService.getAuditTrail(req.params.id as string);
    return ApiResponse.success(res, audits, 'Audit trail retrieved successfully');
  });

  static updateClient = asyncHandler(async (req: Request, res: Response) => {
    const { clientId, clientName } = req.body;
    const doc = await PdfSignerService.updateClient(req.params.id as string, clientId, clientName);
    return ApiResponse.success(res, doc, 'Document client updated successfully');
  });

  static deleteDocument = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContext(req);
    const result = await PdfSignerService.deleteDocument(req.params.id as string, userCtx);
    return ApiResponse.success(res, result, 'Document removed successfully');
  });

  static verifyUploadedFile = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      return ApiResponse.error(res, 'No PDF file uploaded for verification', 400);
    }
    const userCtx = getUserContext(req);
    const { clientId, clientName } = req.body;
    const result = await PdfSignerService.verifyAndStoreUploadedFile(file, clientId, clientName, userCtx);
    return ApiResponse.created(res, result, 'PDF signature verified and stored successfully');
  });

  static verifyStagedDocument = asyncHandler(async (req: Request, res: Response) => {
    const userCtx = getUserContext(req);
    const result = await PdfSignerService.verifyStagedDocument(req.params.id as string, userCtx);
    return ApiResponse.success(res, result, 'Staged PDF verified successfully');
  });
}


