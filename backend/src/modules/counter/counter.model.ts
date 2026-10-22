import { Schema, model } from 'mongoose';
import { ICounterDocument } from './counter.interface';

const counterSchema = new Schema<ICounterDocument>(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    seq: {
      type: Number,
      required: true,
      default: 0,
    },
    name: {
      type: String,
      default: '',
    },
    prefix: {
      type: String,
      default: '',
    },
    padLength: {
      type: Number,
      default: 5,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'counters',
  }
);

export const Counter = model<ICounterDocument>('Counter', counterSchema);
