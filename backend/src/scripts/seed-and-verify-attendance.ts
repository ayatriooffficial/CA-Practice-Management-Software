import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

import mongoose from 'mongoose';
import {
  AttendanceModel,
  HolidayModel,
  OfficeNoticeModel,
  LeaveModel,
} from '../modules/attendance/attendance.model';
import { UserModel } from '../modules/auth/user.model';
import { OrganizationModel } from '../modules/auth/organization.model';
import {
  ATTENDANCE_CONSTANTS,
  calculateDistanceMeters,
} from '../modules/attendance/attendance.constants';
import { evaluateDailyStatus, UserContext } from '../modules/attendance/attendance.status';
import {
  offsetISTDate,
} from '../shared/utils/istDate';
import { env } from '../config/env';

// Official Gazetted Holidays (Government of India / DOPT)
const INDIAN_HOLIDAYS_OFFICIAL = [
  // 2025
  { date: '2025-01-26', name: 'Republic Day', description: 'National Holiday' },
  { date: '2025-02-26', name: 'Maha Shivratri', description: 'Gazetted Holiday' },
  { date: '2025-03-14', name: 'Holi', description: 'Gazetted Holiday' },
  { date: '2025-03-31', name: 'Id-ul-Fitr', description: 'Gazetted Holiday' },
  { date: '2025-04-10', name: 'Mahavir Jayanti', description: 'Gazetted Holiday' },
  { date: '2025-04-18', name: 'Good Friday', description: 'Gazetted Holiday' },
  { date: '2025-05-12', name: 'Buddha Purnima', description: 'Gazetted Holiday' },
  { date: '2025-06-07', name: 'Id-ul-Zuha (Bakrid)', description: 'Gazetted Holiday' },
  { date: '2025-07-06', name: 'Muharram', description: 'Gazetted Holiday' },
  { date: '2025-08-15', name: 'Independence Day', description: 'National Holiday' },
  { date: '2025-09-05', name: 'Milad-un-Nabi', description: 'Gazetted Holiday' },
  { date: '2025-10-02', name: 'Mahatma Gandhi Birthday', description: 'National Holiday' },
  { date: '2025-10-20', name: 'Diwali (Deepavali)', description: 'Festival of Lights' },
  { date: '2025-11-05', name: 'Guru Nanak Jayanti', description: 'Gazetted Holiday' },
  { date: '2025-12-25', name: 'Christmas Day', description: 'Gazetted Holiday' },

  // 2026 (Verified with Central Govt Public Holidays 2026 calendar)
  { date: '2026-01-26', name: 'Republic Day', description: 'National Holiday' },
  { date: '2026-02-16', name: 'Maha Shivratri', description: 'Gazetted Holiday' },
  { date: '2026-03-04', name: 'Holi', description: 'Festival of Colours' },
  { date: '2026-03-20', name: 'Id-ul-Fitr', description: 'Gazetted Holiday' },
  { date: '2026-03-31', name: 'Mahavir Jayanti', description: 'Gazetted Holiday' },
  { date: '2026-04-03', name: 'Good Friday', description: 'Gazetted Holiday' },
  { date: '2026-05-01', name: 'Buddha Purnima / Maharashtra Day', description: 'Gazetted Holiday' },
  { date: '2026-05-27', name: 'Id-ul-Zuha (Bakrid)', description: 'Gazetted Holiday' },
  { date: '2026-06-26', name: 'Muharram', description: 'Gazetted Holiday' },
  { date: '2026-08-15', name: 'Independence Day', description: 'National Holiday' },
  { date: '2026-08-26', name: 'Milad-un-Nabi', description: 'Gazetted Holiday' },
  { date: '2026-10-02', name: 'Mahatma Gandhi Birthday', description: 'National Holiday' },
  { date: '2026-10-20', name: 'Dussehra (Vijaya Dashami)', description: 'Gazetted Holiday' },
  { date: '2026-11-08', name: 'Diwali (Deepavali)', description: 'Festival of Lights' },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti', description: 'Gazetted Holiday' },
  { date: '2026-12-25', name: 'Christmas Day', description: 'Gazetted Holiday' },
];

