import { Router, Request, Response } from 'express';
import { clientRoutes } from './modules/client/client.routes';
import { leadRoutes } from './modules/lead/lead.routes';
import { serviceRoutes } from './modules/service/service.routes';
import { driveRoutes } from './modules/drive/drive.routes';
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

// Mount Feature Modules
router.use('/clients', clientRoutes);
router.use('/leads', leadRoutes);
router.use('/services', serviceRoutes);
router.use('/drive', driveRoutes);

export const appRouter = router;
