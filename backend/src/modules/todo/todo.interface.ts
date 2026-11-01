import { Document, Types } from 'mongoose';

export interface ITodo extends Document {
  orgId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  completed: boolean;
  completedAt?: Date | null;
  dueDate?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

