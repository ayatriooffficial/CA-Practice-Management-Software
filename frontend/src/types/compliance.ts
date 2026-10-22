import type { Portal, FileRef } from './notices';

export type Frequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

export interface ComplianceCategory {
  id: string;
  name: string;
  order: number;
  mode: 'auto' | 'manual';
  portal?: Portal;
}

export interface ComplianceItem {
  id: string;
  clientId: string;
  categoryId: string;
  identifier?: string;
  state?: string;
  formCode: string;
  label: string;
  kind?: 'payment' | 'return' | 'certificate';
  frequency: Frequency;
  isCustom: boolean;
}

export interface ComplianceEntry {
  id: string;
  itemId: string;
  fy: string;
  periodKey: string;
  dueDate: string;
  filedOn?: string | null;
  statusOverride?: 'filed' | 'missed' | 'pending' | null;
  documents: FileRef[];
  source: 'portal' | 'manual';
  syncedAt?: string;
}

export interface SyncEntitlement {
  lastFreeSyncAt?: string;
  cooldownDays: number;
  plan: string;
}

export type ComplianceCellStatus = 'FILED' | 'MISSED' | 'PENDING' | 'BLANK';

export interface ComplianceGridRow {
  clientId: string;
  clientName: string;
  item: ComplianceItem;
  cells: Record<string, {
    status: ComplianceCellStatus;
    entry?: ComplianceEntry;
  }>;
}

export interface ComplianceGridColumn {
  key: string;
  label: string;
}

export interface GetComplianceGridParams {
  categoryId?: string;
  fy?: string;
  frequency?: Frequency | 'ALL';
  search?: string;
}

export interface ComplianceGridResponse {
  clients: { id: string; name: string }[];
  rows: ComplianceGridRow[];
  columns: ComplianceGridColumn[];
  entries: ComplianceEntry[];
}
