import { Router } from 'express';
import { DocumentController } from './document.controller';
import { uploadMiddleware } from '../drive/fileVerification';
import { mutationRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// Search people across clients and employees with dynamic filters & server-side pagination
router.get('/people', DocumentController.searchPeople);

// Get full details and associated documents for a single person
router.get('/people/:id', DocumentController.getPersonDetails);

// Upload and associate a new document for this person
router.post(
  '/people/:id/upload',
  mutationRateLimiter,
  uploadMiddleware.single('file'),
  DocumentController.uploadDocument
);

export const documentRoutes = router;
