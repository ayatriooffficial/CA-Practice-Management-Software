import { Router } from 'express';
import { AppError } from '../../shared/utils/apiError';
import { AgentCenterController } from './agent.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { mutationRateLimiter } from '../../middlewares/rateLimiter';
import {
  agentIdParamSchema,
  createAgentSchema,
  historyQuerySchema,
  queryAgentsSchema,
  testRunSchema,
  updateAgentSchema,
} from './agent.validation';

const router = Router();

// Public / operational endpoints that do not require an active user session:
router.get('/definitions', AgentCenterController.definitions);
router.get('/integrations/status', AgentCenterController.integrationsStatus);
router.post('/scheduler/tick', AgentCenterController.schedulerTick);

// Tenant-scoped endpoints require an organization context:
router.use((req, _res, next) => req.user?.orgId ? next() : next(AppError.unauthorized('Sign in to access Agent Center.')));

router.get('/history', validateRequest({ query: historyQuerySchema }), AgentCenterController.globalHistory);
router.get('/agents', validateRequest({ query: queryAgentsSchema }), AgentCenterController.list);
router.post('/agents', mutationRateLimiter, validateRequest({ body: createAgentSchema }), AgentCenterController.create);
router.get('/agents/:id/history', validateRequest({ params: agentIdParamSchema }), AgentCenterController.agentHistory);
router.post('/agents/:id/publish', mutationRateLimiter, validateRequest({ params: agentIdParamSchema }), AgentCenterController.publish);
router.post('/agents/:id/disable', mutationRateLimiter, validateRequest({ params: agentIdParamSchema }), AgentCenterController.disable);
router.delete('/agents/:id', mutationRateLimiter, validateRequest({ params: agentIdParamSchema }), AgentCenterController.deleteDraft);
router.post('/agents/:id/test-run', mutationRateLimiter, validateRequest({ params: agentIdParamSchema, body: testRunSchema }), AgentCenterController.testRun);
router.get('/agents/:id', validateRequest({ params: agentIdParamSchema }), AgentCenterController.get);
router.put('/agents/:id', mutationRateLimiter, validateRequest({ params: agentIdParamSchema, body: updateAgentSchema }), AgentCenterController.update);

export const agentCenterRoutes = router;
