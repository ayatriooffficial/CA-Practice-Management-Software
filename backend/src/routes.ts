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
import { attendanceRoutes } from './modules/attendance/attendance.routes';
import { quotationRoutes } from './modules/quotation/quotation.routes';
import { integrationRoutes } from './modules/integration/integration.routes';
import { pdfSignerRoutes } from './modules/pdfSigner/pdfSigner.routes';
import { documentRoutes } from './modules/document/document.routes';
import { gstStaffRoutes, gstPublicRoutes } from './modules/gstForm/gstForm.routes';
import { GstFormController } from './modules/gstForm/gstForm.controller';
import { optionalAuthenticate } from './middlewares/authenticate';
import { ApiResponse } from './shared/utils/apiResponse';
import { workdoneRoutes } from './modules/workdone/workdone.routes';

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

// Attendance & Home Dashboard Module
router.use('/attendance', attendanceRoutes);
router.use('/home/attendance', attendanceRoutes);

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
router.use('/integrations', optionalAuthenticate, integrationRoutes);
router.use('/pdf-signer', optionalAuthenticate, pdfSignerRoutes);
router.use('/documents', optionalAuthenticate, documentRoutes);
router.use('/workdone', optionalAuthenticate,workdoneRoutes );


// GST Data Collection Module (Staff + Public Form)
router.use('/gst-links', optionalAuthenticate, gstStaffRoutes);
router.use('/public/gst-form', gstPublicRoutes);
router.get('/gst-submissions/:id', optionalAuthenticate, GstFormController.getSubmission);

export const appRouter = router;
