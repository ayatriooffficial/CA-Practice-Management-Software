import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { TodoController } from './todo.controller';

const router = Router();

router.use(authenticate);

router.get('/', TodoController.listTodos);
router.post('/', TodoController.createTodo);
router.patch('/:id', TodoController.updateTodo);
router.delete('/:id', TodoController.deleteTodo);

export const todoRoutes = router;

