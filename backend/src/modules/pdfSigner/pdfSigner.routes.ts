import { Router } from 'express';
import multer from 'multer';
import { PdfSignerController } from './pdfSigner.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { mutationRateLimiter } from '../../middlewares/rateLimiter';
import { env } from '../../config/env';
import {
  queryDocumentsSchema,
  documentIdParamSchema,
  signBatchSchema,
  downloadZipSchema,
  updateDocumentClientSchema,
} from './pdfSigner.validation';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 20,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed'));
    }
  },
});

const router = Router();

// Signer Status (Truthful health check)
router.get('/signer/status', PdfSignerController.getStatus);

// Document List (Search, filter, pagination)
router.get('/', validateRequest({ query: queryDocumentsSchema }), PdfSignerController.listDocuments);

// Document Upload (Multipart)
router.post('/documents', mutationRateLimiter, upload.array('files', 20), PdfSignerController.uploadDocuments);

// Stage Document from Cloud Drive
router.post('/stage-from-drive', mutationRateLimiter, PdfSignerController.stageFromDrive);

// Stage Generated Invoice for DSC Signing
router.post('/stage-invoice', mutationRateLimiter, PdfSignerController.stageInvoice);

// Update Document Client
router.patch(
  '/documents/:id/client',
  mutationRateLimiter,
  validateRequest({ params: documentIdParamSchema, body: updateDocumentClientSchema }),
  PdfSignerController.updateClient
);

// Batch Sign Documents
router.post(
  '/sign',
  mutationRateLimiter,
  validateRequest({ body: signBatchSchema }),
  PdfSignerController.signBatch
);

// Retry Failed Document
router.post(
  '/documents/:id/retry',
  mutationRateLimiter,
  validateRequest({ params: documentIdParamSchema }),
  PdfSignerController.retryDocument
);

// Download Single Document (Streaming)
router.get(
  '/documents/:id/download',
  validateRequest({ params: documentIdParamSchema }),
  PdfSignerController.downloadDocument
);

// Download Selected Documents as ZIP
router.post(
  '/documents/download-zip',
  mutationRateLimiter,
  validateRequest({ body: downloadZipSchema }),
  PdfSignerController.downloadZip
);

// Verify Stored Signed Document
router.post(
  '/documents/:id/verify',
  validateRequest({ params: documentIdParamSchema }),
  PdfSignerController.verifyDocument
);

// Get Read-Only Audit Trail
router.get(
  '/documents/:id/audit',
  validateRequest({ params: documentIdParamSchema }),
  PdfSignerController.getAuditTrail
);

// Delete Staged / Unsigned Document
router.delete(
  '/documents/:id',
  mutationRateLimiter,
  validateRequest({ params: documentIdParamSchema }),
  PdfSignerController.deleteDocument
);

// Verify Uploaded File directly & store in verified table
router.post(
  '/verify-upload',
  mutationRateLimiter,
  upload.single('file'),
  PdfSignerController.verifyUploadedFile
);

// Verify Staged Document & move to verified table
router.post(
  '/documents/:id/verify-staged',
  mutationRateLimiter,
  validateRequest({ params: documentIdParamSchema }),
  PdfSignerController.verifyStagedDocument
);

export const pdfSignerRoutes = router;


