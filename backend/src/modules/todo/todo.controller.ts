import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { TodoService, isAdminRole } from './todo.service';

export class TodoController {
  /**
   * 1. Get role-based summary counts
   */
  static async getSummary(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const summary = await TodoService.getTodoSummary(user.orgId, {
        userId: user.userId,
        name: user.name || '',
        role: user.role || 'employee',
      });
      return ApiResponse.success(res, summary);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to fetch to-do summary', err.statusCode || 500);
    }
  }

  /**
   * 2. Get administrative tasks (Admin Only)
   */
  static async getAdminTasks(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      if (!isAdminRole(user.role)) {
        return ApiResponse.error(
          res,
          'Access forbidden: Administrative role required',
          HTTP_STATUS.FORBIDDEN
        );
      }

      const { category, status, search } = req.query as {
        category?: string;
        status?: string;
        search?: string;
      };

      const tasks = await TodoService.getAdminTasks(user.orgId, user.userId, {
        category,
        status,
        search,
      });

      return ApiResponse.success(res, tasks);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to fetch admin tasks', err.statusCode || 500);
    }
  }

  /**
   * 3. Toggle admin task resolution (Admin Only)
   */
  static async toggleAdminTask(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      if (!isAdminRole(user.role)) {
        return ApiResponse.error(
          res,
          'Access forbidden: Administrative role required',
          HTTP_STATUS.FORBIDDEN
        );
      }

      const { dedupKey, completed } = req.body || {};
      if (!dedupKey) {
        return ApiResponse.error(res, 'dedupKey is required', HTTP_STATUS.BAD_REQUEST);
      }

      const result = await TodoService.toggleAdminTask(
        user.orgId,
        user.userId,
        dedupKey,
        Boolean(completed)
      );

      return ApiResponse.success(res, result, 'Task status updated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to toggle admin task', err.statusCode || 500);
    }
  }

  /**
   * 4. Get team tasks (Admin Only)
   */
  static async getTeamTasks(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      if (!isAdminRole(user.role)) {
        return ApiResponse.error(
          res,
          'Access forbidden: Administrative role required',
          HTTP_STATUS.FORBIDDEN
        );
      }

      const { employee, employeeId, clientId, clientName, status, priority, category, search, page, limit } = req.query as {
        employee?: string;
        employeeId?: string;
        clientId?: string;
        clientName?: string;
        status?: string;
        priority?: string;
        category?: string;
        search?: string;
        page?: string;
        limit?: string;
      };

      const teamTasks = await TodoService.getTeamTasks(user.orgId, {
        employeeId: employeeId || employee,
        clientId,
        clientName,
        status,
        priority,
        category,
        search,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      return ApiResponse.success(res, teamTasks);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to fetch team tasks', err.statusCode || 500);
    }
  }

  /**
   * 5. Get assigned tasks (For current user / Employee)
   */
  static async getMyTasks(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const { status, priority, search } = req.query as {
        status?: string;
        priority?: string;
        search?: string;
      };

      const myTasks = await TodoService.getEmployeeTasks(
        user.orgId,
        {
          userId: user.userId,
          name: user.name || '',
          role: user.role || 'employee',
        },
        { status, priority, search }
      );

      return ApiResponse.success(res, myTasks);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to fetch assigned tasks', err.statusCode || 500);
    }
  }

  /**
   * 6. Assign a new task to an employee (Admin Only)
   */
  static async assignTask(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      if (!isAdminRole(user.role)) {
        return ApiResponse.error(
          res,
          'Access forbidden: Only administrators can assign tasks',
          HTTP_STATUS.FORBIDDEN
        );
      }

      const createdTask = await TodoService.assignTask(
        user.orgId,
        {
          userId: user.userId,
          name: user.name || '',
          role: user.role || 'admin',
        },
        req.body
      );

      return ApiResponse.success(res, createdTask, 'Task assigned successfully', HTTP_STATUS.CREATED);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to assign task', err.statusCode || 500);
    }
  }

  /**
   * 7. Update task progress, checklist, status, and note (Assignee or Admin)
   */
  static async updateTaskProgress(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const taskIdParam = String(req.params.id || '');
      if (!taskIdParam) {
        return ApiResponse.error(res, 'Task ID is required', HTTP_STATUS.BAD_REQUEST);
      }

      const updated = await TodoService.updateTaskProgress(
        user.orgId,
        {
          userId: user.userId,
          name: user.name || '',
          role: user.role || 'employee',
        },
        taskIdParam,
        req.body
      );

      return ApiResponse.success(res, updated, 'Task progress updated successfully');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to update task progress', err.statusCode || 500);
    }
  }

  /**
   * 8. Get calendar events for To-Do
   */
  static async getCalendarEvents(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const month = req.query.month as string | undefined;
      const employeeId = req.query.employeeId as string | undefined;
      const events = await TodoService.getCalendarEvents(
        user.orgId,
        {
          userId: user.userId,
          name: user.name || '',
          role: user.role || 'employee',
        },
        month,
        employeeId
      );

      return ApiResponse.success(res, events);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to fetch calendar events', err.statusCode || 500);
    }
  }

  /**
   * 9. Legacy listTodos
   */
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

  /**
   * 10. Legacy createTodo (also handles full personal to-do creation)
   */
  static async createTodo(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const { title, dueDate, description, priority, category, clientName, clientId } = req.body || {};
      const item = await TodoService.createTodo(user.orgId, user.userId, {
        title,
        dueDate,
        description,
        priority,
        category,
        clientName,
        clientId,
      });
      return ApiResponse.success(res, item, 'To-Do item created', HTTP_STATUS.CREATED);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to create to-do', err.statusCode || 500);
    }
  }

  /**
   * 11. Legacy updateTodo
   */
  static async updateTodo(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user?.userId || !user?.orgId) {
        return ApiResponse.error(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED);
      }

      const id = String(req.params.id);
      const { title, completed, dueDate, description, priority, category } = req.body || {};
      const updated = await TodoService.updateTodo(user.orgId, user.userId, id, {
        title,
        completed,
        dueDate,
        description,
        priority,
        category,
      });

      return ApiResponse.success(res, updated, 'To-Do item updated');
    } catch (err: any) {
      return ApiResponse.error(res, err.message || 'Failed to update to-do', err.statusCode || 500);
    }
  }

  /**
   * 12. Legacy deleteTodo
   */
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
