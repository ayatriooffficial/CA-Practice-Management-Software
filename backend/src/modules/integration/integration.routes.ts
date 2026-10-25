import { Router } from 'express';
import { IntegrationController } from './integration.controller';

const router = Router();

router.get('/google', IntegrationController.getGoogleIntegration);
router.get('/google/auth-config', IntegrationController.getAuthConfig);
router.get('/google/access-token', IntegrationController.getAccessToken);
router.post('/google/exchange', IntegrationController.exchangeCode);
router.post('/google', IntegrationController.upsertGoogleIntegration);
router.delete('/google', IntegrationController.disconnectGoogle);

export const integrationRoutes = router;
