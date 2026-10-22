import assert from 'assert';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Client as ClientModel } from '../modules/client/client.model';
import { NoticeModel } from '../modules/notice/notice.model';
import { PracticeSettingModel } from '../modules/sync/sync.model';
import {
  mapStatutoryTypeToPortal,
  derivePortalsAndIdentifiers,
  deriveComplianceItems,
  hasSavedCredentials,
} from '../modules/shared-nc/portal.util';
import { getDueDate } from '../modules/shared-nc/dueDates';
import {
  deriveEntryStatus,
  getTodayDateString,
} from '../modules/shared-nc/status.util';
import { runSeed } from './seed-nc';

async function verifyAll() {
  console.log('====================================================');
  console.log('🧪 Starting Step B1 Verification Script');
  console.log('====================================================\n');

  // ---------------------------------------------------------------------------
  // Check 1: portal.util on real client shape
  // ---------------------------------------------------------------------------
  console.log('Check 1: portal.util derivation on real client SUNRISE...');
  const statutoryMock = [
    { type: 'PAN', idNo: 'SDVSDVSDVSDV', userId: 'tehtd3254reg' },
    { type: 'TAN', idNo: 'REGAE5Y4W5GRF', userId: 'ey5y6w4th45' },
  ];
  const recurringMock = [
    { key: 1, category: 'Income Tax', service: 'ITRksdwej', tariff: '20000.00' },
  ];
  const derived = derivePortalsAndIdentifiers(statutoryMock, 'AAKCA1234F');
  assert.deepStrictEqual(derived.portals.sort(), ['IT', 'TDS'].sort(), 'Portals must be [IT, TDS]');
  assert.strictEqual(derived.identifiers.pan, 'AAKCA1234F', 'PAN must be AAKCA1234F');
  assert.strictEqual(derived.identifiers.tan, 'REGAE5Y4W5GRF', 'TAN must be REGAE5Y4W5GRF');

  const complianceItems = deriveComplianceItems({
    clientType: 'private-limited',
    recurring: recurringMock,
    services: [],
  });
  assert.strictEqual(complianceItems.length, 1, 'Should derive exactly 1 compliance item');
  assert.strictEqual(complianceItems[0].categoryId, 'cat-it');
  assert.strictEqual(complianceItems[0].formCode, 'ITR-6');
  assert.strictEqual(complianceItems[0].frequency, 'yearly');
  console.log('  [PASS] Real client shape derived portals, identifiers, and compliance item [income-tax / ITR-6 / yearly]');

  // ---------------------------------------------------------------------------
  // Check 2: mapStatutoryTypeToPortal variations
  // ---------------------------------------------------------------------------
  console.log('Check 2: Statutory type variations mapping...');
  assert.strictEqual(mapStatutoryTypeToPortal('GSTIN'), 'GST');
  assert.strictEqual(mapStatutoryTypeToPortal('gst'), 'GST');
  assert.strictEqual(mapStatutoryTypeToPortal('GST Portal'), 'GST');
  assert.strictEqual(mapStatutoryTypeToPortal('tan'), 'TDS');
  assert.strictEqual(mapStatutoryTypeToPortal('PAN'), 'IT');
  assert.strictEqual(mapStatutoryTypeToPortal(''), null);
  assert.strictEqual(mapStatutoryTypeToPortal(undefined), null);

  const emptyDerived = derivePortalsAndIdentifiers([]);
  assert.strictEqual(emptyDerived.portals.length, 0, 'Empty statutory list must give no portals');
  console.log('  [PASS] "GSTIN", "gst", "GST Portal" map to GST; "tan" to TDS; "PAN" to IT; empty gives no portals');

  // ---------------------------------------------------------------------------
  // Check 3: Due date and status helpers
  // ---------------------------------------------------------------------------
  console.log('Check 3: Due date and status helpers...');
  const gstr3bDue = getDueDate('GSTR3B', '2025-04');
  assert.strictEqual(gstr3bDue, '2025-05-20', 'GSTR3B Apr 2025 must be due 2025-05-20');

  const todayStr = getTodayDateString();
  const pastDue = '2020-01-01';
  const futureDue = '2099-01-01';

  // Past due unfiled -> missed
  const missedStatus = deriveEntryStatus({
    dueDate: pastDue,
    filedOn: null,
    referenceDateStr: todayStr,
  });
  assert.strictEqual(missedStatus, 'missed', 'Past-due unfiled entry must be missed');

  // Future due unfiled -> pending
  const pendingStatus = deriveEntryStatus({
    dueDate: futureDue,
    filedOn: null,
    referenceDateStr: todayStr,
  });
  assert.strictEqual(pendingStatus, 'pending', 'Future unfiled entry must be pending');

  // Filed entry -> filed
  const filedStatus = deriveEntryStatus({
    dueDate: pastDue,
    filedOn: '2020-01-02',
    referenceDateStr: todayStr,
  });
  assert.strictEqual(filedStatus, 'filed', 'Filed entry must be filed');

  // statusOverride wins ONLY for manual categories
  const autoOverride = deriveEntryStatus({
    dueDate: pastDue,
    filedOn: null,
    statusOverride: 'filed',
    categoryMode: 'auto',
    referenceDateStr: todayStr,
  });
  assert.strictEqual(autoOverride, 'missed', 'statusOverride must NOT apply to auto categories');

  const manualOverride = deriveEntryStatus({
    dueDate: pastDue,
    filedOn: null,
    statusOverride: 'filed',
    categoryMode: 'manual',
    referenceDateStr: todayStr,
  });
  assert.strictEqual(manualOverride, 'filed', 'statusOverride must apply to manual categories');
  console.log('  [PASS] GSTR3B Apr 2025 due 2025-05-20; past-due unfiled missed; future pending; statusOverride wins only for manual');

  // ---------------------------------------------------------------------------
  // Check 4: Security credential check
  // ---------------------------------------------------------------------------
  console.log('Check 4: Credentials check uses userId only (never password)...');
  const credsCheck1 = hasSavedCredentials(
    [{ type: 'GSTIN', idNo: '29AALFK6109R1ZI', userId: 'user123' }],
    'GST'
  );
  assert.strictEqual(credsCheck1, true);

  const credsCheck2 = hasSavedCredentials(
    [{ type: 'GSTIN', idNo: '29AALFK6109R1ZI', userId: '' }],
    'GST'
  );
  assert.strictEqual(credsCheck2, false);
  console.log('  [PASS] hasSavedCredentials checks non-empty userId only');

  // ---------------------------------------------------------------------------
  // Check 5: Connect to DB and test Seeding Idempotency & Counts
  // ---------------------------------------------------------------------------
  console.log('\nConnecting to database for database assertion checks...');
  await connectDatabase();

  // Ensure real client SUNRISE ENTERPRISES exists before running seed
  const realClientPre = await ClientModel.findOne({ name: 'SUNRISE ENTERPRISES PRIVATE LIMITED' });
  assert.ok(realClientPre, 'SUNRISE ENTERPRISES PRIVATE LIMITED must exist in database');

  console.log('Running seed:nc first pass...');
  await runSeed({ reset: false, demoClients: true });

  console.log('Running seed:nc second pass (idempotency check)...');
  await runSeed({ reset: false, demoClients: true });

  // Assert counts
  const demoClientsCount = await ClientModel.countDocuments({
    tags: 'demo-seed',
    isDeleted: false,
  });
  assert.strictEqual(demoClientsCount, 16, `Expected 16 demo clients, got ${demoClientsCount}`);

  const gstNoticesCount = await NoticeModel.countDocuments({ portal: 'GST', isDeleted: false });
  assert.strictEqual(gstNoticesCount, 82, `Expected 82 GST notices, got ${gstNoticesCount}`);

  const tdsNoticesCount = await NoticeModel.countDocuments({ portal: 'TDS', isDeleted: false });
  assert.strictEqual(tdsNoticesCount, 34, `Expected 34 TDS notices, got ${tdsNoticesCount}`);

  const itNoticesCount = await NoticeModel.countDocuments({ portal: 'IT', isDeleted: false });
  assert.strictEqual(itNoticesCount, 16, `Expected 16 IT notices, got ${itNoticesCount}`);

  // Assert KARNATAKA STORES notices & overdue
  const ksClient = await ClientModel.findOne({ name: 'KARNATAKA STORES' });
  assert.ok(ksClient, 'KARNATAKA STORES client must exist');

  const ksNotices = await NoticeModel.find({ clientId: ksClient._id, isDeleted: false });
  assert.strictEqual(ksNotices.length, 74, `Expected 74 notices for KARNATAKA STORES, got ${ksNotices.length}`);

  const ksOverdueCount = ksNotices.filter((n) => n.dueDate && n.dueDate < todayStr).length;
  assert.strictEqual(ksOverdueCount, 18, `Expected 18 overdue notices for KARNATAKA STORES, got ${ksOverdueCount}`);

  // Assert Credits
  const settings = await PracticeSettingModel.findOne({ key: 'default' });
  assert.ok(settings, 'PracticeSetting must exist');
  assert.strictEqual(settings.credits, 13841, `Expected 13841 credits, got ${settings.credits}`);

  console.log('  [PASS] 16 demo clients, GST 82 / TDS 34 / IT 16 notices, KARNATAKA STORES 74 (18 overdue), credits 13841');

  // ---------------------------------------------------------------------------
  // Check 6: --reset removes only isSeed data and demo-seed clients
  // ---------------------------------------------------------------------------
  console.log('Check 6: Testing --reset preservation of real client...');
  await runSeed({ reset: true, demoClients: false });

  const seedClientsRemaining = await ClientModel.countDocuments({ tags: 'demo-seed' });
  assert.strictEqual(seedClientsRemaining, 0, 'Demo seed clients should be removed on reset');

  const noticesRemaining = await NoticeModel.countDocuments({ isSeed: true });
  assert.strictEqual(noticesRemaining, 0, 'Seed notices should be removed on reset');

  const realClientPost = await ClientModel.findOne({ name: 'SUNRISE ENTERPRISES PRIVATE LIMITED' });
  assert.ok(realClientPost, 'SUNRISE ENTERPRISES PRIVATE LIMITED must still exist after reset');
  assert.strictEqual(realClientPost.isDeleted, false, 'SUNRISE ENTERPRISES must not be deleted');

  // Re-seed for active development state
  await runSeed({ reset: false, demoClients: true });

  await disconnectDatabase();
  console.log('\n====================================================');
  console.log('🎉 ALL B1 CHECKS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

if (require.main === module) {
  verifyAll()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Verification FAILED:', err);
      process.exit(1);
    });
}
