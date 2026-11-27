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
import { authenticate, optionalAuthenticate } from './middlewares/authenticate';
import { ApiResponse } from './shared/utils/apiResponse';
import { workdoneRoutes } from './modules/workdone/workdone.routes';
import { todoRoutes } from './modules/todo/todo.routes';
import { groupRoutes } from './modules/group/group.routes';
import { communicationRoutes } from './modules/client/communication.routes';
import { homeDashboardRoutes } from './modules/homeDashboard/homeDashboard.routes';

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
router.use('/home', optionalAuthenticate, homeDashboardRoutes);

// Feature Modules (authenticated for production data protection & multi-tenant isolation)
router.use('/clients', authenticate, clientRoutes);
router.use('/leads', authenticate, leadRoutes);
router.use('/services', authenticate, serviceRoutes);
router.use('/drive', authenticate, driveRoutes);
router.use('/tasks', authenticate, taskRoutes);
router.use('/agent-center', authenticate, agentCenterRoutes);
router.use('/counters', authenticate, counterRoutes);
router.use('/notices', authenticate, noticeRoutes);
router.use('/sync', authenticate, syncRoutes);
router.use('/compliance', authenticate, complianceRoutes);
router.use('/financials', financialRoutes);
router.use('/quotations', authenticate, quotationRoutes);
router.use('/integrations', authenticate, integrationRoutes);
router.use('/pdf-signer', authenticate, pdfSignerRoutes);
router.use('/documents', authenticate, documentRoutes);
router.use('/workdone', authenticate, workdoneRoutes);
router.use('/todos', authenticate, todoRoutes);
router.use('/groups', authenticate, groupRoutes);
router.use('/communications', authenticate, communicationRoutes);


// GST Data Collection Module (Staff + Public Form)
router.use('/gst-links', optionalAuthenticate, gstStaffRoutes);
router.use('/public/gst-form', gstPublicRoutes);
router.get('/gst-submissions/:id', optionalAuthenticate, GstFormController.getSubmission);

export const appRouter = router;
