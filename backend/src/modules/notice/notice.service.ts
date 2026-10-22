import mongoose, { Types } from 'mongoose';
import { NoticeModel } from './notice.model';
import { Client } from '../client/client.model';
import { calculateOverdueDays, isNoticeClosed } from '../shared-nc/status.util';
import { NoticeStatus, Portal } from './notice.interface';
import { PaginationMeta } from '../../shared/utils/apiResponse';
import { NoticeQueryInput } from './notice.validation';
import { ActivityLogModel } from '../sync/sync.model';
import { AppError } from '../../shared/utils/apiError';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveNoticeStatus(notice: Record<string, unknown>): NoticeStatus | undefined {
  const portal = notice.portal as Portal;
  if (portal === 'GST') return notice.status as NoticeStatus | undefined;
  return notice.manualStatus as NoticeStatus | undefined;
}

function withoutMongoId<T extends Record<string, unknown>>(value: T): Omit<T, '_id'> & { id: string } {
  const { _id, ...rest } = value;
  return { ...rest, id: String(_id) };
}

// ---------------------------------------------------------------------------
// Summary: count per status for a given portal
// ---------------------------------------------------------------------------
export async function getNoticeSummary(portal?: Portal): Promise<Record<string, number>> {
  const match: Record<string, unknown> = { isDeleted: false };
  if (portal) match.portal = portal;

  const pipeline: mongoose.PipelineStage[] = [
    { $match: match },
    {
      $lookup: {
        from: 'clients',
        localField: 'clientId',
        foreignField: '_id',
        as: '_client',
      },
    },
    { $match: { '_client.isDeleted': false } },
    {
      $addFields: {
        _effectiveStatus: {
          $cond: {
            if: { $eq: ['$portal', 'GST'] },
            then: '$status',
            else: '$manualStatus',
          },
        },
      },
    },
    {
      $group: {
        _id: '$_effectiveStatus',
        count: { $sum: 1 },
      },
    },
  ];

  const results = await NoticeModel.aggregate(pipeline);
  const summary: Record<string, number> = {
    total: 0,
    new: 0,
    response_preparing: 0,
    response_filed: 0,
    under_dept_review: 0,
    hearing_scheduled: 0,
    appeal_filed: 0,
    closed: 0,
    no_status: 0,
  };

  let total = 0;
  for (const row of results) {
    const key = row._id ?? 'no_status';
    if (key in summary) {
      summary[key] = row.count;
    }
    total += row.count;
  }
  summary.total = total;
  return summary;
}

// ---------------------------------------------------------------------------
// Clients row list for the Clients tab
// ---------------------------------------------------------------------------
export async function getNoticeClientsRows(params: {
  portal?: Portal;
  search?: string;
  filter?: 'all' | 'notices' | 'issues';
}): Promise<{
  data: unknown[];
  counts: { all: number; notices: number; issues: number };
}> {
  const { portal, search, filter = 'all' } = params;

  // Build a notice count / overdue aggregation per client
  const noticeMatch: Record<string, unknown> = { isDeleted: false };
  if (portal) noticeMatch.portal = portal;

  const pipeline: mongoose.PipelineStage[] = [
    { $match: { isDeleted: false } },
    // Lookup notices
    {
      $lookup: {
        from: 'notices',
        let: { cid: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$$cid', '$clientId'] },
              isDeleted: false,
              ...(portal ? { portal } : {}),
            },
          },
        ],
        as: '_notices',
      },
    },
    // Lookup sync states
    {
      $lookup: {
        from: 'portalsyncstates',
        let: { cid: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$$cid', '$clientId'] },
              isDeleted: false,
            },
          },
        ],
        as: '_syncStates',
      },
    },
    {
      $addFields: {
        totalNotices: { $size: '$_notices' },
        overdueNotices: {
          $size: {
            $filter: {
              input: '$_notices',
              as: 'n',
              cond: {
                $and: [
                  { $ifNull: ['$$n.dueDate', false] },
                  { $lt: ['$$n.dueDate', new Date().toISOString().slice(0, 10)] },
                ],
              },
            },
          },
        },
      },
    },
  ];

  if (search) {
    const re = escapeRegex(search);
    pipeline.push({
      $match: {
        $or: [
          { name: { $regex: re, $options: 'i' } },
          { 'customerFiles.statutory.idNo': { $regex: re, $options: 'i' } },
        ],
      },
    });
  }

  const clients = await Client.aggregate(pipeline);

  const rows = clients.map((c) => {
    const syncStates: Record<string, unknown>[] = c._syncStates || [];
    const primaryState = syncStates[0];
    const syncStatus = primaryState?.status ?? 'never_synced';
    const errorMessage = primaryState?.errorMessage ?? '';
    const lastSyncAt = primaryState?.lastSyncAt ?? null;

    return {
      id: String(c._id),
      name: c.name,
      portals: c.customerFiles?.statutory
        ? [...new Set(
            (c.customerFiles.statutory as { type: string }[])
              .map((s) => {
                const t = s.type?.toLowerCase();
                if (t === 'gstin' || t === 'gst') return 'GST';
                if (t === 'tan') return 'TDS';
                if (t === 'pan') return 'IT';
                return null;
              })
              .filter(Boolean)
          )]
        : [],
      sync: { status: syncStatus as string, errorMessage: errorMessage as string, lastSyncAt },
      totalNotices: c.totalNotices,
      overdueNotices: c.overdueNotices,
    };
  });

  const all = rows.length;
  const notices = rows.filter((r) => (r.totalNotices as number) > 0).length;
  const issues = rows.filter((r) => {
    const s = (r.sync as { status: string }).status;
    return s === 'error' || s === 'never_synced';
  }).length;

  let filtered = rows;
  if (filter === 'notices') filtered = rows.filter((r) => (r.totalNotices as number) > 0);
  if (filter === 'issues') {
    filtered = rows.filter((r) => {
      const s = (r.sync as { status: string }).status;
      return s === 'error' || s === 'never_synced';
    });
  }

  return { data: filtered, counts: { all, notices, issues } };
}

