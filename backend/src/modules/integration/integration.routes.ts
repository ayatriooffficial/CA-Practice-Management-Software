import { Router } from 'express';
import { IntegrationController } from './integration.controller';

const router = Router();

router.get('/google', IntegrationController.getGoogleIntegration);
router.post('/google', IntegrationController.upsertGoogleIntegration);
router.delete('/google', IntegrationController.disconnectGoogle);

export const integrationRoutes = router;
