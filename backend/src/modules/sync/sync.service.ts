import mongoose, { Types } from 'mongoose';
import {
  SyncJobModel,
  ActivityLogModel,
  PortalSyncStateModel,
  PracticeSettingModel,
  ISyncJob,
} from './sync.model';
import { Client } from '../client/client.model';
import { SimulatedConnector } from '../shared-nc/connector';
import { Portal } from '../notice/notice.interface';
import { PaginationMeta } from '../../shared/utils/apiResponse';
import { AppError } from '../../shared/utils/apiError';
import {
  SyncClientsInput,
  SyncJobQueryInput,
  ActivityQueryInput,
} from './sync.validation';

function serialize<T extends Record<string, unknown>>(value: T): Omit<T, '_id'> & { id: string } {
  const { _id, ...rest } = value;
  return { ...rest, id: String(_id) };
}

// ---------------------------------------------------------------------------
// Credits / Entitlement
// ---------------------------------------------------------------------------
export async function getSyncEntitlement(): Promise<{
  credits: number;
  plan: string;
  lastFreeSyncAt: unknown;
  cooldownDays: number;
}> {
  const setting = await PracticeSettingModel.findOne({ isDeleted: false });
  if (!setting) return { credits: 13841, plan: 'PRO', lastFreeSyncAt: null, cooldownDays: 14 };
  return {
    credits: setting.credits,
    plan: setting.plan,
    lastFreeSyncAt: setting.lastFreeSyncAt ?? null,
    cooldownDays: setting.cooldownDays,
  };
}

// ---------------------------------------------------------------------------
// Run a sync (simulated)
// ---------------------------------------------------------------------------
export async function runSync(input: SyncClientsInput): Promise<ISyncJob> {
  const { clientIds, portals, module: mod, triggeredBy, isFreeSync } = input;

  // Validate free-sync cooldown
  const setting = await PracticeSettingModel.findOne({ isDeleted: false });
  if (isFreeSync && setting) {
    const cooldownMs = setting.cooldownDays * 24 * 60 * 60 * 1000;
    const last = setting.lastFreeSyncAt ? new Date(setting.lastFreeSyncAt).getTime() : 0;
    if (last && Date.now() - last < cooldownMs) {
      const daysLeft = Math.ceil((cooldownMs - (Date.now() - last)) / (1000 * 60 * 60 * 24));
      throw AppError.badRequest(`Free sync cooldown: ${daysLeft} day(s) remaining`);
    }
  }

  // Count eligible clients (client x portal)
  const eligiblePairs: { clientId: Types.ObjectId; portal: Portal }[] = [];
  for (const id of clientIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw AppError.badRequest(`Invalid clientId: ${id}`);
    const client = await Client.findOne({ _id: id, isDeleted: false }).lean();
    if (!client) continue;
    for (const portal of portals) {
      const statutory = client.customerFiles?.statutory ?? [];
      const hasIdentifier = statutory.some((s) => {
        const t = s.type?.toLowerCase();
        return (portal === 'GST' && (t === 'gstin' || t === 'gst')) ||
          (portal === 'TDS' && t === 'tan') || (portal === 'IT' && t === 'pan');
      });
      if (hasIdentifier) eligiblePairs.push({ clientId: new Types.ObjectId(id), portal });
    }
  }
  const eligible = eligiblePairs.length;

  // Deduct credits (1.0 per eligible pair) unless free sync
  if (!isFreeSync && setting && setting.credits < eligible) {
    throw AppError.badRequest(`Insufficient credits: need ${eligible}, have ${setting.credits}`);
  } else if (isFreeSync && setting) {
    setting.lastFreeSyncAt = new Date();
    await setting.save();
  }

  // Create the SyncJob
  const objectIds = [...new Set(eligiblePairs.map((pair) => String(pair.clientId)))].map((id) => new Types.ObjectId(id));

  const job = await SyncJobModel.create({
    startedAt: new Date(),
    triggeredBy: triggeredBy ?? 'user',
    module: mod,
    portals,
    clientIds: objectIds,
    status: 'running',
    creditsUsed: isFreeSync ? 0 : eligible,
    newItems: 0,
    results: [],
    isSeed: false,
  });

  // Simulate async fetch (immediately resolve in simulated mode)
  const results: ISyncJob['results'] = [];
  let newItems = 0;

  for (const clientId of objectIds) {
    const clientDoc = await Client.findOne({ _id: clientId, isDeleted: false });
    if (!clientDoc) {
      for (const portal of portals) {
        results.push({ clientId, portal, ok: false, found: 0, error: 'Client not found' });
      }
      continue;
    }

    const clientPortals = eligiblePairs
      .filter((pair) => String(pair.clientId) === String(clientId))
      .map((pair) => pair.portal);
    for (const portal of clientPortals) {
      const connector = new SimulatedConnector(portal);
      const statutory = clientDoc.customerFiles?.statutory ?? [];
      const identifierEntry = statutory.find((s) => {
        const t = s.type?.toLowerCase();
        return (
          (portal === 'GST' && (t === 'gstin' || t === 'gst')) ||
          (portal === 'TDS' && t === 'tan') ||
          (portal === 'IT' && t === 'pan')
        );
      });
      const identifier = identifierEntry?.idNo ?? clientDoc.pan ?? '';
      const creds = { portal, identifier, userId: identifierEntry?.userId ?? 'system' };

      try {
        const fetchResult = await connector.fetchNotices(creds);
        results.push({ clientId, portal, ok: fetchResult.ok, found: fetchResult.items.length });
        newItems += fetchResult.items.length;

        // Update PortalSyncState (upsert)
        await PortalSyncStateModel.findOneAndUpdate(
          { clientId, portal, isDeleted: false },
          {
            $set: {
              status: fetchResult.ok ? 'ready' : 'error',
              lastSyncAt: new Date(),
              errorMessage: '',
              hasCredentials: !!identifierEntry?.userId,
            },
          },
          { upsert: true, new: true }
        );
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ clientId, portal, ok: false, found: 0, error: errMsg });
        await PortalSyncStateModel.findOneAndUpdate(
          { clientId, portal, isDeleted: false },
          {
            $set: { status: 'error', errorMessage: errMsg, lastSyncAt: new Date() },
          },
          { upsert: true, new: true }
        );
      }
    }
  }

  const hasFailures = results.some((r) => !r.ok);
  const allFailed = results.every((r) => !r.ok);
  const finalStatus = allFailed ? 'failed' : hasFailures ? 'partial' : 'success';
  const successfulPortals = isFreeSync ? 0 : results.filter((result) => result.ok).length;
  if (!isFreeSync && setting) {
    setting.credits -= successfulPortals;
    await setting.save();
  }

  job.results = results as any;
  job.newItems = newItems;
  job.creditsUsed = successfulPortals;
  job.status = finalStatus;
  job.finishedAt = new Date();
  await job.save();

  return job;
}