// ---------------------------------------------------------------------------
// Notice list with optional groupBy=client
// ---------------------------------------------------------------------------
export async function getNotices(q: NoticeQueryInput): Promise<{
  data: unknown[];
  summary: Record<string, number>;
  pagination: PaginationMeta;
}> {
  const { portal, search, status, groupBy, sortBy, sortOrder, page, limit, clientId } = q;

  const match: Record<string, unknown> = { isDeleted: false };
  if (portal) match.portal = portal;
  if (status) {
    if (portal === 'GST') match.status = status;
    else if (portal === 'IT' || portal === 'TDS') match.manualStatus = status;
    else match.$or = [{ status }, { manualStatus: status }];
  }
  if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
    match.clientId = new Types.ObjectId(clientId);
  }

  const pipeline: mongoose.PipelineStage[] = [
    { $match: match },
    {
      $lookup: {
        from: 'clients',
        localField: 'clientId',
        foreignField: '_id',
        as: '_client',
      },
    },
    { $match: { '_client.isDeleted': false } },
    { $addFields: { _clientDoc: { $arrayElemAt: ['$_client', 0] } } },
  ];

  if (search) {
    const re = escapeRegex(search);
    pipeline.push({
      $match: {
        $or: [
          { noticeNumber: { $regex: re, $options: 'i' } },
          { description: { $regex: re, $options: 'i' } },
          { '_clientDoc.name': { $regex: re, $options: 'i' } },
        ],
      },
    });
  }

  // Count for pagination
  const countPipeline = [...pipeline, { $count: 'total' } as mongoose.PipelineStage];
  const countResult = await NoticeModel.aggregate(countPipeline);
  const totalDocs = countResult[0]?.total ?? 0;

  const sortDir = sortOrder === 'asc' ? 1 : -1;
  pipeline.push({ $sort: { [sortBy ?? 'syncedAt']: sortDir } });

  const skip = ((page ?? 1) - 1) * (limit ?? 50);
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit ?? 50 });

  pipeline.push({
    $project: {
      _client: 0,
      '_clientDoc.customerFiles': 0,
      '_clientDoc.isDeleted': 0,
    },
  });

  const notices = await NoticeModel.aggregate(pipeline);

  // Derive overdue days
  const todayStr = new Date().toISOString().slice(0, 10);
  const enriched: Record<string, unknown>[] = notices.map((raw) => {
    const n = raw as Record<string, any>;
    return {
      ...withoutMongoId(n),
      clientName: n._clientDoc?.name,
      overdueDays: calculateOverdueDays(n.dueDate, todayStr),
      isClosed: isNoticeClosed(resolveNoticeStatus(n)),
    };
  });

  const [summary, totalPages] = await Promise.all([
    getNoticeSummary(portal),
    Promise.resolve(Math.ceil(totalDocs / (limit ?? 50))),
  ]);

  const paginationMeta: PaginationMeta = {
    page: page ?? 1,
    limit: limit ?? 50,
    totalDocs,
    totalPages,
    hasNextPage: (page ?? 1) < totalPages,
    hasPrevPage: (page ?? 1) > 1,
  };

  if (groupBy === 'client') {
    const groups: Record<string, { client: unknown; notices: unknown[] }> = {};
    for (const n of enriched) {
      const cid = String(n.clientId);
      if (!groups[cid]) {
        groups[cid] = { client: { id: cid, name: n.clientName }, notices: [] };
      }

      groups[cid].notices.push(n);
    }
    return { data: Object.values(groups), summary, pagination: paginationMeta };
  }

  return { data: enriched, summary, pagination: paginationMeta };
}

