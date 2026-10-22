import { Document } from 'mongoose';

export type CounterName =
  | 'taskIdCounter'
  | 'serviceIdCounter'
  | 'clientIdCounter'
  | 'leadIdCounter'
  | string;

export interface ICounter {
  _id: string;
  seq: number;
  name?: string;
  prefix?: string;
  padLength?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICounterDocument extends Document {
  _id: any;
  seq: number;
  name?: string;
  prefix?: string;
  padLength?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
