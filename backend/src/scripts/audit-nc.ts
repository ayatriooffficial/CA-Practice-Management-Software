import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { Client } from '../modules/client/client.model';
import { NoticeModel } from '../modules/notice/notice.model';
import { ComplianceCategoryModel, ComplianceEntryModel, ComplianceItemModel } from '../modules/compliance/compliance.model';
import { PracticeSettingModel, SyncJobModel } from '../modules/sync/sync.model';

type Check = { check: string; database: unknown; api: unknown; pass: boolean };
const checks: Check[] = [];
const baseUrl = process.env.AUDIT_API_URL ?? `http://127.0.0.1:${env.PORT}${env.API_PREFIX}`;

async function api(path: string, init?: RequestInit): Promise<{ status: number; body: any }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

function payload(body: any): any {
  return body?.data ?? body;
}

function compare(check: string, database: unknown, apiValue: unknown): void {
  const pass = JSON.stringify(database) === JSON.stringify(apiValue);
  checks.push({ check, database, api: apiValue, pass });
}

async function main(): Promise<void> {
  await connectDatabase();
  const [clients, notices, categories, items, entries, setting, jobs] = await Promise.all([
    Client.find({ isDeleted: false }).lean(),
    NoticeModel.find({ isDeleted: false }).lean(),
    ComplianceCategoryModel.find({ isDeleted: false }).lean(),
    ComplianceItemModel.find({ isDeleted: false }).lean(),
    ComplianceEntryModel.find({ isDeleted: { $ne: true } }).lean(),
    PracticeSettingModel.findOne({ isDeleted: false }).lean(),
    SyncJobModel.find({ isDeleted: false }).sort({ startedAt: -1 }).limit(10).lean(),
  ]);
  const activeClientIds = new Set(clients.map((client) => String(client._id)));
  const activeNotices = notices.filter((notice) => activeClientIds.has(String(notice.clientId)));
  const portals = ['GST', 'TDS', 'IT'] as const;
  const statusNames = ['new', 'response_preparing', 'response_filed', 'under_dept_review', 'hearing_scheduled', 'appeal_filed', 'closed', 'no_status'];

  for (const portal of portals) {
    const portalNotices = activeNotices.filter((notice) => notice.portal === portal);
    const counts = Object.fromEntries(statusNames.map((status) => [
      status,
      portalNotices.filter((notice) => (portal === 'GST' ? notice.status : notice.manualStatus) === status).length,
    ]));
    compare(`/notices/summary?portal=${portal}`, { total: portalNotices.length, ...counts }, payload((await api(`/notices/summary?portal=${portal}`)).body));
  }

  const clientsWithNotices = new Set(activeNotices.map((notice) => String(notice.clientId)));
  const issueClientIds = new Set<string>();
  const syncStates = await mongoose.connection.collection('portalsyncstates').find({ isDeleted: false }).toArray();
  for (const client of clients) {
    const states = syncStates.filter((state) => String(state.clientId) === String(client._id));
    if (states.length === 0 || states.some((state) => state.status === 'error' || state.status === 'stale' || state.status === 'never_synced')) {
      issueClientIds.add(String(client._id));
    }
  }
  compare('/notices/clients counts', {
    all: clients.length,
    notices: clientsWithNotices.size,
    issues: issueClientIds.size,
  }, payload((await api('/notices/clients')).body)?.counts);

  compare('/sync/credits', setting?.credits ?? 13841, payload((await api('/sync/credits')).body)?.credits);
  compare('/sync/jobs', jobs.length, payload((await api('/sync/jobs?limit=10')).body)?.length);
  compare('/compliance/categories', categories.length, payload((await api('/compliance/categories')).body)?.length);
  for (const category of categories) {
    const categoryItems = items.filter((item) => item.categoryId === category.categoryId);
    const categoryEntries = entries.filter((entry) => ['FY 2025-2026', '2025-26'].includes(entry.fy) && categoryItems.some((item) => String(item._id) === String(entry.itemId)));
    const grid = payload((await api(`/compliance/grid?categoryId=${encodeURIComponent(category.categoryId)}&fy=FY%202025-2026&frequency=all`)).body);
    compare(`/compliance/grid ${category.categoryId}`, categoryItems.length, grid?.rows?.length ?? 0);
    compare(`/compliance/entries ${category.categoryId}`, categoryEntries.length, grid?.entries?.length ?? 0);
  }

  const malformed = await api('/notices?unknown=1');
  checks.push({ check: 'unknown notice query key rejected', database: 400, api: malformed.status, pass: malformed.status === 400 });
  const invalidId = await api('/notices?clientId=not-an-object-id');
  checks.push({ check: 'invalid notice clientId rejected', database: 400, api: invalidId.status, pass: invalidId.status === 400 });
  const capped = await api('/notices?limit=1000');
  checks.push({ check: 'notice limit 1000 rejected or capped', database: '<=200', api: capped.status === 200 ? payload(capped.body)?.pagination?.limit : capped.status, pass: capped.status === 400 || Number(payload(capped.body)?.pagination?.limit) <= 200 });

  console.table(checks.map((check) => ({
    check: check.check,
    database: JSON.stringify(check.database),
    api: JSON.stringify(check.api),
    result: check.pass ? 'PASS' : 'FAIL',
  })));
  if (checks.some((check) => !check.pass)) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
