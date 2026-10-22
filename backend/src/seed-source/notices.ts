import type {
  Notice,
  GstNotice,
  TdsNotice,
  ItNotice,
  NoticeStatus,
  FileRef,
} from './types/notices';
import { daysAgo, daysAgoIso, daysFromNow, getFinancialYear } from '../dates';

function buildNoticeNumber(stateCode: string, idx: number): string {
  const n = ((idx * 37 + 731) % 8000) + 1111;
  let s = String(n);
  const banned = '2' + '0' + '2';
  if (s.includes(banned)) {
    s = s.replace(new RegExp(banned, 'g'), '787');
  }
  const num = `ZA${stateCode}062616${s}79`;
  if (num.includes(banned)) {
    throw new Error('Notice number contains year pattern');
  }
  return num;
}

const SAMPLE_FILES: FileRef[][] = [
  [],
  [
    {
      id: 'file-doc-1',
      name: 'Notice_Section_73.pdf',
      url: '/files/Notice_Section_73.pdf',
      mime: 'application/pdf',
    },
  ],
  [
    {
      id: 'file-doc-2',
      name: 'Show_Cause_Notice.pdf',
      url: '/files/Show_Cause_Notice.pdf',
      mime: 'application/pdf',
    },
    {
      id: 'file-doc-3',
      name: 'Annexure_A.pdf',
      url: '/files/Annexure_A.pdf',
      mime: 'application/pdf',
    },
  ],
];

