import { Schema, model } from 'mongoose';
import { ITodo } from './todo.interface';

const todoSchema = new Schema<ITodo>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'To-Do title is required'], trim: true },
    completed: { type: Boolean, default: false, index: true },
    completedAt: { type: Date, default: null },
    dueDate: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

todoSchema.index({ userId: 1, completed: 1, dueDate: 1 });

export const TodoModel = model<ITodo>('Todo', todoSchema);

