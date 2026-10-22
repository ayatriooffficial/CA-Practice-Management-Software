import mongoose, { Types } from 'mongoose';
import {
  ComplianceCategoryModel,
  ComplianceItemModel,
  ComplianceEntryModel,
  Frequency,
  IComplianceEntryDocument,
} from './compliance.model';
import { Client } from '../client/client.model';
import { deriveEntryStatus, getTodayDateString } from '../shared-nc/status.util';
import { AppError } from '../../shared/utils/apiError';
import {
  ComplianceGridQueryInput,
  ComplianceEntryUpsertInput,
  ComplianceItemRefreshInput,
} from './compliance.validation';
import { KNOWN_COMPLIANCE_CATEGORIES } from '../shared-nc/service-map';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function getCategories() {
  const cats = await ComplianceCategoryModel.find({ isDeleted: false }).sort({ order: 1 }).lean();
  return cats.map((cat) => {
    const { _id, ...rest } = cat;
    return { ...rest, id: cat.categoryId };
  });
}

function normalizeFy(fy?: string): string {
  const match = (fy ?? '2025-2026').match(/(\d{4})-(?:\d{2}|\d{4})/);
  if (!match) return '2025-26';
  return `${match[1]}-${String(Number(match[1]) + 1).slice(-2)}`;
}

// ---------------------------------------------------------------------------
// Compliance Grid
// ---------------------------------------------------------------------------
export async function getComplianceGrid(q: ComplianceGridQueryInput) {
  const { categoryId, fy, frequency, search } = q;

  // Resolve category gracefully (supports slug, portal, name, or default)
  let resolvedCatId = categoryId;
  let category = null;

  if (categoryId) {
    const clean = categoryId.trim();
    category = await ComplianceCategoryModel.findOne({
      isDeleted: false,
      $or: [
        { categoryId: clean },
        { categoryId: clean.toLowerCase() },
        { categoryId: `cat-${clean.toLowerCase()}` },
        { name: new RegExp(`^${escapeRegex(clean)}$`, 'i') },
        { portal: clean.toUpperCase() },
      ],
    }).lean();
    if (category) {
      resolvedCatId = category.categoryId;
    }
  } else {
    category = await ComplianceCategoryModel.findOne({
      isDeleted: false,
      categoryId: 'cat-gst',
    }).lean();
    if (category) resolvedCatId = category.categoryId;
  }

  // Build items query
  const itemMatch: Record<string, unknown> = { isDeleted: false };
  if (resolvedCatId) itemMatch.categoryId = resolvedCatId;
  if (frequency && frequency !== 'all') itemMatch.frequency = frequency;

  const items = await ComplianceItemModel.find(itemMatch).lean();

  if (items.length === 0) {
    return { clients: [], rows: [], columns: generateColumns(fy ?? 'FY 2025-2026', frequency ?? 'all'), entries: [] };
  }

  const itemIds = items.map((i) => i._id);

  // Fetch entries for those items with robust FY matching
  const normFy = normalizeFy(fy);
  const possibleFys = [
    normFy,
    fy,
    normFy.startsWith('FY ') ? normFy : `FY ${normFy}`,
    fy?.startsWith('FY ') ? fy : `FY ${fy}`,
    normFy.length === 7 ? `${normFy.slice(0, 4)}-20${normFy.slice(5)}` : normFy,
  ].filter(Boolean) as string[];

  const entriesRaw = await ComplianceEntryModel.find({
    itemId: { $in: itemIds },
    fy: { $in: [...new Set(possibleFys)] },
    isDeleted: false,
  }).lean();

  // Build entry map: itemId -> periodKey -> entry
  const entryMap = new Map<string, Map<string, IComplianceEntryDocument>>();
  for (const e of entriesRaw) {
    const iid = String(e.itemId);
    if (!entryMap.has(iid)) entryMap.set(iid, new Map());
    entryMap.get(iid)!.set(e.periodKey, e as unknown as IComplianceEntryDocument);
  }

  // Fetch clients
  const clientIds = [...new Set(items.map((i) => String(i.clientId)))];
  const clientQuery: Record<string, unknown> = {
    _id: { $in: clientIds.map((id) => new Types.ObjectId(id)) },
    isDeleted: false,
  };

  if (search) {
    const re = escapeRegex(search);
    clientQuery.$or = [
      { name: { $regex: re, $options: 'i' } },
      { 'customerFiles.statutory.idNo': { $regex: re, $options: 'i' } },
    ];
  }

  const clients = await Client.find(clientQuery).lean();
  const clientMap = new Map(clients.map((c) => [String(c._id), c]));

  const columns = generateColumns(fy ?? 'FY 2025-2026', frequency ?? 'all');
  const today = getTodayDateString();
  const catMode = category?.mode ?? 'manual';

  // Group items by client
  const rows: unknown[] = [];
  const clientSet = new Set<string>();
  const itemsByClient = new Map<string, typeof items>();
  for (const item of items) {
    const cid = String(item.clientId);
    if (!clientMap.has(cid)) continue; // filtered out by search or deleted
    clientSet.add(cid);
    if (!itemsByClient.has(cid)) itemsByClient.set(cid, []);
    itemsByClient.get(cid)!.push(item);
  }

  for (const [cid, clientItems] of itemsByClient) {
    const client = clientMap.get(cid);
    if (!client) continue;

    for (const item of clientItems) {
      const iid = String(item._id);
      const cells: Record<string, unknown> = {};
      for (const col of columns) {
        const entry = entryMap.get(iid)?.get(col.key);
        if (entry) {
          const status = deriveEntryStatus({
            dueDate: entry.dueDate,
            filedOn: entry.filedOn ?? null,
            statusOverride: entry.statusOverride ?? null,
            categoryMode: catMode,
            referenceDateStr: today,
          });
          cells[col.key] = {
            entryId: String(entry._id),
            status,
            filedOn: entry.filedOn ?? null,
            documents: entry.documents ?? [],
            dueDate: entry.dueDate,
          };
        } else {
          cells[col.key] = null;
        }
      }

      let clientIdentifier = item.identifier;
      const clientAny = client as any;
      if (!clientIdentifier && clientAny.customerFiles?.statutory) {
        const statutory = clientAny.customerFiles.statutory as Array<{ type?: string; idNo?: string }>;
        const panEntry = statutory.find((s) => s.type?.toUpperCase() === 'PAN');
        const gstinEntry = statutory.find((s) => s.type?.toUpperCase() === 'GSTIN');
        const tanEntry = statutory.find((s) => s.type?.toUpperCase() === 'TAN');
        if (category?.portal === 'IT' || item.categoryId === 'cat-it') {
          clientIdentifier = panEntry?.idNo || gstinEntry?.idNo;
        } else if (category?.portal === 'GST' || item.categoryId === 'cat-gst') {
          clientIdentifier = gstinEntry?.idNo || panEntry?.idNo;
        } else if (category?.portal === 'TDS' || item.categoryId === 'cat-tds') {
          clientIdentifier = tanEntry?.idNo || panEntry?.idNo;
        } else {
          clientIdentifier = panEntry?.idNo || gstinEntry?.idNo || tanEntry?.idNo;
        }
      }
      const clientState = item.state || clientAny.address?.state || clientAny.state || 'Karnataka';

      rows.push({
        clientId: cid,
        clientName: client.name,
        item: {
          id: iid,
          clientId: cid,
          categoryId: item.categoryId,
          identifier: clientIdentifier,
          state: clientState,
          formCode: item.formCode,
          label: item.label,
          kind: item.kind ?? null,
          frequency: item.frequency,
          isCustom: item.isCustom,
        },
        cells,
      });
    }
  }

  return {
    clients: [...clientSet].map((cid) => {
      const c = clientMap.get(cid)!;
      return { id: cid, name: c.name };
    }),
    rows,
    columns,
    entries: entriesRaw.map((e) => {
      const { _id, ...rest } = e;
      return { ...rest, id: String(_id) };
    }),
  };
}

