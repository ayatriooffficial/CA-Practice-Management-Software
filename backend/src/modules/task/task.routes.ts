import { Router } from 'express';
import { TaskController } from './task.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { uploadMiddleware } from '../drive/fileVerification';
import { authenticate } from '../../middlewares/authenticate';
import {
  taskIdParamSchema,
  createTaskSchema,
  updateTaskSchema,
  addCommentSchema,
  profitabilityReportQuerySchema,
} from './task.validation';

const router = Router();

router.get('/stats', TaskController.getTaskStats);
router.get('/summary-matrix', TaskController.getTaskSummaryMatrix);
router.get('/profitability-report', authenticate, validateRequest({ query: profitabilityReportQuerySchema }), TaskController.getProfitabilityReport);
router.get('/', TaskController.getAllTasks);
router.get('/:id', validateRequest({ params: taskIdParamSchema }), TaskController.getTaskById);
router.post('/', validateRequest({ body: createTaskSchema }), TaskController.createTask);
router.put(
  '/:id',
  validateRequest({ params: taskIdParamSchema, body: updateTaskSchema }),
  TaskController.updateTask
);
router.patch(
  '/:id',
  validateRequest({ params: taskIdParamSchema, body: updateTaskSchema }),
  TaskController.updateTask
);
router.delete('/:id', validateRequest({ params: taskIdParamSchema }), TaskController.deleteTask);
router.post(
  '/:id/comments',
  validateRequest({ params: taskIdParamSchema, body: addCommentSchema }),
  TaskController.addComment
);

router.patch('/:id/subtasks/:subTaskId/toggle', TaskController.toggleSubTask);
router.patch('/:id/checklist/:itemId/toggle', TaskController.toggleChecklist);
router.patch('/:id/document-requests/:docId/toggle', TaskController.toggleDocumentRequest);
router.post(
  '/:id/document-requests/:docId/upload',
  uploadMiddleware.single('file'),
  TaskController.uploadTaskDocument
);
router.post(
  '/:id/documents',
  uploadMiddleware.single('file'),
  TaskController.uploadGeneralTaskDocument
);

export const taskRoutes = router;

