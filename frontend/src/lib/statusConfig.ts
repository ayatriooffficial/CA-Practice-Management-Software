import type { NoticeStatus } from '../types/notices';
import type { ComplianceCellStatus } from '../types/compliance';
import { isOverdue } from './dates';

export interface StatusMeta {
  label: string;
  colorToken: string;
  icon: string;
}

export const STATUS_CONFIG: Record<NoticeStatus, StatusMeta> = {
  new: {
    label: 'New',
    colorToken: '--status-new',
    icon: 'Sparkles',
  },
  response_preparing: {
    label: 'Response Preparing',
    colorToken: '--status-response-preparing',
    icon: 'Clock',
  },
  response_filed: {
    label: 'Response Filed',
    colorToken: '--status-response-filed',
    icon: 'CheckCircle',
  },
  under_dept_review: {
    label: 'Under Dept Review',
    colorToken: '--status-under-dept-review',
    icon: 'Eye',
  },
  hearing_scheduled: {
    label: 'Hearing Scheduled',
    colorToken: '--status-hearing-scheduled',
    icon: 'Calendar',
  },
  appeal_filed: {
    label: 'Appeal Filed',
    colorToken: '--status-appeal-filed',
    icon: 'FileText',
  },
  closed: {
    label: 'Closed',
    colorToken: '--status-closed',
    icon: 'Archive',
  },
  no_status: {
    label: 'No Status',
    colorToken: '--status-no-status',
    icon: 'MinusCircle',
  },
};

export const COMPLIANCE_STATUS_CONFIG: Record<
  Exclude<ComplianceCellStatus, 'BLANK'>,
  StatusMeta
> = {
  FILED: {
    label: 'Filed',
    colorToken: '--status-filed',
    icon: 'CheckCircle',
  },
  MISSED: {
    label: 'Missed',
    colorToken: '--status-missed',
    icon: 'AlertTriangle',
  },
  PENDING: {
    label: 'Pending',
    colorToken: '--status-pending',
    icon: 'Clock',
  },
};

export function getNoticeStatusConfig(status: NoticeStatus): StatusMeta {
  return STATUS_CONFIG[status] || STATUS_CONFIG.no_status;
}

export function isNoticeClosed(status: NoticeStatus): boolean {
  return status === 'response_filed' || status === 'appeal_filed' || status === 'closed';
}

export function getComplianceCellStatus(entry?: {
  filedOn?: string | null;
  dueDate?: string | null;
}): ComplianceCellStatus {
  if (!entry) return 'BLANK';
  if (entry.filedOn) return 'FILED';
  if (entry.dueDate && isOverdue(entry.dueDate)) return 'MISSED';
  return 'PENDING';
}
