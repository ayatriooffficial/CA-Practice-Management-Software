import { Router } from 'express';
import { ComplianceController } from './compliance.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { mutationRateLimiter } from '../../middlewares/rateLimiter';
import { authenticate } from '../../middlewares/authenticate';
import {
  complianceGridQuerySchema,
  complianceEntryUpsertSchema,
  complianceItemRefreshSchema,
  complianceGstSyncSchema,
} from './compliance.validation';

const router = Router();

/** GET /compliance/categories */
router.get('/categories', ComplianceController.getCategories);
router.get('/calendar', ComplianceController.getCalendar);
router.get('/summary', ComplianceController.getSummary);

/** GET /compliance/grid?categoryId=...&fy=...&frequency=... */
router.get(
  '/grid',
  validateRequest({ query: complianceGridQuerySchema }),
  ComplianceController.getGrid
);

/** PUT /compliance/entries - manual categories only */
router.put(
  '/entries',
  mutationRateLimiter,
  validateRequest({ body: complianceEntryUpsertSchema }),
  ComplianceController.upsertEntry
);

/** POST /compliance/items/refresh */
router.post(
  '/items/refresh',
  mutationRateLimiter,
  validateRequest({ body: complianceItemRefreshSchema }),
  ComplianceController.refreshItems
);

/** POST /compliance/sync/gst */
router.post(
  '/sync/gst',
  authenticate,
  mutationRateLimiter,
  validateRequest({ body: complianceGstSyncSchema }),
  ComplianceController.syncGst
);

export const complianceRoutes = router;
