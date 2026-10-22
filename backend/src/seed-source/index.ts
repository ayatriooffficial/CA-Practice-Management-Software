import type {
  Client,
  Notice,
  SyncJob,
  ActivityLog,
} from './types/notices';
import type {
  ComplianceCategory,
  ComplianceItem,
  ComplianceEntry,
  SyncEntitlement,
} from './types/compliance';

import { createClientsSeed } from './clients';
import { createNoticesSeed } from './notices';
import {
  createComplianceCategoriesSeed,
  createComplianceItemsSeed,
  createComplianceEntriesSeed,
  createSyncEntitlementSeed,
  SEED_CREDITS,
} from './compliance';
import { daysAgoIso } from '../dates';

export interface SeedData {
  clients: Client[];
  notices: Notice[];
  categories: ComplianceCategory[];
  complianceItems: ComplianceItem[];
  complianceEntries: ComplianceEntry[];
  credits: number;
  syncEntitlement: SyncEntitlement;
  syncJobs: SyncJob[];
  activityLogs: ActivityLog[];
}

export function createSeedData(): SeedData {
  const clients = createClientsSeed();
  const notices = createNoticesSeed();
  const categories = createComplianceCategoriesSeed();
  const complianceItems = createComplianceItemsSeed(clients);
  const complianceEntries = createComplianceEntriesSeed(complianceItems);
  const syncEntitlement = createSyncEntitlementSeed();

  const syncJobs: SyncJob[] = [
    // Job 0: manual sync today – success
    {
      id: 'sync-job-0',
      startedAt: daysAgoIso(0),
      finishedAt: daysAgoIso(0),
      triggeredBy: 'Manual Sync',
      module: 'notices',
      portals: ['GST'],
      clientIds: ['client-trustgrid', 'client-regalheaven'],
      status: 'success',
      creditsUsed: 2,
      newItems: 3,
      results: [
        { clientId: 'client-trustgrid', portal: 'GST', ok: true, found: 2 },
        { clientId: 'client-regalheaven', portal: 'GST', ok: true, found: 1 },
      ],
    },
    // Job 1: scheduled – success
    {
      id: 'sync-job-1',
      startedAt: daysAgoIso(1),
      finishedAt: daysAgoIso(1),
      triggeredBy: 'Scheduled System Sync',
      module: 'notices',
      portals: ['GST', 'IT', 'TDS'],
      clientIds: ['client-karnataka-stores', 'client-miracle-coro'],
      status: 'success',
      creditsUsed: 3,
      newItems: 2,
      results: [
        { clientId: 'client-karnataka-stores', portal: 'GST', ok: true, found: 1 },
        { clientId: 'client-karnataka-stores', portal: 'TDS', ok: true, found: 1 },
        { clientId: 'client-miracle-coro', portal: 'GST', ok: true, found: 0 },
      ],
    },
    // Job 2: partial – one portal failed
    {
      id: 'sync-job-2',
      startedAt: daysAgoIso(3),
      finishedAt: daysAgoIso(3),
      triggeredBy: 'Manual Sync',
      module: 'notices',
      portals: ['GST', 'IT'],
      clientIds: ['client-karnataka-stores', 'client-aanya-hosp', 'client-mk-retail'],
      status: 'partial',
      creditsUsed: 4,
      newItems: 5,
      results: [
        { clientId: 'client-karnataka-stores', portal: 'GST', ok: true, found: 3 },
        { clientId: 'client-karnataka-stores', portal: 'IT', ok: false, found: 0, error: 'Session expired – re-enter portal credentials for TRACES' },
        { clientId: 'client-aanya-hosp', portal: 'GST', ok: true, found: 2 },
        { clientId: 'client-aanya-hosp', portal: 'IT', ok: true, found: 0 },
        { clientId: 'client-mk-retail', portal: 'GST', ok: true, found: 0 },
      ],
    },
    // Job 3: failed – all portals failed
    {
      id: 'sync-job-3',
      startedAt: daysAgoIso(5),
      finishedAt: daysAgoIso(5),
      triggeredBy: 'Scheduled System Sync',
      module: 'notices',
      portals: ['GST'],
      clientIds: ['client-evergreen', 'client-falcon'],
      status: 'failed',
      creditsUsed: 0,
      newItems: 0,
      results: [
        { clientId: 'client-evergreen', portal: 'GST', ok: false, found: 0, error: 'Portal login failed – check saved credentials for Evergreen Textiles' },
        { clientId: 'client-falcon', portal: 'GST', ok: false, found: 0, error: 'Portal login failed – check saved credentials for Falcon Couriers' },
      ],
    },
    // Job 4: success – compliance module
    {
      id: 'sync-job-4',
      startedAt: daysAgoIso(7),
      finishedAt: daysAgoIso(7),
      triggeredBy: 'Manual Sync',
      module: 'compliance',
      portals: ['GST', 'TDS'],
      clientIds: ['client-karnataka-stores', 'client-turia-ind'],
      status: 'success',
      creditsUsed: 3,
      newItems: 0,
      results: [
        { clientId: 'client-karnataka-stores', portal: 'GST', ok: true, found: 0 },
        { clientId: 'client-karnataka-stores', portal: 'TDS', ok: true, found: 0 },
        { clientId: 'client-turia-ind', portal: 'TDS', ok: true, found: 0 },
      ],
    },
    // Job 5: partial – TDS portal timeout
    {
      id: 'sync-job-5',
      startedAt: daysAgoIso(10),
      finishedAt: daysAgoIso(10),
      triggeredBy: 'Scheduled System Sync',
      module: 'notices',
      portals: ['GST', 'TDS'],
      clientIds: ['client-karnataka-stores', 'client-turia-ind', 'client-coastal-exp'],
      status: 'partial',
      creditsUsed: 4,
      newItems: 7,
      results: [
        { clientId: 'client-karnataka-stores', portal: 'GST', ok: true, found: 4 },
        { clientId: 'client-karnataka-stores', portal: 'TDS', ok: false, found: 0, error: 'Request timed out after 30s – TRACES portal is unresponsive' },
        { clientId: 'client-turia-ind', portal: 'TDS', ok: true, found: 3 },
        { clientId: 'client-coastal-exp', portal: 'GST', ok: true, found: 0 },
      ],
    },
    // Job 6: success
    {
      id: 'sync-job-6',
      startedAt: daysAgoIso(14),
      finishedAt: daysAgoIso(14),
      triggeredBy: 'Manual Sync',
      module: 'notices',
      portals: ['IT'],
      clientIds: ['client-karnataka-stores', 'client-mk-retail', 'client-apex-auto'],
      status: 'success',
      creditsUsed: 3,
      newItems: 1,
      results: [
        { clientId: 'client-karnataka-stores', portal: 'IT', ok: true, found: 1 },
        { clientId: 'client-mk-retail', portal: 'IT', ok: true, found: 0 },
        { clientId: 'client-apex-auto', portal: 'IT', ok: true, found: 0 },
      ],
    },
    // Job 7: failed – auth failure
    {
      id: 'sync-job-7',
      startedAt: daysAgoIso(18),
      finishedAt: daysAgoIso(18),
      triggeredBy: 'Scheduled System Sync',
      module: 'notices',
      portals: ['GST', 'IT', 'TDS'],
      clientIds: ['client-karnataka-stores'],
      status: 'failed',
      creditsUsed: 0,
      newItems: 0,
      results: [
        { clientId: 'client-karnataka-stores', portal: 'GST', ok: false, found: 0, error: 'OTP not received – GST portal 2FA failed for KARNATAKA STORES' },
        { clientId: 'client-karnataka-stores', portal: 'IT', ok: false, found: 0, error: 'OTP not received – IT portal 2FA failed for KARNATAKA STORES' },
        { clientId: 'client-karnataka-stores', portal: 'TDS', ok: false, found: 0, error: 'OTP not received – TRACES 2FA failed for KARNATAKA STORES' },
      ],
    },
    // Job 8: success – all portals
    {
      id: 'sync-job-8',
      startedAt: daysAgoIso(22),
      finishedAt: daysAgoIso(22),
      triggeredBy: 'Scheduled System Sync',
      module: 'notices',
      portals: ['GST', 'IT', 'TDS'],
      clientIds: ['client-karnataka-stores', 'client-miracle-coro', 'client-trustgrid', 'client-turia-ind'],
      status: 'success',
      creditsUsed: 6,
      newItems: 12,
      results: [
        { clientId: 'client-karnataka-stores', portal: 'GST', ok: true, found: 5 },
        { clientId: 'client-karnataka-stores', portal: 'TDS', ok: true, found: 3 },
        { clientId: 'client-karnataka-stores', portal: 'IT', ok: true, found: 2 },
        { clientId: 'client-miracle-coro', portal: 'GST', ok: true, found: 2 },
        { clientId: 'client-trustgrid', portal: 'GST', ok: true, found: 0 },
        { clientId: 'client-turia-ind', portal: 'TDS', ok: true, found: 0 },
        { clientId: 'client-turia-ind', portal: 'IT', ok: true, found: 0 },
      ],
    },
    // Job 9: partial – 30 days ago
    {
      id: 'sync-job-9',
      startedAt: daysAgoIso(29),
      finishedAt: daysAgoIso(29),
      triggeredBy: 'Manual Sync',
      module: 'notices',
      portals: ['GST'],
      clientIds: ['client-miracle-coro', 'client-regalheaven', 'client-coastal-exp', 'client-apex-auto'],
      status: 'partial',
      creditsUsed: 3,
      newItems: 4,
      results: [
        { clientId: 'client-miracle-coro', portal: 'GST', ok: true, found: 3 },
        { clientId: 'client-regalheaven', portal: 'GST', ok: true, found: 1 },
        { clientId: 'client-coastal-exp', portal: 'GST', ok: false, found: 0, error: 'Invalid GSTIN – portal rejected login for Coastal Exports' },
        { clientId: 'client-apex-auto', portal: 'GST', ok: true, found: 0 },
      ],
    },
  ];

  const activityLogs: ActivityLog[] = [
    {
      id: 'act-log-1',
      at: daysAgoIso(0),
      userId: 'user-dipak',
      clientId: 'client-karnataka-stores',
      noticeId: 'notice-gst-1',
      action: 'status_changed',
      from: 'new',
      to: 'response_preparing',
    },
    {
      id: 'act-log-2',
      at: daysAgoIso(1),
      userId: 'user-dipak',
      clientId: 'client-miracle-coro',
      noticeId: 'notice-gst-28',
      action: 'file_downloaded',
    },
    {
      id: 'act-log-3',
      at: daysAgoIso(1),
      userId: 'user-priya',
      clientId: 'client-karnataka-stores',
      noticeId: 'notice-gst-5',
      action: 'task_created',
    },
    {
      id: 'act-log-4',
      at: daysAgoIso(2),
      userId: 'user-dipak',
      clientId: 'client-trustgrid',
      noticeId: 'notice-gst-50',
      action: 'status_changed',
      from: 'response_preparing',
      to: 'response_filed',
    },
    {
      id: 'act-log-5',
      at: daysAgoIso(3),
      userId: 'user-priya',
      clientId: 'client-karnataka-stores',
      noticeId: 'notice-tds-83',
      action: 'note_added',
    },
    {
      id: 'act-log-6',
      at: daysAgoIso(5),
      userId: 'user-admin',
      clientId: 'client-turia-ind',
      noticeId: 'notice-it-116',
      action: 'status_changed',
      from: 'new',
      to: 'under_dept_review',
    },
    {
      id: 'act-log-7',
      at: daysAgoIso(7),
      userId: 'user-dipak',
      clientId: 'client-miracle-coro',
      noticeId: 'notice-gst-30',
      action: 'file_downloaded',
    },
    {
      id: 'act-log-8',
      at: daysAgoIso(10),
      userId: 'user-admin',
      clientId: 'client-karnataka-stores',
      noticeId: 'notice-gst-3',
      action: 'task_created',
    },
    {
      id: 'act-log-9',
      at: daysAgoIso(14),
      userId: 'user-priya',
      clientId: 'client-regalheaven',
      noticeId: 'notice-gst-83',
      action: 'status_changed',
      from: 'hearing_scheduled',
      to: 'appeal_filed',
    },
    {
      id: 'act-log-10',
      at: daysAgoIso(21),
      userId: 'user-dipak',
      clientId: 'client-karnataka-stores',
      noticeId: 'notice-gst-12',
      action: 'status_changed',
      from: 'under_dept_review',
      to: 'closed',
    },
  ];

  return {
    clients,
    notices,
    categories,
    complianceItems,
    complianceEntries,
    credits: SEED_CREDITS,
    syncEntitlement,
    syncJobs,
    activityLogs,
  };
}

export {
  createClientsSeed,
  createNoticesSeed,
  createComplianceCategoriesSeed,
  createComplianceItemsSeed,
  createComplianceEntriesSeed,
  createSyncEntitlementSeed,
};