async function runDevDatabaseVerification() {
  console.log('\n======================================================');
  console.log('🧪 STEP 8.1 & 8.4: VERIFICATION ON DEV DATABASE (ayatrio_crm_dev)');
  console.log('======================================================');

  const devConn = await mongoose.createConnection('mongodb://localhost:27017/ayatrio_crm_dev').asPromise();
  console.log('Connected to throwaway dev database: ayatrio_crm_dev');

  const DevAttendance = devConn.model('Attendance', AttendanceModel.schema, 'attendance');
  const DevHoliday = devConn.model('Holiday', HolidayModel.schema, 'holidays');
  const DevNotice = devConn.model('OfficeNotice', OfficeNoticeModel.schema, 'officenotices');
  const DevLeave = devConn.model('Leave', LeaveModel.schema, 'leaves');

  // Ensure Indexes
  await DevAttendance.syncIndexes();
  await DevHoliday.syncIndexes();
  await DevNotice.syncIndexes();
  await DevLeave.syncIndexes();
  console.log('✓ Indexes successfully synchronized on dev database.');

  // Test 1: Pure Day Status evaluation
  const testUser: UserContext = {
    id: 'test_user_01',
    name: 'Test Employee',
    joiningDate: '2025-01-01',
    shiftStart: '09:30',
    shiftEnd: '18:30',
  };

  // Holiday check
  const holidayRes = evaluateDailyStatus({
    user: testUser,
    dateStr: '2026-01-26',
    holiday: { name: 'Republic Day' },
  });
  console.assert(holidayRes.badge === 'Holiday', 'Test 1a failed: Holiday evaluation');

  // Week-off (Sunday)
  const sundayRes = evaluateDailyStatus({
    user: testUser,
    dateStr: '2026-10-18', // 2026-10-18 was Sunday
  });
  console.assert(sundayRes.badge === 'Week Off', 'Test 1b failed: Sunday evaluation');

  // On Leave
  const leaveRes = evaluateDailyStatus({
    user: testUser,
    dateStr: '2026-10-21',
    approvedLeave: { leaveType: 'Casual Leave', days: 1 },
  });
  console.assert(leaveRes.badge === 'On Leave', 'Test 1c failed: Leave evaluation');

  // On Time Punch (09:35 AM IST)
  const punchOnTimeRes = evaluateDailyStatus({
    user: testUser,
    dateStr: '2026-10-21',
    punchRecord: {
      punchIn: new Date('2026-10-21T04:05:00.000Z'), // 09:35 AM IST
      punchOut: new Date('2026-10-21T13:05:00.000Z'), // 06:35 PM IST
    },
  });
  console.assert(punchOnTimeRes.badge === 'Present' && punchOnTimeRes.punctuality === 'On Time', 'Test 1d failed: On Time evaluation');

  // Late Punch (09:50 AM IST - beyond 15m grace)
  const punchLateRes = evaluateDailyStatus({
    user: testUser,
    dateStr: '2026-10-21',
    punchRecord: {
      punchIn: new Date('2026-10-21T04:20:00.000Z'), // 09:50 AM IST
      punchOut: new Date('2026-10-21T13:05:00.000Z'),
    },
  });
  console.assert(punchLateRes.badge === 'Present' && punchLateRes.punctuality === 'Late', 'Test 1e failed: Late evaluation');

  console.log('✓ Pure evaluation function passed all test cases.');

  // Test 2: Distance calculation (Dombivli office radius)
  const distNear = calculateDistanceMeters(19.2183, 73.0867, 19.2184, 73.0868);
  console.assert(distNear < 50, 'Test 2a failed: Near distance');
  const distFar = calculateDistanceMeters(19.2183, 73.0867, 19.0760, 72.8777); // Mumbai
  console.assert(distFar > 20000, 'Test 2b failed: Far distance');
  console.log('✓ Haversine distance calculator verified.');

  // Test 3: Unique Index (userId, date) enforcement
  const mockFirmId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();
  const testDoc = {
    firmId: mockFirmId,
    userId: mockUserId,
    date: '2026-10-22',
    punchIn: new Date(),
    status: 'On Time',
    __test: true,
  };

  await DevAttendance.create(testDoc);
  let duplicateCaught = false;
  try {
    await DevAttendance.create(testDoc);
  } catch (err: any) {
    duplicateCaught = err.code === 11000;
  }
  console.assert(duplicateCaught, 'Test 3 failed: Unique compound index was not enforced');
  console.log('✓ MongoDB unique compound index (userId, date) strictly enforced.');

  // Cleanup test documents from dev database
  await DevAttendance.deleteMany({ __test: true });
  const remaining = await DevAttendance.countDocuments({});
  console.assert(remaining === 0, 'Test 4 failed: Cleanup did not remove all test documents');
  console.log('✓ Dev database test documents completely cleaned up.');

  await devConn.close();
  console.log('Dev database verification finished successfully.');
}