// ---------------------------------------------------------------------------
// Sync jobs list
// ---------------------------------------------------------------------------
export async function getSyncJobs(q: SyncJobQueryInput): Promise<{
  data: unknown[];
  pagination: PaginationMeta;
}> {
  const { module: mod, status, page = 1, limit = 20 } = q;

  const match: Record<string, unknown> = { isDeleted: false };
  if (mod) match.module = mod;
  if (status) match.status = status;

  const totalDocs = await SyncJobModel.countDocuments(match);
  const jobs = await SyncJobModel.find(match)
    .sort({ startedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const totalPages = Math.ceil(totalDocs / limit);
  return {
    data: jobs.map((job) => serialize(job as unknown as Record<string, unknown>)),
    pagination: {
      page,
      limit,
      totalDocs,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

// ---------------------------------------------------------------------------
// Activity logs
// ---------------------------------------------------------------------------
export async function getActivityLogs(q: ActivityQueryInput): Promise<{
  data: unknown[];
  pagination: PaginationMeta;
}> {
  const { clientId, noticeId, action, page = 1, limit = 20 } = q;

  const match: Record<string, unknown> = { isDeleted: false };
  if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
    match.clientId = new Types.ObjectId(clientId);
  }
  if (noticeId && mongoose.Types.ObjectId.isValid(noticeId)) {
    match.noticeId = new Types.ObjectId(noticeId);
  }
  if (action) match.action = action;

  const totalDocs = await ActivityLogModel.countDocuments(match);
  const logs = await ActivityLogModel.find(match)
    .sort({ at: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const totalPages = Math.ceil(totalDocs / limit);
  return {
    data: logs.map((log) => serialize(log as unknown as Record<string, unknown>)),
    pagination: {
      page,
      limit,
      totalDocs,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export async function getSyncSummary() {
  const [success, partial, failed, running] = await Promise.all(
    (['success', 'partial', 'failed', 'running'] as const).map((status) =>
      SyncJobModel.countDocuments({ isDeleted: false, status })
    )
  );
  return { success, partial, failed, running };
}

export async function getSyncEligibility() {
  const clients = await Client.find({ isDeleted: false }).lean();
  const eligibility = { GST: 0, IT: 0, TDS: 0 };
  for (const client of clients) {
    for (const entry of client.customerFiles?.statutory ?? []) {
      const type = entry.type?.toLowerCase();
      if (type === 'gstin' || type === 'gst') eligibility.GST += 1;
      if (type === 'pan') eligibility.IT += 1;
      if (type === 'tan') eligibility.TDS += 1;
    }
  }
  return eligibility;
}