export async function getComplianceCalendar(month?: string) {
  const start = month ? `${month}-01` : `${new Date().toISOString().slice(0, 7)}-01`;
  const [year, monthNumber] = start.split('-').map(Number);
  const end = `${year}-${String(monthNumber).padStart(2, '0')}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`;
  const entries = await ComplianceEntryModel.find({
    dueDate: { $gte: start, $lte: end },
    isDeleted: false,
  }).lean();
  if (!entries.length) return [];
  const itemIds = entries.map((entry) => entry.itemId);
  const [items, clients, categories] = await Promise.all([
    ComplianceItemModel.find({ _id: { $in: itemIds }, isDeleted: false }).lean(),
    Client.find({ isDeleted: false }).lean(),
    ComplianceCategoryModel.find({ isDeleted: false }).lean(),
  ]);
  const itemMap = new Map(items.map((item) => [String(item._id), item]));
  const clientMap = new Map(clients.map((client) => [String(client._id), client]));
  const categoryMap = new Map(categories.map((category) => [category.categoryId, category]));
  const today = getTodayDateString();
  return entries.flatMap((entry) => {
    const item = itemMap.get(String(entry.itemId));
    if (!item) return [];
    const client = clientMap.get(String(item.clientId));
    if (!client) return [];
    const category = categoryMap.get(item.categoryId);
    const status = deriveEntryStatus({
      dueDate: entry.dueDate,
      filedOn: entry.filedOn ?? null,
      statusOverride: entry.statusOverride ?? null,
      categoryMode: category?.mode ?? 'manual',
      referenceDateStr: today,
    });
    return [{
      id: String(entry._id),
      date: entry.dueDate,
      title: `${category?.name ?? 'Compliance'} - ${item.label}`,
      portal: category?.portal ?? 'GST',
      clientId: String(client._id),
      clientName: client.name,
      noticeId: String(entry._id),
      status: 'new',
      complianceStatus: status.toUpperCase(),
      type: 'due_date',
    }];
  });
}

