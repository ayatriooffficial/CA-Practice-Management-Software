import { Router } from 'express';
import { CommunicationController } from './communication.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

/**
 * GET /api/v1/communications/sync
 * Secure endpoint to trigger manual/scheduled incoming email synchronization
 */
router.get('/sync', authenticate, CommunicationController.syncCommunications);

/**
 * GET /api/v1/communications
 * Retrieves paginated list of client communications
 */
router.get('/', authenticate, CommunicationController.getCommunications);

/**
 * GET /api/v1/communications/client/:clientId
 * Retrieves communications linked to a specific client
 */
router.get('/client/:clientId', authenticate, CommunicationController.getCommunicationsByClient);

export const communicationRoutes = router;

