import { Types } from 'mongoose';
import { ISoftDeleteDocument } from '../../shared/plugins/softDelete.plugin';

export interface IGroup {
  name: string;
  groupId: string;
  clientIds: Types.ObjectId[];
  pocClientId?: Types.ObjectId | null;
  description?: string;
  status: 'Active' | 'Inactive';
  orgId?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGroupDocument extends IGroup, ISoftDeleteDocument {}

export interface IGroupAggregatedStats {
  entitiesCount: number;
  openTasksCount: number;
  readyToBillCount: number;
  invoicesCount: number;
  proformasCount: number;
  outstandingAmount: number;
  pocName: string;
  pocMobile: string;
  pocEmail: string;
}

export interface IGroupListItem extends IGroup {
  id: string;
  _id: Types.ObjectId;
  stats: IGroupAggregatedStats;
  entities: {
    id: string;
    _id: Types.ObjectId;
    name: string;
    fileNo: string;
    type: string;
    pan?: string;
    mobile?: string;
    email?: string;
    status: string;
    active: boolean;
    openTasksCount?: number;
    readyToBillCount?: number;
    invoicesCount?: number;
    proformasCount?: number;
    outstandingAmount?: number;
  }[];
}

