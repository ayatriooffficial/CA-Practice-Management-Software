import { Router } from 'express';
import { HomeDashboardController } from './homeDashboard.controller';

const router = Router();

router.get('/metrics-snapshot', HomeDashboardController.getMetricsSnapshot);
router.post('/metrics-snapshot', HomeDashboardController.saveMetricsSnapshot);

export const homeDashboardRoutes = router;