export async function updateNoticeStatus(
  noticeId: string,
  status: NoticeStatus
): Promise<Record<string, unknown>> {
  if (!mongoose.Types.ObjectId.isValid(noticeId)) throw AppError.badRequest('Invalid noticeId');
  const notice = await NoticeModel.findOne({ _id: noticeId, isDeleted: false });
  if (!notice) throw AppError.notFound('Notice not found');
  const previousStatus = resolveNoticeStatus(notice.toObject() as unknown as Record<string, unknown>);
  if (notice.portal === 'GST') notice.status = status;
  else notice.manualStatus = status;
  await notice.save();
  await ActivityLogModel.create({
    at: new Date(),
    userId: 'user',
    action: 'status_changed',
    clientId: notice.clientId,
    noticeId: notice._id,
    from: previousStatus,
    to: status,
  });
  return withoutMongoId(notice.toObject() as unknown as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Calendar events
// ---------------------------------------------------------------------------
export async function getCalendarEvents(params: {
  month?: string;
  portal?: Portal;
  status?: string;
  by?: 'notice_date' | 'due_date';
}): Promise<unknown[]> {
  const { month, portal, status, by = 'due_date' } = params;

  const match: Record<string, unknown> = { isDeleted: false };
  if (portal) match.portal = portal;
  if (status) {
    if (portal === 'GST') match.status = status;
    else match.manualStatus = status;
  }

  // Filter by month using dueDate or noticeDate
  if (month) {
    const start = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${month}-${String(lastDay).padStart(2, '0')}`;
    const dateField = by === 'notice_date' ? 'noticeDate' : 'dueDate';
    match[dateField] = { $gte: start, $lte: end };
  }

  const pipeline: mongoose.PipelineStage[] = [
    { $match: match },
    {
      $lookup: {
        from: 'clients',
        localField: 'clientId',
        foreignField: '_id',
        as: '_client',
      },
    },
    { $match: { '_client.isDeleted': false } },
    { $addFields: { clientName: { $arrayElemAt: ['$_client.name', 0] } } },
    { $project: { _client: 0 } },
  ];

  const notices = await NoticeModel.aggregate(pipeline);
  return notices.map((n) => ({
    id: String(n._id),
    date: (by === 'notice_date' ? n.noticeDate : n.dueDate) ?? n.noticeDate ?? n.dueDate ?? n.issuedOn,
    title: n.noticeNumber ?? n.description ?? 'Notice',
    clientId: String(n.clientId),
    clientName: n.clientName,
    portal: n.portal,
    noticeNumber: n.noticeNumber,
    dueDate: n.dueDate ?? null,
    noticeDate: n.noticeDate ?? null,
    issuedOn: n.issuedOn ?? null,
    status: resolveNoticeStatus(n),
    description: n.description,
  }));
}

// ---------------------------------------------------------------------------
// Credits from PracticeSetting
// ---------------------------------------------------------------------------
export async function getCredits(): Promise<{ credits: number; plan: string; lastFreeSyncAt: unknown; cooldownDays: number }> {
  const { PracticeSettingModel } = await import('../sync/sync.model');
  const setting = await PracticeSettingModel.findOne({ isDeleted: false });
  if (!setting) return { credits: 13841, plan: 'PRO', lastFreeSyncAt: null, cooldownDays: 14 };
  return {
    credits: setting.credits,
    plan: setting.plan,
    lastFreeSyncAt: setting.lastFreeSyncAt ?? null,
    cooldownDays: setting.cooldownDays,
  };
}
