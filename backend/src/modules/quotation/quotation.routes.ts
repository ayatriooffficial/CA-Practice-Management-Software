import { Router } from 'express';
import { QuotationController } from './quotation.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { createQuotationSchema, updateQuotationSchema } from './quotation.validation';
import { mutationRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

router.get('/', QuotationController.getQuotations);
router.post(
  '/',
  mutationRateLimiter,
  validateRequest({ body: createQuotationSchema }),
  QuotationController.createQuotation
);
router.get('/:id', QuotationController.getQuotationById);
router.patch(
  '/:id',
  mutationRateLimiter,
  validateRequest({ body: updateQuotationSchema }),
  QuotationController.updateQuotation
);
router.delete('/:id', mutationRateLimiter, QuotationController.deleteQuotation);

export const quotationRoutes = router;
