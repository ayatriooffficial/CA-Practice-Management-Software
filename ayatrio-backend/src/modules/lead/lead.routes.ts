import { Router } from 'express';
import { LeadController } from './lead.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  createLeadSchema,
  updateLeadSchema,
  queryLeadSchema,
  leadIdParamSchema,
  convertLeadSchema,
} from './lead.validation';
import { mutationRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// Lead Statistics & Overview
router.get('/stats', LeadController.getLeadStats);

// List Leads (with Search, Filter, Pagination)
router.get(
  '/',
  validateRequest({ query: queryLeadSchema }),
  LeadController.getAllLeads
);

// Create New Lead
router.post(
  '/',
  mutationRateLimiter,
  validateRequest({ body: createLeadSchema }),
  LeadController.createLead
);

// Get Single Lead
router.get(
  '/:id',
  validateRequest({ params: leadIdParamSchema }),
  LeadController.getLeadById
);

// Update Lead Details
router.patch(
  '/:id',
  mutationRateLimiter,
  validateRequest({ params: leadIdParamSchema, body: updateLeadSchema }),
  LeadController.updateLead
);

// Soft Delete Lead
router.delete(
  '/:id',
  mutationRateLimiter,
  validateRequest({ params: leadIdParamSchema }),
  LeadController.softDeleteLead
);

// Restore Soft-Deleted Lead
router.patch(
  '/:id/restore',
  mutationRateLimiter,
  validateRequest({ params: leadIdParamSchema }),
  LeadController.restoreLead
);

// Permanent Delete Lead
router.delete(
  '/:id/permanent',
  mutationRateLimiter,
  validateRequest({ params: leadIdParamSchema }),
  LeadController.permanentDeleteLead
);

// Convert Lead to Active Client
router.post(
  '/:id/convert',
  mutationRateLimiter,
  validateRequest({ params: leadIdParamSchema, body: convertLeadSchema }),
  LeadController.convertLead
);

export const leadRoutes = router;