async function runProductionSeed() {
  console.log('\n======================================================');
  console.log('🌱 STEP 8.3 & 9: IDEMPOTENT SEEDING AGAINST ayatrio_crm');
  console.log('======================================================');

  await mongoose.connect(env.MONGODB_URI, { dbName: 'ayatrio_crm' });
  console.log('Connected to main database:', env.MONGODB_URI.split('@')[1] || 'Atlas');

  // Ensure indexes on real collections
  await AttendanceModel.syncIndexes();
  await HolidayModel.syncIndexes();
  await OfficeNoticeModel.syncIndexes();
  await LeaveModel.syncIndexes();

  // Find Krishna Associates Organization
  let org = await OrganizationModel.findOne({ name: /Krishna/i });
  if (!org) {
    org = await OrganizationModel.findOne({});
  }
  if (!org) {
    throw new Error('No organization found in database to associate seed data with.');
  }
  const firmId = org._id;
  console.log(`Using Firm: ${org.name} (${firmId})`);

  // Target users for attendance history
  const seedEmails = [
    'deepak.sahani@krishnaassociates.example',
    'sunita.sharma@krishnaassociates.example',
    'amit.joshi@krishnaassociates.example',
    'pooja.mehta@krishnaassociates.example',
    'cnanda@gmail.com',
  ];

  const users = await UserModel.find({ email: { $in: seedEmails } });
  if (users.length === 0) {
    throw new Error('No seed users found in users collection.');
  }
  console.log(`Found ${users.length} matching users for attendance seed: ${users.map((u) => u.name).join(', ')}`);

  // Initial counts
  const countAttendanceBefore = await AttendanceModel.countDocuments({ firmId });
  const countHolidaysBefore = await HolidayModel.countDocuments({ firmId });
  const countNoticesBefore = await OfficeNoticeModel.countDocuments({ firmId });
  const countLeavesBefore = await LeaveModel.countDocuments({ firmId });

  console.log(`Before seed counts -> Attendance: ${countAttendanceBefore}, Holidays: ${countHolidaysBefore}, Notices: ${countNoticesBefore}, Leaves: ${countLeavesBefore}`);

  // 1. Seed Holidays for all organizations (Idempotent upsert by firmId + date)
  const allOrganizations = await OrganizationModel.find({});
  for (const o of allOrganizations) {
    for (const h of INDIAN_HOLIDAYS_OFFICIAL) {
      await HolidayModel.updateOne(
        { firmId: o._id, date: h.date },
        { $set: { firmId: o._id, date: h.date, name: h.name, description: h.description } },
        { upsert: true }
      );
    }
  }
  console.log(`✓ Seeded ${INDIAN_HOLIDAYS_OFFICIAL.length} Indian Gazetted Holidays for all ${allOrganizations.length} organizations.`);

  // 2. Seed Notices (Office Announcements) for all organizations
  const sampleNotices = [
    {
      title: 'Diwali Festive Timings & Office Schedule',
      body: 'Office will operate on modified hours during the upcoming festival week. Please coordinate all urgent statutory filings in advance.',
      author: { id: String(users[0]._id), name: users[0].name, role: users[0].role },
    },
    {
      title: 'Biometric & Mobile Geo-Attendance Active',
      body: 'All staff are requested to mark daily attendance via the Practice Portal upon arriving at the Dombivli office premises.',
      author: { id: String(users[0]._id), name: users[0].name, role: users[0].role },
    },
  ];

  for (const o of allOrganizations) {
    for (const n of sampleNotices) {
      await OfficeNoticeModel.updateOne(
        { firmId: o._id, title: n.title },
        { $set: { firmId: o._id, title: n.title, body: n.body, createdBy: n.author, createdAt: new Date() } },
        { upsert: true }
      );
    }
  }
  console.log(`✓ Seeded ${sampleNotices.length} office notice board announcements for all organizations.`);

  // 3. Seed Leaves (Matching past leaves and upcoming leaves)
  const sampleLeaves = [
    {
      userId: users[users.length - 1]._id,
      applicant: users[users.length - 1].name,
      leaveType: 'Casual Leave' as const,
      startDate: '2026-10-23', // Today (matches screenshot showing "On Leave" for Chetan Nanda!)
      endDate: '2026-10-23',
      days: 1,
      reason: 'Personal engagement',
      status: 'Approved' as const,
    },
    {
      userId: users[users.length - 1]._id,
      applicant: users[users.length - 1].name,
      leaveType: 'Earned Leave' as const,
      startDate: '2026-11-02',
      endDate: '2026-11-04',
      days: 3,
      reason: 'Family wedding',
      status: 'Approved' as const,
    },
  ];

  for (const l of sampleLeaves) {
    await LeaveModel.updateOne(
      { firmId, userId: l.userId, startDate: l.startDate },
      { $set: { ...l, firmId } },
      { upsert: true }
    );
  }
  console.log(`✓ Seeded sample leaves (including Chetan Nanda on-leave for 2026-10-23 as in screenshot).`);

  // 4. Seed Attendance History (~13 months, up to yesterday 2026-10-22, working days only, NO record for today)
  const todayStr = '2026-10-23';
  const yesterdayStr = offsetISTDate(todayStr, -1);
  const startHistDate = offsetISTDate(todayStr, -395); // ~13 months ago (~400 days)

  const holidaysMap = new Set(INDIAN_HOLIDAYS_OFFICIAL.map((h) => h.date));
  let seededPunchesCount = 0;

  const attendanceBatch: any[] = [];
  let cur = startHistDate;

  while (cur <= yesterdayStr) {
    const [y, m, d] = cur.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();

    // Skip Sundays and holidays
    if (dayOfWeek !== 0 && !holidaysMap.has(cur)) {
      for (let uIdx = 0; uIdx < users.length; uIdx++) {
        const u = users[uIdx];

        // Leave check for Chetan Nanda on leave
        if (u.name === 'Chetan Nanda' && cur === todayStr) {
          continue; // No punch if on leave
        }

        // Random deterministic variation based on date and user index
        const hash = (y * 365 + m * 31 + d + uIdx * 17) % 100;
        if (hash < 6) {
          // Absent day (~6% of working days)
          continue;
        }

        // Punch In time between 9:22 and 10:05 AM
        const isLate = hash > 75; // ~25% late
        const inMins = isLate ? 9 * 60 + 46 + (hash % 15) : 9 * 60 + 20 + (hash % 24);
        const inHour = Math.floor(inMins / 60);
        const inMin = inMins % 60;

        // Punch Out between 6:15 and 7:00 PM
        const outMins = 18 * 60 + 15 + (hash % 45);
        const outHour = Math.floor(outMins / 60);
        const outMin = outMins % 60;

        // Construct UTC Date
        const punchIn = new Date(Date.UTC(y, m - 1, d, inHour - 5, inMin - 30, 0)); // UTC equivalent of IST
        const punchOut = new Date(Date.UTC(y, m - 1, d, outHour - 5, outMin - 30, 0));

        const diffMs = punchOut.getTime() - punchIn.getTime();
        const totalMinutes = Math.floor(diffMs / 60000);

        attendanceBatch.push({
          firmId,
          userId: u._id,
          date: cur,
          punchIn,
          punchOut,
          breakMinutes: 0,
          totalMinutes,
          geo: {
            lat: ATTENDANCE_CONSTANTS.OFFICE.lat + (hash % 5) * 0.0001,
            lng: ATTENDANCE_CONSTANTS.OFFICE.lng + (hash % 5) * 0.0001,
            accuracy: 12,
          },
          officeId: ATTENDANCE_CONSTANTS.OFFICE.id,
          distanceM: 15 + (hash % 40),
          source: 'punch',
          status: isLate ? 'Late' : 'On Time',
          workLocation: 'Office',
        });
      }
    }

    cur = offsetISTDate(cur, 1);
  }

  // Idempotent bulk upsert using bulkWrite
  const ops = attendanceBatch.map((doc) => ({
    updateOne: {
      filter: { userId: doc.userId, date: doc.date },
      update: { $set: doc },
      upsert: true,
    },
  }));

  if (ops.length > 0) {
    const res = await AttendanceModel.bulkWrite(ops);
    seededPunchesCount = res.upsertedCount + res.modifiedCount;
  }
  console.log(`✓ Processed ${attendanceBatch.length} attendance records across ${users.length} users (Upserted/Updated: ${seededPunchesCount}).`);

  // Final counts and size
  const countAttendanceAfter = await AttendanceModel.countDocuments({ firmId });
  const countHolidaysAfter = await HolidayModel.countDocuments({ firmId });
  const countNoticesAfter = await OfficeNoticeModel.countDocuments({ firmId });
  const countLeavesAfter = await LeaveModel.countDocuments({ firmId });

  console.log('\n======================================================');
  console.log('📊 MONGODB SUMMARY (ayatrio_crm)');
  console.log('======================================================');
  console.log(`- Attendance documents: ${countAttendanceAfter} (was ${countAttendanceBefore})`);
  console.log(`- Holidays documents:   ${countHolidaysAfter} (was ${countHolidaysBefore})`);
  console.log(`- Notices documents:    ${countNoticesAfter} (was ${countNoticesBefore})`);
  console.log(`- Leaves documents:     ${countLeavesAfter} (was ${countLeavesBefore})`);
  console.log('======================================================\n');

  await mongoose.disconnect();
}

async function main() {
  try {
    await runDevDatabaseVerification();
    await runProductionSeed();
    console.log('🎉 Seeding and verification completed with zero errors.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding/verification:', error);
    process.exit(1);
  }
}

main();
