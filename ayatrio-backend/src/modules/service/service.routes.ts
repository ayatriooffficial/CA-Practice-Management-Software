import { Router } from 'express';
import { ServiceController } from './service.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  createServiceSchema,
  updateServiceSchema,
  queryServiceSchema,
  serviceIdParamSchema,
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

export const serviceRoutes = router;