function generateColumns(
  _fy: string,
  frequency: string
): { key: string; label: string; frequency: Frequency }[] {
  const cols: { key: string; label: string; frequency: Frequency }[] = [];

  if (frequency === 'all' || frequency === 'monthly') {
    // Apr to Mar
    const months = [
      { m: 4, label: 'Apr' },
      { m: 5, label: 'May' },
      { m: 6, label: 'Jun' },
      { m: 7, label: 'Jul' },
      { m: 8, label: 'Aug' },
      { m: 9, label: 'Sep' },
      { m: 10, label: 'Oct' },
      { m: 11, label: 'Nov' },
      { m: 12, label: 'Dec' },
      { m: 1, label: 'Jan' },
      { m: 2, label: 'Feb' },
      { m: 3, label: 'Mar' },
    ];
    for (const { m, label } of months) {
      const key = `M${String(m).padStart(2, '0')}`;
      cols.push({ key, label, frequency: 'monthly' });
    }
  }

  if (frequency === 'all' || frequency === 'quarterly') {
    cols.push({ key: 'Q1', label: 'Q1 (Apr-Jun)', frequency: 'quarterly' });
    cols.push({ key: 'Q2', label: 'Q2 (Jul-Sep)', frequency: 'quarterly' });
    cols.push({ key: 'Q3', label: 'Q3 (Oct-Dec)', frequency: 'quarterly' });
    cols.push({ key: 'Q4', label: 'Q4 (Jan-Mar)', frequency: 'quarterly' });
  }

  if (frequency === 'all' || frequency === 'half_yearly') {
    cols.push({ key: 'H1', label: 'H1 (Apr-Sep)', frequency: 'half_yearly' });
    cols.push({ key: 'H2', label: 'H2 (Oct-Mar)', frequency: 'half_yearly' });
  }

  if (frequency === 'all' || frequency === 'yearly') {
    cols.push({ key: 'ANNUAL', label: 'Annual', frequency: 'yearly' });
  }

  return cols;
}

// ---------------------------------------------------------------------------
// PUT entry (manual categories only)
// ---------------------------------------------------------------------------
export async function upsertComplianceEntry(input: ComplianceEntryUpsertInput) {
  const { itemId, fy, periodKey, dueDate, filedOn, statusOverride, documents, source } = input;

  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw AppError.badRequest('Invalid itemId');
  }

  const item = await ComplianceItemModel.findOne({
    _id: new Types.ObjectId(itemId),
    isDeleted: false,
  }).lean();
  if (!item) throw AppError.notFound('ComplianceItem not found');

  // Verify the category is manual
  const cat = await ComplianceCategoryModel.findOne({ categoryId: item.categoryId, isDeleted: false }).lean();
  if (!cat || cat.mode !== 'manual') {
    throw AppError.badRequest('Only manual category entries can be updated via this endpoint');
  }

  const existing = await ComplianceEntryModel.findOne({
    itemId: new Types.ObjectId(itemId),
    fy,
    periodKey,
    isDeleted: false,
  });

  if (existing) {
    if (filedOn !== undefined) existing.filedOn = filedOn ?? null;
    if (statusOverride !== undefined) existing.statusOverride = statusOverride ?? null;
    if (documents !== undefined) existing.documents = documents as any;
    existing.dueDate = dueDate;
    existing.source = (source ?? 'manual') as 'portal' | 'manual';
    await existing.save();
    return existing;
  }

  const entry = await ComplianceEntryModel.create({
    itemId: new Types.ObjectId(itemId),
    fy,
    periodKey,
    dueDate,
    filedOn: filedOn ?? null,
    statusOverride: statusOverride ?? null,
    documents: documents ?? [],
    source: source ?? 'manual',
    isSeed: false,
  });
  return entry;
}

// ---------------------------------------------------------------------------
// POST /compliance/items/refresh - idempotent
// ---------------------------------------------------------------------------
export async function refreshComplianceItems(input: ComplianceItemRefreshInput) {
  // Retire (soft-delete) items whose categoryId no longer exists in KNOWN_COMPLIANCE_CATEGORIES
  const knownCategoryIds = new Set(KNOWN_COMPLIANCE_CATEGORIES.map((c) => c.id));

  const orphanedMatch: Record<string, unknown> = {
    isDeleted: false,
    categoryId: { $nin: Array.from(knownCategoryIds) },
  };
  if (input.clientId && mongoose.Types.ObjectId.isValid(input.clientId)) {
    orphanedMatch.clientId = new Types.ObjectId(input.clientId);
  }

  const orphaned = await ComplianceItemModel.find(orphanedMatch);
  let retired = 0;
  for (const item of orphaned) {
    await item.softDelete('system');
    retired++;
  }

  return { retired, message: `Retired ${retired} orphaned compliance item(s)` };
}
