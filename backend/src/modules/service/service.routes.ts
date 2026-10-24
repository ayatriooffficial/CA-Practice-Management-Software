import { Router } from 'express';
import { ServiceController } from './service.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  createServiceSchema,
  updateServiceSchema,
  queryServiceSchema,
  serviceIdParamSchema,
  toggleClientServiceParamSchema,
  toggleClientServiceBodySchema,
  updateSopSchema,
  addServiceCommentSchema,
} from './service.validation';
import { mutationRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// Service catalog analytics
router.get('/stats', ServiceController.getServiceStats);

// List Services (Pagination, Filtering, Text Search)
router.get(
  '/',
  validateRequest({ query: queryServiceSchema }),
  ServiceController.getAllServices
);

// Create New Service
router.post(
  '/',
  mutationRateLimiter,
  validateRequest({ body: createServiceSchema }),
  ServiceController.createService
);

// Get Single Service by ID
router.get(
  '/:id',
  validateRequest({ params: serviceIdParamSchema }),
  ServiceController.getServiceById
);

// Update Service
router.patch(
  '/:id',
  mutationRateLimiter,
  validateRequest({ params: serviceIdParamSchema, body: updateServiceSchema }),
  ServiceController.updateService
);

// Restore Soft-Deleted Service
router.patch(
  '/:id/restore',
  mutationRateLimiter,
  validateRequest({ params: serviceIdParamSchema }),
  ServiceController.restoreService
);

// Soft-Delete Service
router.delete(
  '/:id',
  mutationRateLimiter,
  validateRequest({ params: serviceIdParamSchema }),
  ServiceController.softDeleteService
);

// Permanent Delete Service
router.delete(
  '/:id/hard',
  mutationRateLimiter,
  validateRequest({ params: serviceIdParamSchema }),
  ServiceController.hardDeleteService
);

// Sync Service Templates to Active Tasks
router.post(
  '/:id/sync',
  mutationRateLimiter,
  validateRequest({ params: serviceIdParamSchema }),
  ServiceController.syncServiceToTasks
);

// Toggle Client Service Compliance Status
router.patch(
  '/:id/clients/:clientId/toggle',
  mutationRateLimiter,
  validateRequest({
    params: toggleClientServiceParamSchema,
    body: toggleClientServiceBodySchema,
  }),
  ServiceController.toggleClientService
);

// Update Service SOP
router.patch(
  '/:id/sop',
  mutationRateLimiter,
  validateRequest({ params: serviceIdParamSchema, body: updateSopSchema }),
  ServiceController.updateSop
);

// Get Comments for Service SOP
router.get(
  '/:id/comments',
  validateRequest({ params: serviceIdParamSchema }),
  ServiceController.getComments
);

// Add Comment to Service SOP
router.post(
  '/:id/comments',
  mutationRateLimiter,
  validateRequest({ params: serviceIdParamSchema, body: addServiceCommentSchema }),
  ServiceController.addComment
);

export const serviceRoutes = router;
