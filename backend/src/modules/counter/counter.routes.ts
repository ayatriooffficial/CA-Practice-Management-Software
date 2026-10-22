import { Router } from 'express';
import { CounterController } from './counter.controller';

const router = Router();

router.get('/', CounterController.getAllCounters);
router.post('/sync', CounterController.syncCounters);
router.get('/:name', CounterController.getCounter);

export const counterRoutes = router;
