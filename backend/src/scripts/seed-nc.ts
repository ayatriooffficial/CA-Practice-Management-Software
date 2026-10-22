import { Types } from 'mongoose';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { createSeedData } from '../seed-source';
import { Client as ClientModel } from '../modules/client/client.model';
import { NoticeModel } from '../modules/notice/notice.model';
import {
  PortalSyncStateModel,
  SyncJobModel,
  ActivityLogModel,
  PracticeSettingModel,
} from '../modules/sync/sync.model';
import {
  ComplianceCategoryModel,
  ComplianceItemModel,
  ComplianceEntryModel,
} from '../modules/compliance/compliance.model';
import { KNOWN_COMPLIANCE_CATEGORIES } from '../modules/shared-nc/service-map';

export async function runSeed(options: { reset?: boolean; demoClients?: boolean } = {}) {
  // 1. Guard against running in production
  if (process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production') {
    logger.error('CRITICAL: Seed script refused to run in production environment (NODE_ENV=production)');
    throw new Error('Refusing to seed in production environment');
  }

  const { reset = false, demoClients = true } = options;

  logger.info(`Running seed-nc (reset: ${reset}, demoClients: ${demoClients})...`);

  // 2. If reset requested:
  // Remove ONLY isSeed data and demo-seed clients.
  // SUNRISE ENTERPRISES PRIVATE LIMITED and other non-seed clients remain untouched.
  if (reset) {
    logger.info('Resetting seed-created data...');
    await NoticeModel.deleteMany({ isSeed: true });
    await PortalSyncStateModel.deleteMany({ isSeed: true });
    await SyncJobModel.deleteMany({ isSeed: true });
    await ActivityLogModel.deleteMany({ isSeed: true });
    await ComplianceEntryModel.deleteMany({ isSeed: true });
    await ComplianceItemModel.deleteMany({ isSeed: true });
    await ComplianceCategoryModel.deleteMany({ isSeed: true });
    await PracticeSettingModel.deleteMany({ isSeed: true });

    // Only delete clients with fileNo starting with 'SEED-' or tagged as 'demo-seed'
    await ClientModel.deleteMany({
      $or: [
        { fileNo: { $regex: /^SEED-/ } },
        { tags: 'demo-seed' },
      ],
    });
    logger.info('Reset complete. Real clients preserved.');
  }

  // Generate deterministic seed payload
  const seedPayload = createSeedData();

  // 3. Upsert PracticeSetting (Credits, Entitlement, Plan)
  await PracticeSettingModel.findOneAndUpdate(
    { key: 'default' },
    {
      key: 'default',
      credits: seedPayload.credits, // 13841
      lastFreeSyncAt: new Date(seedPayload.syncEntitlement.lastFreeSyncAt || Date.now()),
      cooldownDays: seedPayload.syncEntitlement.cooldownDays,
      plan: seedPayload.syncEntitlement.plan,
      isSeed: true,
      isDeleted: false,
    },
    { upsert: true, new: true }
  );

  // 4. Upsert 27 Compliance Categories
  for (const cat of KNOWN_COMPLIANCE_CATEGORIES) {
    await ComplianceCategoryModel.findOneAndUpdate(
      { categoryId: cat.id },
      {
        categoryId: cat.id,
        name: cat.name,
        order: cat.order,
        mode: cat.mode,
        portal: cat.portal,
        isSeed: true,
        isDeleted: false,
      },
      { upsert: true }
    );
  }

  // 5. Seed 16 Demo Clients (if requested)
  // Maps demo client id (e.g. 'client-karnataka-stores') to Mongo _id
  const clientIdMap = new Map<string, Types.ObjectId>();

  if (demoClients) {
    for (const [idx, c] of seedPayload.clients.entries()) {
      const fileNo = `SEED-${String(idx + 1).padStart(3, '0')}`;
      const statutoryFiles = [];
      let key = 1;

      if (c.identifiers.gstin) {
        statutoryFiles.push({
          key: key++,
          type: 'GSTIN',
          idNo: c.identifiers.gstin,
          userId: c.sync.status === 'error' ? '' : `${c.name.toLowerCase().replace(/[^a-z]/g, '')}_gst`,
          attachment: null,
        });
      }
      if (c.identifiers.tan) {
        statutoryFiles.push({
          key: key++,
          type: 'TAN',
          idNo: c.identifiers.tan,
          userId: c.sync.status === 'error' ? '' : `${c.name.toLowerCase().replace(/[^a-z]/g, '')}_tan`,
          attachment: null,
        });
      }
      if (c.identifiers.pan) {
        statutoryFiles.push({
          key: key++,
          type: 'PAN',
          idNo: c.identifiers.pan,
          userId: c.sync.status === 'error' ? '' : `${c.name.toLowerCase().replace(/[^a-z]/g, '')}_it`,
          attachment: null,
        });
      }

      // Upsert client idempotently by name
      const clientDoc = await ClientModel.findOneAndUpdate(
        { name: c.name },
        {
          name: c.name,
          fileNo,
          type: 'private-limited',
          mobile: '9876543210',
          state: c.state || 'Karnataka',
          group: 'Seed Group',
          tags: ['demo-seed'],
          active: true,
          services: [],
          users: ['Admin'],
          pan: c.identifiers.pan || '',
          customerFiles: {
            promoter: [],
            statutory: statutoryFiles,
            recurring: [],
          },
          isDeleted: false,
        },
        { upsert: true, new: true }
      );

      clientIdMap.set(c.id, clientDoc._id as Types.ObjectId);

      // Create/Update PortalSyncState for each portal
      for (const p of c.portals) {
        await PortalSyncStateModel.findOneAndUpdate(
          { clientId: clientDoc._id, portal: p },
          {
            clientId: clientDoc._id,
            portal: p,
            status: c.sync.status,
            errorMessage: c.sync.errorMessage || '',
            lastSyncAt: c.sync.lastSyncAt ? new Date(c.sync.lastSyncAt) : null,
            hasCredentials: c.sync.status !== 'error',
            isSeed: true,
            isDeleted: false,
          },
          { upsert: true }
        );
      }
    }
  }

  // 6. Upsert Notices idempotently
  for (const n of seedPayload.notices) {
    const mongoClientId = clientIdMap.get(n.clientId);
    if (!mongoClientId) continue;

    const noticeData: Record<string, unknown> = {
      clientId: mongoClientId,
      portal: n.portal,
      noticeNumber: n.noticeNumber,
      description: n.description || '',
      files: n.files || [],
      syncedAt: new Date(n.syncedAt || Date.now()),
      isSeed: true,
      isDeleted: false,
    };

    if (n.portal === 'GST') {
      const gst = n as any;
      noticeData.type = gst.type;
      noticeData.noticeDate = gst.noticeDate;
      noticeData.dueDate = gst.dueDate;
      noticeData.status = gst.status;
      noticeData.taskId = gst.taskId;
    } else if (n.portal === 'TDS') {
      const tds = n as any;
      noticeData.category = tds.category;
      noticeData.period = tds.period;
      noticeData.formType = tds.formType;
      noticeData.noticeDate = tds.noticeDate;
      noticeData.portalStatus = tds.portalStatus;
      noticeData.manualStatus = tds.manualStatus;
    } else if (n.portal === 'IT') {
      const it = n as any;
      noticeData.category = it.category;
      noticeData.periodAY = it.periodAY;
      noticeData.issuedOn = it.issuedOn;
      noticeData.portalStatus = it.portalStatus;
      noticeData.manualStatus = it.manualStatus;
    }

    await NoticeModel.findOneAndUpdate(
      { clientId: mongoClientId, portal: n.portal, noticeNumber: n.noticeNumber },
      noticeData,
      { upsert: true }
    );
  }

  // 7. Upsert Compliance Items and Entries
  const itemIdMap = new Map<string, Types.ObjectId>();

  for (const item of seedPayload.complianceItems) {
    const mongoClientId = clientIdMap.get(item.clientId);
    if (!mongoClientId) continue;

    const itemDoc = await ComplianceItemModel.findOneAndUpdate(
      { clientId: mongoClientId, categoryId: item.categoryId, formCode: item.formCode },
      {
        clientId: mongoClientId,
        categoryId: item.categoryId,
        identifier: item.identifier,
        state: item.state,
        formCode: item.formCode,
        label: item.label,
        kind: item.kind,
        frequency: item.frequency,
        isCustom: item.isCustom,
        isSeed: true,
        isDeleted: false,
      },
      { upsert: true, new: true }
    );

    itemIdMap.set(item.id, itemDoc._id as Types.ObjectId);
  }

  for (const entry of seedPayload.complianceEntries) {
    const mongoItemId = itemIdMap.get(entry.itemId);
    if (!mongoItemId) continue;

    await ComplianceEntryModel.findOneAndUpdate(
      { itemId: mongoItemId, fy: entry.fy, periodKey: entry.periodKey },
      {
        itemId: mongoItemId,
        fy: entry.fy,
        periodKey: entry.periodKey,
        dueDate: entry.dueDate,
        filedOn: entry.filedOn,
        documents: entry.documents || [],
        source: entry.source || 'portal',
        syncedAt: entry.syncedAt ? new Date(entry.syncedAt) : new Date(),
        isSeed: true,
        isDeleted: false,
      },
      { upsert: true }
    );
  }

  // 8. Upsert SyncJobs
  for (const job of seedPayload.syncJobs) {
    const mongoClientIds = job.clientIds
      .map((cid: string) => clientIdMap.get(cid))
      .filter(Boolean) as Types.ObjectId[];

    const results = job.results.map((r: any) => ({
      clientId: clientIdMap.get(r.clientId) || new Types.ObjectId(),
      portal: r.portal,
      ok: r.ok,
      found: r.found,
      error: r.error,
    }));

    await SyncJobModel.findOneAndUpdate(
      { startedAt: new Date(job.startedAt), module: job.module },
      {
        startedAt: new Date(job.startedAt),
        finishedAt: job.finishedAt ? new Date(job.finishedAt) : null,
        triggeredBy: job.triggeredBy,
        module: job.module,
        portals: job.portals,
        clientIds: mongoClientIds,
        status: job.status,
        creditsUsed: job.creditsUsed,
        newItems: job.newItems,
        results,
        isSeed: true,
        isDeleted: false,
      },
      { upsert: true }
    );
  }

  // 9. Upsert ActivityLogs
  for (const log of seedPayload.activityLogs) {
    const mongoClientId = clientIdMap.get(log.clientId);
    if (!mongoClientId) continue;

    await ActivityLogModel.findOneAndUpdate(
      { at: new Date(log.at), clientId: mongoClientId, action: log.action },
      {
        at: new Date(log.at),
        userId: log.userId,
        clientId: mongoClientId,
        action: log.action,
        from: log.from,
        to: log.to,
        isSeed: true,
        isDeleted: false,
      },
      { upsert: true }
    );
  }

  logger.info('NC seeding complete!');
}

// Direct CLI invocation
if (require.main === module) {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');
  const demoClients = args.includes('--demo-clients') || !args.includes('--no-demo-clients');

  (async () => {
    try {
      await connectDatabase();
      await runSeed({ reset, demoClients });
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      console.error('Seed script failed:', err);
      process.exit(1);
    }
  })();
}
