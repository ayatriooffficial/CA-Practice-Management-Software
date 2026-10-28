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
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

// 1. Service Status & Storage Analytics
router.get('/status', DriveController.getDriveStatus);
router.get('/stats', authenticate, DriveController.getCategoryStats);

// 2. File Verification Only (Dry-run without saving)
router.post(
  '/verify',
  authenticate,
  uploadMiddleware.single('file'),
  DriveController.verifyDocumentOnly
);

// 3. Upload & Verify File (Routes to Google Drive Category Folder)
router.post(
  '/upload',
  authenticate,
  mutationRateLimiter,
  uploadMiddleware.single('file'),
  validateRequest({ body: uploadDocumentBodySchema }),
  DriveController.uploadDocument
);

// 4. List Documents (Category filter, text search, pagination)
router.get(
  '/',
  authenticate,
  validateRequest({ query: queryDocumentsSchema }),
  DriveController.getDocuments
);

// 5. Download Document Stream (Strict authentication required)
router.get(
  '/:id/download',
  authenticate,
  DriveController.downloadDocument
);

// 6. Preview Document Inline Stream (Strict authentication required)
router.get(
  '/:id/preview',
  authenticate,
  DriveController.previewDocument
);

// 7. Get Document Metadata
router.get(
  '/:id',
  authenticate,
  validateRequest({ params: documentIdParamSchema }),
  DriveController.getDocumentById
);

// 8. Delete Document (Google Drive & Database soft-delete)
router.delete(
  '/:id',
  authenticate,
  validateRequest({ params: documentIdParamSchema }),
  DriveController.deleteDocument
);

export const driveRoutes = router;
