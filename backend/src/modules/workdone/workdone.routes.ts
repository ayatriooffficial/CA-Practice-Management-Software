import { Router } from 'express';
import { validateWorkDone } from './workdone.validation';
import { FinancialController } from './workdone.controller';

const router = Router();

// GET /api/financial/client-work-done
router.get('/client-work-done', validateWorkDone, FinancialController.getWorkDoneClient);

export const workdoneRoutes = router;