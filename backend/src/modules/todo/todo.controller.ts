import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { TodoService } from './todo.service';

export class TodoController {
  static async listTodos(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const items = await TodoService.listUserTodos(user.orgId, user.userId);
      return ApiResponse.success(res, items);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to fetch to-dos', err.statusCode || 500);
    }
  }

  static async createTodo(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const { title, dueDate } = req.body || {};
      const item = await TodoService.createTodo(user.orgId, user.userId, { title, dueDate });
      return ApiResponse.success(res, item, 'To-Do item created', HTTP_STATUS.CREATED);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to create to-do', err.statusCode || 500);
    }
  }

  static async updateTodo(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const id = String(req.params.id);
      const { title, completed, dueDate } = req.body || {};
      const updated = await TodoService.updateTodo(user.orgId, user.userId, id, {
        title,
        completed,
        dueDate,
      });

      return ApiResponse.success(res, updated, 'To-Do item updated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to update to-do', err.statusCode || 500);
    }
  }

  static async deleteTodo(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const id = String(req.params.id);
      await TodoService.deleteTodo(user.orgId, user.userId, id);
      return ApiResponse.success(res, { id }, 'To-Do item deleted');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to delete to-do', err.statusCode || 500);
    }
  }
}

