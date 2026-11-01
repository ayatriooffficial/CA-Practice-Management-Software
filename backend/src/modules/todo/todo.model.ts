import { Schema, model } from 'mongoose';
import { ITodo } from './todo.interface';

const todoSchema = new Schema<ITodo>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'To-Do title is required'], trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: String, default: 'General', trim: true },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    completed: { type: Boolean, default: false, index: true },
    completedAt: { type: Date, default: null },
    dueDate: { type: String, default: null, trim: true },
    status: { type: String, default: 'Pending', trim: true },
    sourceType: {
      type: String,
      enum: ['manual', 'dsc', 'license', 'document', 'task'],
      default: 'manual',
    },
    sourceId: { type: String, default: null, trim: true },
    dedupKey: { type: String, default: null, index: true, trim: true },
    actionUrl: { type: String, default: null, trim: true },
    actionLabel: { type: String, default: null, trim: true },
    clientName: { type: String, default: '', trim: true },
    clientId: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

todoSchema.index({ userId: 1, completed: 1, dueDate: 1 });
todoSchema.index({ orgId: 1, dedupKey: 1 });

export const TodoModel = model<ITodo>('Todo', todoSchema);
