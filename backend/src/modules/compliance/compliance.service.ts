import mongoose, { Types } from 'mongoose';
import {
  ComplianceCategoryModel,
  ComplianceItemModel,
  ComplianceEntryModel,
  Frequency,
  IComplianceEntryDocument,
} from './compliance.model';
import { Client } from '../client/client.model';
import { Service } from '../service/service.model';
import { ServiceService } from '../service/service.service';
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
  const { category, categoryId, fy, frequency, search } = q;
  const rawCat = category || categoryId;

  // Resolve category gracefully (supports slug, portal, name, or default)
  let resolvedCatId = rawCat;
  let catDoc = null;

  if (rawCat) {
    const clean = rawCat.trim();
    resolvedCatId = await ServiceService.resolveComplianceCategoryId(clean, '');
    catDoc = await ComplianceCategoryModel.findOne({
      isDeleted: false,
      $or: [
        { categoryId: resolvedCatId },
        { categoryId: clean },
        { categoryId: clean.toLowerCase() },
        { categoryId: `cat-${clean.toLowerCase()}` },
        { name: new RegExp(`^${escapeRegex(clean)}$`, 'i') },
        { portal: clean.toUpperCase() },
      ],
    }).lean();
    if (catDoc) {
      resolvedCatId = catDoc.categoryId;
    }
  } else {
    resolvedCatId = 'cat-gst';
    catDoc = await ComplianceCategoryModel.findOne({
      isDeleted: false,
      categoryId: 'cat-gst',
    }).lean();
  }

  // Fetch non-deleted clients
  const clientQuery: Record<string, unknown> = {
    isDeleted: false,
  };

  if (search) {
    const re = escapeRegex(search);
    clientQuery.$or = [
      { name: { $regex: re, $options: 'i' } },
      { 'customerFiles.statutory.idNo': { $regex: re, $options: 'i' } },
      { pan: { $regex: re, $options: 'i' } },
      { fileNo: { $regex: re, $options: 'i' } },
    ];
  }

  const clients = await Client.find(clientQuery).lean();

  if (clients.length === 0) {
    return { clients: [], rows: [], columns: generateColumns(fy ?? 'FY 2025-2026', frequency ?? 'all'), entries: [] };
  }

  // Pre-load all catalog services to look up categories and frequencies
  const catalogServices = await Service.find({ isDeleted: false }).lean();
  const catalogMap = new Map<string, any>();
  for (const s of catalogServices) {
    if (s._id) catalogMap.set(String(s._id), s);
    if (s.name) catalogMap.set(s.name.trim().toLowerCase(), s);
    if ((s as any).serviceId) catalogMap.set(String((s as any).serviceId), s);
  }

  // Map active recurring compliance services per client
  interface ClientActiveService {
    serviceName: string;
    category: string;
    frequency: Frequency;
    formCode: string;
    isCustom?: boolean;
    serviceId?: string;
  }

  const activeServicesByClient = new Map<string, ClientActiveService[]>();
  const activeFrequencies = new Set<Frequency>();

  for (const client of clients) {
    const cid = String(client._id);
    const seenServiceNames = new Set<string>();
    const clientActiveList: ClientActiveService[] = [];

    // Check client.serviceSettings - Only services explicitly enabled with compliance are included
    const settings = (client.serviceSettings || []) as any[];
    for (const s of settings) {
      const isEnabled = Boolean(s.isActive !== undefined ? s.isActive : s.compliance);
      if (!isEnabled) continue;

      const sName = (s.serviceName || '').trim();
      if (!sName || seenServiceNames.has(sName.toLowerCase())) continue;
      seenServiceNames.add(sName.toLowerCase());

      const dbS = (s.serviceId && catalogMap.get(s.serviceId)) || catalogMap.get(sName.toLowerCase());
      const rawCategory = s.category || dbS?.category;
      const serviceCategory = await ServiceService.resolveComplianceCategoryId(rawCategory, sName);

      if (resolvedCatId && serviceCategory !== resolvedCatId) {
        continue;
      }

      const serviceFreq = ServiceService.resolveComplianceFrequency(s.frequency || dbS?.frequency);
      if (frequency && frequency !== 'all' && serviceFreq !== frequency) {
        continue;
      }

      const formCode = ServiceService.resolveComplianceFormCode(dbS || { name: sName, code: s.serviceId });

      clientActiveList.push({
        serviceName: sName,
        category: serviceCategory,
        frequency: serviceFreq,
        formCode,
        isCustom: Boolean(s.isCustom || !dbS),
        serviceId: s.serviceId || (dbS?._id ? String(dbS._id) : undefined),
      });
      activeFrequencies.add(serviceFreq);
    }

    if (clientActiveList.length > 0) {
      activeServicesByClient.set(cid, clientActiveList);
    }
  }

  // If no active services mapped, return empty rows
  if (activeServicesByClient.size === 0) {
    return {
      clients: [],
      rows: [],
      columns: generateColumns(fy ?? 'FY 2025-2026', frequency ?? 'all'),
      entries: [],
    };
  }

  // Generate dynamic period columns based on active services' frequencies
  const columns = generateDynamicColumns(fy ?? 'FY 2025-2026', activeFrequencies, frequency ?? 'all');
  const today = getTodayDateString();
  const catMode = catDoc?.mode ?? 'manual';

  // Load existing ComplianceItem records for matched clients
  const matchedClientObjectIds = Array.from(activeServicesByClient.keys()).map((id) => new Types.ObjectId(id));
  const existingItems = await ComplianceItemModel.find({
    clientId: { $in: matchedClientObjectIds },
    isDeleted: false,
  }).lean();

  const itemMap = new Map<string, any>();
  for (const it of existingItems) {
    itemMap.set(`${it.clientId}__${(it.formCode || '').toLowerCase()}`, it);
    itemMap.set(`${it.clientId}__${(it.label || '').toLowerCase()}`, it);
  }

  // Fetch entries for those items
  const itemIds = existingItems.map((i) => i._id);
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

  const entryMap = new Map<string, Map<string, IComplianceEntryDocument>>();
  for (const e of entriesRaw) {
    const iid = String(e.itemId);
    if (!entryMap.has(iid)) entryMap.set(iid, new Map());
    entryMap.get(iid)!.set(e.periodKey, e as unknown as IComplianceEntryDocument);
  }

  const clientMap = new Map(clients.map((c) => [String(c._id), c]));
  const rows: unknown[] = [];
  const clientSet = new Set<string>();

  for (const [cid, serviceList] of activeServicesByClient) {
    const client = clientMap.get(cid);
    if (!client) continue;
    clientSet.add(cid);

    const clientAny = client as any;
    let clientIdentifier = '';
    if (clientAny.customerFiles?.statutory) {
      const statutory = clientAny.customerFiles.statutory as Array<{ type?: string; idNo?: string }>;
      const panEntry = statutory.find((s) => s.type?.toUpperCase() === 'PAN');
      const gstinEntry = statutory.find((s) => s.type?.toUpperCase() === 'GSTIN');
      const tanEntry = statutory.find((s) => s.type?.toUpperCase() === 'TAN');
      if (catDoc?.portal === 'IT' || resolvedCatId === 'cat-it') {
        clientIdentifier = panEntry?.idNo || gstinEntry?.idNo || '';
      } else if (catDoc?.portal === 'GST' || resolvedCatId === 'cat-gst') {
        clientIdentifier = gstinEntry?.idNo || panEntry?.idNo || '';
      } else if (catDoc?.portal === 'TDS' || resolvedCatId === 'cat-tds') {
        clientIdentifier = tanEntry?.idNo || panEntry?.idNo || '';
      } else {
        clientIdentifier = panEntry?.idNo || gstinEntry?.idNo || tanEntry?.idNo || '';
      }
    }
    if (!clientIdentifier && clientAny.pan) {
      clientIdentifier = clientAny.pan;
    }
    const clientState = clientAny.address?.state || clientAny.state || 'Karnataka';

    for (const svc of serviceList) {
      const existingItem =
        itemMap.get(`${cid}__${svc.formCode.toLowerCase()}`) ||
        itemMap.get(`${cid}__${svc.serviceName.toLowerCase()}`);

      const itemId = existingItem ? String(existingItem._id) : `c-item-${cid}-${svc.formCode}`;
      const cells: Record<string, unknown> = {};

      for (const col of columns) {
        const entry = existingItem ? entryMap.get(String(existingItem._id))?.get(col.key) : undefined;
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

      rows.push({
        clientId: cid,
        clientName: client.name,
        form: svc.serviceName, // Map form property to Service Name
        item: {
          id: itemId,
          clientId: cid,
          categoryId: svc.category,
          identifier: clientIdentifier,
          state: clientState,
          formCode: svc.formCode,
          label: svc.serviceName, // Map item label to Service Name
          kind: (existingItem?.kind || (svc.serviceName.toLowerCase().includes('payment') ? 'payment' : 'return')) as any,
          frequency: svc.frequency,
          isCustom: svc.isCustom,
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

export async function getComplianceSummary() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const startOfMonth = `${year}-${month}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  const today = getTodayDateString();

  const [allEntries, categories, items, clients] = await Promise.all([
    ComplianceEntryModel.find({ isDeleted: false }).lean(),
    ComplianceCategoryModel.find({ isDeleted: false }).lean(),
    ComplianceItemModel.find({ isDeleted: false }).lean(),
    Client.find({ isDeleted: false }).lean(),
  ]);

  const catMap = new Map(categories.map((c) => [c.categoryId, c]));
  const itemMap = new Map(items.map((i) => [String(i._id), i]));
  const clientMap = new Map(clients.map((c) => [String(c._id), c]));

  let dueThisMonth = 0;
  let pending = 0;
  let missed = 0;
  let filed = 0;
  let overdue = 0;

  const upcomingList: Array<{
    id: string;
    date: string;
    title: string;
    portal: string;
    clientId: string;
    clientName: string;
    complianceStatus: string;
  }> = [];

  for (const entry of allEntries) {
    const item = itemMap.get(String(entry.itemId));
    const cat = item ? catMap.get(item.categoryId) : undefined;
    const client = item ? clientMap.get(String(item.clientId)) : undefined;

    const status = deriveEntryStatus({
      dueDate: entry.dueDate,
      filedOn: entry.filedOn ?? null,
      statusOverride: entry.statusOverride ?? null,
      categoryMode: cat?.mode ?? 'manual',
      referenceDateStr: today,
    });

    if (status === 'filed') {
      filed++;
    } else if (status === 'missed') {
      missed++;
      overdue++;
    } else {
      pending++;
      if (entry.dueDate < today) overdue++;
    }

    if (entry.dueDate >= startOfMonth && entry.dueDate <= endOfMonth) {
      dueThisMonth++;
    }

    if (status !== 'filed') {
      upcomingList.push({
        id: String(entry._id),
        date: entry.dueDate,
        title: `${cat?.name ?? 'Compliance'} - ${item?.label || item?.formCode || 'Filing'}`,
        portal: cat?.portal || 'GST',
        clientId: client ? String(client._id) : '',
        clientName: client?.name || 'Client',
        complianceStatus: status.toUpperCase(),
      });
    }
  }

  // Sort upcoming by closest dueDate
  upcomingList.sort((a, b) => a.date.localeCompare(b.date));

  return {
    dueThisMonth,
    pending,
    missed,
    filed,
    overdue,
    total: allEntries.length,
    upcoming: upcomingList.slice(0, 5),
  };
}

function generateDynamicColumns(
  fy: string,
  frequencies: Set<Frequency>,
  frequencyParam: string
): { key: string; label: string; frequency: Frequency }[] {
  if (frequencyParam && frequencyParam !== 'all') {
    return generateColumns(fy, frequencyParam);
  }
  if (frequencies.size === 0) {
    return generateColumns(fy, 'all');
  }
  const cols: { key: string; label: string; frequency: Frequency }[] = [];
  if (frequencies.has('monthly')) {
    cols.push(...generateColumns(fy, 'monthly'));
  }
  if (frequencies.has('quarterly')) {
    cols.push(...generateColumns(fy, 'quarterly'));
  }
  if (frequencies.has('half_yearly')) {
    cols.push(...generateColumns(fy, 'half_yearly'));
  }
  if (frequencies.has('yearly')) {
    cols.push(...generateColumns(fy, 'yearly'));
  }
  return cols.length > 0 ? cols : generateColumns(fy, 'all');
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
