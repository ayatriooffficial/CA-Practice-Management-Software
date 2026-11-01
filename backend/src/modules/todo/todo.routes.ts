import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { TodoController } from './todo.controller';

const router = Router();

router.use(authenticate);

// Role-based summary
router.get('/summary', TodoController.getSummary);

// Administrative tasks (Admin only)
router.get('/admin-tasks', TodoController.getAdminTasks);
router.patch('/admin-tasks/toggle', TodoController.toggleAdminTask);

// Team tasks monitoring & delegation (Admin only)
router.get('/team-tasks', TodoController.getTeamTasks);

// Employee / My tasks
router.get('/my-tasks', TodoController.getMyTasks);

// Admin assign task to employee
router.post('/assign', TodoController.assignTask);

// Update task progress / checklist / status (Assignee or Admin)
router.patch('/tasks/:id/progress', TodoController.updateTaskProgress);

// To-Do Calendar events
router.get('/calendar', TodoController.getCalendarEvents);

// Legacy CRUD for backward compatibility & personal to-dos
router.get('/', TodoController.listTodos);
router.post('/', TodoController.createTodo);
router.patch('/:id', TodoController.updateTodo);
router.delete('/:id', TodoController.deleteTodo);

export const todoRoutes = router;
