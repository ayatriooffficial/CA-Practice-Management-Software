import { Router } from 'express';
import { TaskController } from './task.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  taskIdParamSchema,
  createTaskSchema,
  updateTaskSchema,
  addCommentSchema,
} from './task.validation';

const router = Router();

router.get('/stats', TaskController.getTaskStats);
router.get('/summary-matrix', TaskController.getTaskSummaryMatrix);
router.get('/', TaskController.getAllTasks);
router.get('/:id', validateRequest({ params: taskIdParamSchema }), TaskController.getTaskById);
router.post('/', validateRequest({ body: createTaskSchema }), TaskController.createTask);
router.put(
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

export const taskRoutes = router;

