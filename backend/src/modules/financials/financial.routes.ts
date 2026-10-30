import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validateRequest } from '../../middlewares/validateRequest';
import { FinancialController } from './financial.controller';
import {
  compensationSchema, convertProformaSchema, createExpenseSchema, createInvoiceSchema, createReceiptSchema, createTimeEntrySchema,
  expenseStateSchema, reportDateQuerySchema,
  voidInvoiceSchema,
} from './financial.validation';

const router = Router();
router.use(authenticate);
router.get('/report', validateRequest({ query: reportDateQuerySchema }), FinancialController.getReport);
router.get('/report/pdf', validateRequest({ query: reportDateQuerySchema }), FinancialController.getReportPdf);
router.get('/invoices', FinancialController.listInvoices);
router.post('/invoices', validateRequest({ body: createInvoiceSchema }), FinancialController.createInvoice);
router.put('/invoices/:id', FinancialController.updateInvoice);
router.post('/invoices/:id/convert', validateRequest({ body: convertProformaSchema }), FinancialController.convertProforma);
router.patch('/invoices/:id/void', validateRequest({ body: voidInvoiceSchema }), FinancialController.voidInvoice);
router.get('/receipts', FinancialController.listReceipts);
router.post('/receipts', validateRequest({ body: createReceiptSchema }), FinancialController.createReceipt);
router.get('/time-entries', FinancialController.listTimeEntries);
router.post('/time-entries', validateRequest({ body: createTimeEntrySchema }), FinancialController.createTimeEntry);
router.get('/expenses', FinancialController.listExpenses);
router.post('/expenses', validateRequest({ body: createExpenseSchema }), FinancialController.createExpense);
router.patch('/expenses/:id/state', validateRequest({ body: expenseStateSchema }), FinancialController.setExpenseState);
router.get('/employees/internal-cost-rates', FinancialController.listEmployeeCostRates);
router.put('/employees/:id/internal-cost-rate', validateRequest({ body: compensationSchema }), FinancialController.setEmployeeCostRate);

export const financialRoutes = router;
