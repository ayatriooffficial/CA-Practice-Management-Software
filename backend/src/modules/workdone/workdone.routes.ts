import { Router } from 'express';
import { FinancialController } from './workdone.controller';

const router = Router();

// GET /api/financial/client-work-done
router.get('/client-work-done', FinancialController.getWorkDoneClient);

export const workdoneRoutes = router;