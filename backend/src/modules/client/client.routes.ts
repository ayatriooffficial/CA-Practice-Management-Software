import { Router } from 'express';
import { ClientController } from './client.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  createClientSchema,
  updateClientSchema,
  queryClientSchema,
  clientIdParamSchema,
  promoterItemSchema,
  statutoryItemSchema,
  recurringItemSchema,
} from './client.validation';
import { mutationRateLimiter } from '../../middlewares/rateLimiter';
import { uploadMiddleware } from '../drive/fileVerification';
import { z } from 'zod';

const router = Router();

const fileTypeParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Client ID format'),
  fileType: z.enum(['promoter', 'statutory', 'recurring']),
});

const removeFileParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Client ID format'),
  fileType: z.enum(['promoter', 'statutory', 'recurring']),
  itemId: z.string().min(1, 'Item ID is required'),
});

const customerFilePayloadSchema = z.union([
  promoterItemSchema,
  statutoryItemSchema,
  recurringItemSchema,
]);

// Client Statistics & Overview
router.get('/stats', ClientController.getClientStats);

// List Clients (Pagination, Search, Advanced Filters)
router.get(
  '/',
  validateRequest({ query: queryClientSchema }),
  ClientController.getAllClients
);

// Create New Client
router.post(
  '/',
  mutationRateLimiter,
  validateRequest({ body: createClientSchema }),
  ClientController.createClient
);

// Get Single Client
router.get(
  '/:id',
  validateRequest({ params: clientIdParamSchema }),
  ClientController.getClientById
);

// Update Client Details
router.patch(
  '/:id',
  mutationRateLimiter,
  validateRequest({ params: clientIdParamSchema, body: updateClientSchema }),
  ClientController.updateClient
);

// Soft Delete Client
router.delete(
  '/:id',
  mutationRateLimiter,
  validateRequest({ params: clientIdParamSchema }),
  ClientController.softDeleteClient
);

// Restore Soft-Deleted Client
router.patch(
  '/:id/restore',
  mutationRateLimiter,
  validateRequest({ params: clientIdParamSchema }),
  ClientController.restoreClient
);

// Permanent Delete Client
router.delete(
  '/:id/permanent',
  mutationRateLimiter,
  validateRequest({ params: clientIdParamSchema }),
  ClientController.permanentDeleteClient
);

// Add item to Client Customer Files (promoter / statutory / recurring)
router.post(
  '/:id/files/:fileType',
  mutationRateLimiter,
  validateRequest({ params: fileTypeParamSchema, body: customerFilePayloadSchema as any }),
  ClientController.addCustomerFileItem
);

// Remove item from Client Customer Files
router.delete(
  '/:id/files/:fileType/:itemId',
  mutationRateLimiter,
  validateRequest({ params: removeFileParamSchema }),
  ClientController.removeCustomerFileItem
);

// Upload Client Profile Photo to Google Drive
router.post(
  '/:id/photo',
  mutationRateLimiter,
  validateRequest({ params: clientIdParamSchema }),
  uploadMiddleware.single('file'),
  ClientController.uploadPhoto
);

// Upload Statutory Document Attachment to Google Drive
router.post(
  '/:id/statutory-file',
  mutationRateLimiter,
  validateRequest({ params: clientIdParamSchema }),
  uploadMiddleware.single('file'),
  ClientController.uploadStatutoryAttachment
);

// Upload General/Compliance Document for Client to Google Drive
router.post(
  '/:id/documents',
  mutationRateLimiter,
  validateRequest({ params: clientIdParamSchema }),
  uploadMiddleware.single('file'),
  ClientController.uploadDocument
);

// Licenses
router.post('/:id/licenses', ClientController.addLicense);
router.delete('/:id/licenses/:subId', ClientController.deleteLicense);

// Digital Signatures (DSC)
router.post('/:id/dscs', ClientController.addDsc);
router.delete('/:id/dscs/:subId', ClientController.deleteDsc);

// Document Movement (In - Out)
router.post('/:id/documents-in-out', ClientController.addDocumentInOut);
router.delete('/:id/documents-in-out/:subId', ClientController.deleteDocumentInOut);

// Service Settings
router.patch('/:id/service-settings', ClientController.updateServiceSettings);

// Passwords & Statutory Credentials
router.post('/:id/passwords', ClientController.addPassword);
router.delete('/:id/passwords/:subId', ClientController.deletePassword);

// Internal Notes
router.post('/:id/notes', ClientController.addNote);
router.delete('/:id/notes/:subId', ClientController.deleteNote);

export const clientRoutes = router;
