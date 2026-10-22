import { Types } from 'mongoose';
import { ISoftDeleteDocument } from '../../shared/plugins/softDelete.plugin';

export type Portal = 'GST' | 'IT' | 'TDS';

export type NoticeStatus =
  | 'new'
  | 'response_preparing'
  | 'response_filed'
  | 'under_dept_review'
  | 'hearing_scheduled'
  | 'appeal_filed'
  | 'closed'
  | 'no_status';

export interface IFileRef {
  id: string;
  name: string;
  url: string;
  mime: string;
}

export interface INotice {
  clientId: Types.ObjectId;
  portal: Portal;
  noticeNumber: string;
  description?: string;
  files: IFileRef[];
  syncedAt: Date;
  // GST fields
  type?: 'Notice' | 'Appeal' | 'Order';
  noticeDate?: string;
  dueDate?: string | null;
  status?: NoticeStatus;
  taskId?: string | null;
  // TDS fields
  category?: string;
  period?: string;
  formType?: string;
  portalStatus?: string;
  manualStatus?: NoticeStatus;
  // IT fields
  periodAY?: string;
  issuedOn?: string;
  // Seed flag for safe reset
  isSeed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INoticeDocument extends INotice, ISoftDeleteDocument {}
