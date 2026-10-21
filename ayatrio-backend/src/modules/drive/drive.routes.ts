import { Router } from 'express';
import { DriveController } from './drive.controller';
import { uploadMiddleware } from './fileVerification';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  uploadDocumentBodySchema,
  queryDocumentsSchema,
  documentIdParamSchema,
} from './drive.validation';
import { mutationRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// 1. Service Status & Storage Analytics
router.get('/status', DriveController.getDriveStatus);
router.get('/stats', DriveController.getCategoryStats);

// 2. File Verification Only (Dry-run without saving)
router.post(
  '/verify',
  uploadMiddleware.single('file'),
  DriveController.verifyDocumentOnly
);

// 3. Upload & Verify File (Routes to Google Drive Category Folder)
router.post(
  '/upload',
  mutationRateLimiter,
  uploadMiddleware.single('file'),
  validateRequest({ body: uploadDocumentBodySchema }),
  DriveController.uploadDocument
);

// 4. List Documents (Category filter, text search, pagination)
router.get(
  '/',
  validateRequest({ query: queryDocumentsSchema }),
  DriveController.getDocuments
);

// 5. Download Document Stream
router.get(
  '/:id/download',
  DriveController.downloadDocument
);

// 6. Preview Document Inline Stream (images, PDFs)
router.get(
  '/:id/preview',
  DriveController.previewDocument
);

// 6. Get Document Metadata
router.get(
  '/:id',
  validateRequest({ params: documentIdParamSchema }),
  DriveController.getDocumentById
);

// 7. Delete Document (Google Drive & Database soft-delete)
router.delete(
  '/:id',
  validateRequest({ params: documentIdParamSchema }),
  DriveController.deleteDocument
);

export const driveRoutes = router;
