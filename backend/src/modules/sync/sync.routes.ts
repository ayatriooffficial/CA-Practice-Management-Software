import { Router } from 'express';
import { SyncController } from './sync.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { mutationRateLimiter } from '../../middlewares/rateLimiter';
import { syncClientsSchema, syncJobQuerySchema, activityQuerySchema } from './sync.validation';

const router = Router();

/** GET /sync/entitlement */
router.get('/entitlement', SyncController.getEntitlement);
router.get('/credits', SyncController.getEntitlement);
router.get('/eligibility', SyncController.getEligibility);

/** POST /sync/clients - start a sync job */
router.post(
  '/clients',
  mutationRateLimiter,
  validateRequest({ body: syncClientsSchema }),
  SyncController.syncClients
);

/** GET /sync/jobs */
router.get(
  '/jobs',
  validateRequest({ query: syncJobQuerySchema }),
  SyncController.getJobs
);

/** GET /sync/activity */
router.get(
  '/activity',
  validateRequest({ query: activityQuerySchema }),
  SyncController.getActivity
);
router.get('/jobs/summary', SyncController.getSummary);

export const syncRoutes = router;
