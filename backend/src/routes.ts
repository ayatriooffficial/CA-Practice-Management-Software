import { Router, Request, Response } from 'express';
import { authRoutes } from './modules/auth/auth.routes';
import { clientRoutes } from './modules/client/client.routes';
import { leadRoutes } from './modules/lead/lead.routes';
import { serviceRoutes } from './modules/service/service.routes';
import { driveRoutes } from './modules/drive/drive.routes';
import { agentCenterRoutes } from './modules/agentCenter/agent.routes';
import { taskRoutes } from './modules/task/task.routes';
import { counterRoutes } from './modules/counter/counter.routes';
import { noticeRoutes } from './modules/notice/notice.routes';
import { syncRoutes } from './modules/sync/sync.routes';
import { complianceRoutes } from './modules/compliance/compliance.routes';
import { financialRoutes } from './modules/financials/financial.routes';
import { quotationRoutes } from './modules/quotation/quotation.routes';
import { optionalAuthenticate } from './middlewares/authenticate';
import { ApiResponse } from './shared/utils/apiResponse';

const router = Router();

// Health Check Endpoint
router.get('/health', (_req: Request, res: Response) => {
  return ApiResponse.success(
    res,
    {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
    'Ayatrio API server is healthy and running'
  );
});

// Authentication Module (Public + Session)
router.use('/auth', authRoutes);

// Feature Modules (with optional authentication to support both authenticated and development/guest modes)
router.use('/clients', optionalAuthenticate, clientRoutes);
router.use('/leads', optionalAuthenticate, leadRoutes);
router.use('/services', optionalAuthenticate, serviceRoutes);
router.use('/drive', optionalAuthenticate, driveRoutes);
router.use('/tasks', optionalAuthenticate, taskRoutes);
router.use('/agent-center', optionalAuthenticate, agentCenterRoutes);
router.use('/counters', optionalAuthenticate, counterRoutes);
router.use('/notices', optionalAuthenticate, noticeRoutes);
router.use('/sync', optionalAuthenticate, syncRoutes);
router.use('/compliance', optionalAuthenticate, complianceRoutes);
router.use('/financials', financialRoutes);
router.use('/quotations', optionalAuthenticate, quotationRoutes);

export const appRouter = router;
