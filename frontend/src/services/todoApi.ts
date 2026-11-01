import { request } from './apiClient';

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const todoApi = {
  getTodos: async (): Promise<TodoItem[]> => {
    const res = await request<TodoItem[]>('/todos', { method: 'GET' });
    return res.data || [];
  },

  createTodo: async (title: string, dueDate?: string | null): Promise<TodoItem> => {
    const res = await request<TodoItem>('/todos', {
      method: 'POST',
      body: JSON.stringify({ title, dueDate }),
    });
    if (!res.data) throw new Error(res.message || 'Failed to create to-do');
    return res.data;
  },

  updateTodo: async (
    id: string,
    updates: { title?: string; completed?: boolean; dueDate?: string | null }
  ): Promise<TodoItem> => {
    const res = await request<TodoItem>(`/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (!res.data) throw new Error(res.message || 'Failed to update to-do');
    return res.data;
  },

  deleteTodo: async (id: string): Promise<{ id: string }> => {
    const res = await request<{ id: string }>(`/todos/${id}`, {
      method: 'DELETE',
    });
    if (!res.data) throw new Error(res.message || 'Failed to delete to-do');
    return res.data;
  },
};
