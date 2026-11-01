import mongoose from 'mongoose';
import { TodoModel } from './todo.model';

export class TodoService {
  /**
   * List todos personal to the logged in user
   */
  static async listUserTodos(orgId: string, userId: string) {
    const userObjId = new mongoose.Types.ObjectId(userId);
    const orgObjId = new mongoose.Types.ObjectId(orgId);

    const items = await TodoModel.find({
      userId: userObjId,
      orgId: orgObjId,
    })
      .sort({ completed: 1, dueDate: 1, createdAt: -1 })
      .lean();

    return items.map((item) => ({
      id: String(item._id),
      title: item.title,
      completed: item.completed,
      completedAt: item.completedAt ? item.completedAt.toISOString() : null,
      dueDate: item.dueDate || null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));
  }

  /**
   * Create a new todo personal to the logged in user
   */
  static async createTodo(
    orgId: string,
    userId: string,
    data: { title: string; dueDate?: string | null }
  ) {
    if (!data.title || !data.title.trim()) {
      throw { statusCode: 400, message: 'Title is required' };
    }

    const todo = await TodoModel.create({
      orgId: new mongoose.Types.ObjectId(orgId),
      userId: new mongoose.Types.ObjectId(userId),
      title: data.title.trim(),
      dueDate: data.dueDate?.trim() || null,
      completed: false,
    });

    return {
      id: String(todo._id),
      title: todo.title,
      completed: todo.completed,
      completedAt: null,
      dueDate: todo.dueDate || null,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    };
  }

  /**
   * Update todo
   */
  static async updateTodo(
    orgId: string,
    userId: string,
    todoId: string,
    updates: { title?: string; completed?: boolean; dueDate?: string | null }
  ) {
    if (!mongoose.Types.ObjectId.isValid(todoId)) {
      throw { statusCode: 400, message: 'Invalid todo ID' };
    }

    const todo = await TodoModel.findOne({
      _id: new mongoose.Types.ObjectId(todoId),
      orgId: new mongoose.Types.ObjectId(orgId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!todo) {
      throw { statusCode: 404, message: 'To-Do item not found' };
    }

    if (typeof updates.title === 'string' && updates.title.trim()) {
      todo.title = updates.title.trim();
    }

    if (typeof updates.completed === 'boolean') {
      todo.completed = updates.completed;
      todo.completedAt = updates.completed ? new Date() : null;
    }

    if (updates.dueDate !== undefined) {
      todo.dueDate = updates.dueDate ? updates.dueDate.trim() : null;
    }

    await todo.save();

    return {
      id: String(todo._id),
      title: todo.title,
      completed: todo.completed,
      completedAt: todo.completedAt ? todo.completedAt.toISOString() : null,
      dueDate: todo.dueDate || null,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    };
  }

  /**
   * Delete todo
   */
  static async deleteTodo(orgId: string, userId: string, todoId: string) {
    if (!mongoose.Types.ObjectId.isValid(todoId)) {
      throw { statusCode: 400, message: 'Invalid todo ID' };
    }

    const res = await TodoModel.deleteOne({
      _id: new mongoose.Types.ObjectId(todoId),
      orgId: new mongoose.Types.ObjectId(orgId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (res.deletedCount === 0) {
      throw { statusCode: 404, message: 'To-Do item not found' };
    }

    return { success: true };
  }
}