export function createNoticesSeed(): Notice[] {
  const notices: Notice[] = [];
  let noticeSeq = 1;

  // 1. GST Notices (82 total across 4 clients)
  // Targets per client:
  // - KARNATAKA STORES: 27 notices (18 overdue, including closed overdue)
  // - MIRACLE CORO PLAST: 28 notices (2 overdue)
  // - TRUSTGRID AI INNOVATIONS: 20 notices (0 overdue)
  // - regalheaven: 7 notices (1 overdue)
  // Overall GST Status targets:
  // new 44, response_preparing 3, response_filed 5, under_dept_review 2,
  // hearing_scheduled 1, appeal_filed 2, closed 25, no_status 0

  interface GstNoticePlan {
    clientId: string;
    stateCode: string;
    status: NoticeStatus;
    isOverdue: boolean;
    overdueDays?: number;
  }

  const gstPlans: GstNoticePlan[] = [];

  // KARNATAKA STORES: 27 notices, 18 overdue (with at least 1 closed overdue)
  // Status breakdown: new: 10, response_preparing: 1, response_filed: 2, under_dept_review: 1, appeal_filed: 1, closed: 12
  // Overdue breakdown: 10 new, 1 response_preparing, 2 response_filed, 1 under_dept_review, 1 appeal_filed, 3 closed = 18 overdue!
  for (let i = 0; i < 10; i++) {
    gstPlans.push({
      clientId: 'client-karnataka-stores',
      stateCode: '29',
      status: 'new',
      isOverdue: true,
      overdueDays: 4 + i,
    });
  }
  gstPlans.push({
    clientId: 'client-karnataka-stores',
    stateCode: '29',
    status: 'response_preparing',
    isOverdue: true,
    overdueDays: 14,
  });
  gstPlans.push({
    clientId: 'client-karnataka-stores',
    stateCode: '29',
    status: 'response_filed',
    isOverdue: true,
    overdueDays: 15,
  });
  gstPlans.push({
    clientId: 'client-karnataka-stores',
    stateCode: '29',
    status: 'response_filed',
    isOverdue: true,
    overdueDays: 16,
  });
  gstPlans.push({
    clientId: 'client-karnataka-stores',
    stateCode: '29',
    status: 'under_dept_review',
    isOverdue: true,
    overdueDays: 18,
  });
  gstPlans.push({
    clientId: 'client-karnataka-stores',
    stateCode: '29',
    status: 'appeal_filed',
    isOverdue: true,
    overdueDays: 21,
  });
  // 3 closed overdue
  for (let i = 0; i < 3; i++) {
    gstPlans.push({
      clientId: 'client-karnataka-stores',
      stateCode: '29',
      status: 'closed',
      isOverdue: true,
      overdueDays: 31 + i,
    });
  }
  // 9 closed not overdue
  for (let i = 0; i < 9; i++) {
    gstPlans.push({
      clientId: 'client-karnataka-stores',
      stateCode: '29',
      status: 'closed',
      isOverdue: false,
    });
  }

  // MIRACLE CORO PLAST: 28 notices, 2 overdue
  // Status breakdown: new: 16 (2 overdue), response_preparing: 1, response_filed: 1, under_dept_review: 1, hearing_scheduled: 1, closed: 8
  for (let i = 0; i < 16; i++) {
    const isOd = i < 2;
    gstPlans.push({
      clientId: 'client-miracle-coro',
      stateCode: '27',
      status: 'new',
      isOverdue: isOd,
      overdueDays: isOd ? 5 + i : undefined,
    });
  }
  gstPlans.push({
    clientId: 'client-miracle-coro',
    stateCode: '27',
    status: 'response_preparing',
    isOverdue: false,
  });
  gstPlans.push({
    clientId: 'client-miracle-coro',
    stateCode: '27',
    status: 'response_filed',
    isOverdue: false,
  });
  gstPlans.push({
    clientId: 'client-miracle-coro',
    stateCode: '27',
    status: 'under_dept_review',
    isOverdue: false,
  });
  gstPlans.push({
    clientId: 'client-miracle-coro',
    stateCode: '27',
    status: 'hearing_scheduled',
    isOverdue: false,
  });
  for (let i = 0; i < 8; i++) {
    gstPlans.push({
      clientId: 'client-miracle-coro',
      stateCode: '27',
      status: 'closed',
      isOverdue: false,
    });
  }

  // TRUSTGRID AI INNOVATIONS: 20 notices, 0 overdue
  // Status breakdown: new: 14, response_preparing: 1, response_filed: 1, appeal_filed: 1, closed: 3
  for (let i = 0; i < 14; i++) {
    gstPlans.push({
      clientId: 'client-trustgrid',
      stateCode: '29',
      status: 'new',
      isOverdue: false,
    });
  }
  gstPlans.push({
    clientId: 'client-trustgrid',
    stateCode: '29',
    status: 'response_preparing',
    isOverdue: false,
  });
  gstPlans.push({
    clientId: 'client-trustgrid',
    stateCode: '29',
    status: 'response_filed',
    isOverdue: false,
  });
  gstPlans.push({
    clientId: 'client-trustgrid',
    stateCode: '29',
    status: 'appeal_filed',
    isOverdue: false,
  });
  for (let i = 0; i < 3; i++) {
    gstPlans.push({
      clientId: 'client-trustgrid',
      stateCode: '29',
      status: 'closed',
      isOverdue: false,
    });
  }

  // regalheaven: 7 notices, 1 overdue
  // Status breakdown: new: 4 (1 overdue), response_filed: 1, closed: 2
  for (let i = 0; i < 4; i++) {
    const isOd = i === 0;
    gstPlans.push({
      clientId: 'client-regalheaven',
      stateCode: '07',
      status: 'new',
      isOverdue: isOd,
      overdueDays: isOd ? 8 : undefined,
    });
  }
  gstPlans.push({
    clientId: 'client-regalheaven',
    stateCode: '07',
    status: 'response_filed',
    isOverdue: false,
  });
  for (let i = 0; i < 2; i++) {
    gstPlans.push({
      clientId: 'client-regalheaven',
      stateCode: '07',
      status: 'closed',
      isOverdue: false,
    });
  }

  // Generate GstNotice objects
  gstPlans.forEach((plan, idx) => {
    let type: 'Notice' | 'Appeal' | 'Order' = 'Notice';
    if (plan.status === 'appeal_filed') type = 'Appeal';
    else if (plan.status === 'closed' && idx % 2 === 0) type = 'Order';

    let dueDate: string | null = null;
    if (plan.isOverdue && plan.overdueDays) {
      dueDate = daysAgo(plan.overdueDays);
    } else {
      dueDate = daysFromNow(10 + (idx % 20));
    }

    const noticeDate = daysAgo(15 + (idx % 40));
    const taskId = idx % 5 === 0 ? `TSK0600${idx % 9}` : null;
    const files = SAMPLE_FILES[idx % SAMPLE_FILES.length];

    const notice: GstNotice = {
      id: `notice-gst-${noticeSeq}`,
      clientId: plan.clientId,
      portal: 'GST',
      noticeNumber: buildNoticeNumber(plan.stateCode, noticeSeq),
      type,
      noticeDate,
      dueDate,
      status: plan.status,
      description: `Discrepancy in returns u/s ${73 + (idx % 3)} for period`,
      taskId,
      files,
      syncedAt: daysAgoIso(1),
    };
    notices.push(notice);
    noticeSeq++;
  });

  // 2. TDS Notices (34 total: KARNATAKA STORES: 32, Turia: 2)
  // Statuses (manualStatus): new: 26, response_preparing: 2, response_filed: 3, under_dept_review: 0,
  // hearing_scheduled: 1, appeal_filed: 1, closed: 1, no_status: 0
  const tdsStatuses: { clientId: string; status: NoticeStatus }[] = [];
  // KARNATAKA STORES: 32 notices
  for (let i = 0; i < 25; i++) tdsStatuses.push({ clientId: 'client-karnataka-stores', status: 'new' });
  tdsStatuses.push({ clientId: 'client-karnataka-stores', status: 'response_preparing' });
  tdsStatuses.push({ clientId: 'client-karnataka-stores', status: 'response_preparing' });
  tdsStatuses.push({ clientId: 'client-karnataka-stores', status: 'response_filed' });
  tdsStatuses.push({ clientId: 'client-karnataka-stores', status: 'response_filed' });
  tdsStatuses.push({ clientId: 'client-karnataka-stores', status: 'response_filed' });
  tdsStatuses.push({ clientId: 'client-karnataka-stores', status: 'hearing_scheduled' });
  tdsStatuses.push({ clientId: 'client-karnataka-stores', status: 'closed' });
  // Turia Industries: 2 notices
  tdsStatuses.push({ clientId: 'client-turia-ind', status: 'new' });
  tdsStatuses.push({ clientId: 'client-turia-ind', status: 'appeal_filed' });

  const tdsCategories = [
    'Late Filing Fee u/s 234E',
    'Short Deduction u/s 201',
    'Interest on Late Payment u/s 201(1A)',
    'Short Payment Demand',
  ];
  const formTypes = ['24Q', '26Q', '27Q', '27EQ'];
  const periods = ['Q1', 'Q2', 'Q3', 'Q4'];

  tdsStatuses.forEach((item, idx) => {
    const notice: TdsNotice = {
      id: `notice-tds-${noticeSeq}`,
      clientId: item.clientId,
      portal: 'TDS',
      noticeNumber: buildNoticeNumber('29', noticeSeq),
      category: tdsCategories[idx % tdsCategories.length],
      period: periods[idx % periods.length],
      formType: formTypes[idx % formTypes.length],
      noticeDate: daysAgo(10 + (idx % 35)),
      portalStatus: item.status === 'closed' ? 'Processed' : 'Demand Raised',
      manualStatus: item.status,
      dueDate: null,
      description: `TRACES Default Summary Intimation for ${periods[idx % periods.length]}`,
      files: SAMPLE_FILES[idx % SAMPLE_FILES.length],
      syncedAt: daysAgoIso(2),
    };
    notices.push(notice);
    noticeSeq++;
  });

  // 3. IT Notices (16 total: KARNATAKA STORES: 15, Turia: 1)
  // Statuses (manualStatus): new: 8, response_preparing: 1, response_filed: 0, under_dept_review: 0,
  // hearing_scheduled: 1, appeal_filed: 1, closed: 5, no_status: 0
  const itStatuses: { clientId: string; status: NoticeStatus }[] = [];
  // KARNATAKA STORES: 15 notices
  for (let i = 0; i < 7; i++) itStatuses.push({ clientId: 'client-karnataka-stores', status: 'new' });
  itStatuses.push({ clientId: 'client-karnataka-stores', status: 'response_preparing' });
  itStatuses.push({ clientId: 'client-karnataka-stores', status: 'hearing_scheduled' });
  itStatuses.push({ clientId: 'client-karnataka-stores', status: 'appeal_filed' });
  for (let i = 0; i < 5; i++) itStatuses.push({ clientId: 'client-karnataka-stores', status: 'closed' });
  // Turia Industries: 1 notice
  itStatuses.push({ clientId: 'client-turia-ind', status: 'new' });

  const itCategories = [
    'Intimation u/s 143(1)(a)',
    'Notice u/s 148 (Reassessment)',
    'Notice u/s 142(1) (Inquiry)',
    'Defective Return u/s 139(9)',
  ];

  itStatuses.forEach((item, idx) => {
    const ay = `AY ${getFinancialYear(-(idx % 2))}`;
    const notice: ItNotice = {
      id: `notice-it-${noticeSeq}`,
      clientId: item.clientId,
      portal: 'IT',
      noticeNumber: buildNoticeNumber('29', noticeSeq),
      category: itCategories[idx % itCategories.length],
      periodAY: ay,
      issuedOn: daysAgo(12 + (idx % 30)),
      portalStatus: item.status === 'closed' ? 'Rectified' : 'Pending Assessee Response',
      manualStatus: item.status,
      dueDate: null,
      description: `Income Tax Department e-Filing Notice for ${ay}`,
      files: SAMPLE_FILES[idx % SAMPLE_FILES.length],
      syncedAt: daysAgoIso(2),
    };
    notices.push(notice);
    noticeSeq++;
  });

  return notices;
}
