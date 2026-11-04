import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Client as ClientModel } from '../modules/client/client.model';
import { NoticeModel } from '../modules/notice/notice.model';
import {
  ComplianceCategoryModel,
  ComplianceItemModel,
  ComplianceEntryModel,
} from '../modules/compliance/compliance.model';
import { logger } from '../config/logger';

interface NoticeSeedItem {
  clientIdentifier: string; // client name match substring or fileNo
  portal: 'GST' | 'IT' | 'TDS';
  noticeNumber: string;
  type?: 'Notice' | 'Appeal' | 'Order';
  category?: string;
  periodAY?: string;
  period?: string;
  formType?: string;
  noticeDate?: string;
  issuedOn?: string;
  dueDate: string | null;
  status?: string;
  manualStatus?: string;
  portalStatus?: string;
  description: string;
  fileName: string;
}

const NOTICES_TO_SEED: NoticeSeedItem[] = [
  // ==========================================
  // NOVEMBER 2026 (CURRENT MONTH) NOTICES - GST
  // ==========================================
  {
    clientIdentifier: 'ZENITH INFOTECH',
    portal: 'GST',
    noticeNumber: 'GST-ASMT-10/2026/1101',
    type: 'Notice',
    noticeDate: '2026-11-02',
    dueDate: '2026-11-22',
    status: 'new',
    description: 'Scrutiny notice under Section 61 for variance in ITC claimed in GSTR-3B vs available in GSTR-2B for Q2.',
    fileName: 'ASMT10_ITC_Mismatch_Nov2026.pdf',
  },
  {
    clientIdentifier: 'TURIA INDUSTRIES',
    portal: 'GST',
    noticeNumber: 'GST-DRC-01/2026/1105',
    type: 'Notice',
    noticeDate: '2026-11-04',
    dueDate: '2026-12-04',
    status: 'response_preparing',
    description: 'Show Cause Notice u/s 73(1) regarding tax liability discrepancy in outward supply turnover.',
    fileName: 'SCN_DRC01_Turia_Nov2026.pdf',
  },
  {
    clientIdentifier: 'APEX LOGISTICS',
    portal: 'GST',
    noticeNumber: 'GST-DRC-01A/2026/1110',
    type: 'Notice',
    noticeDate: '2026-11-08',
    dueDate: '2026-11-28',
    status: 'new',
    description: 'Intimation of tax ascertained as payable through Form DRC-01A on transport freight receipts.',
    fileName: 'DRC01A_Apex_Logistics_Nov2026.pdf',
  },
  {
    clientIdentifier: 'BLUEHORIZON HEALTHCARE',
    portal: 'GST',
    noticeNumber: 'GST-ASMT-10/2026/1115',
    type: 'Notice',
    noticeDate: '2026-11-12',
    dueDate: '2026-12-12',
    status: 'new',
    description: 'Discrepancy notice under Section 61 for e-Way bills generated vs sales turnover reported in GSTR-1.',
    fileName: 'ASMT10_Bluehorizon_Nov2026.pdf',
  },
  {
    clientIdentifier: 'KARNATAKA GENERAL TRADERS',
    portal: 'GST',
    noticeNumber: 'GST-APL-01/2026/1120',
    type: 'Appeal',
    noticeDate: '2026-11-15',
    dueDate: '2026-11-30',
    status: 'hearing_scheduled',
    description: 'Personal hearing scheduled before Joint Commissioner of Commercial Taxes (Appeals).',
    fileName: 'Hearing_Notice_KGT_Nov2026.pdf',
  },
  {
    clientIdentifier: 'PRIMEWEALTH FINANCIAL',
    portal: 'GST',
    noticeNumber: 'GST-DRC-07/2026/1125',
    type: 'Order',
    noticeDate: '2026-11-20',
    dueDate: '2026-12-20',
    status: 'closed',
    description: 'Order issued under Section 73 confirming tax liability paid and case concluded.',
    fileName: 'Order_DRC07_Primewealth_Nov2026.pdf',
  },
  {
    clientIdentifier: 'AANYA HOSPITALITY',
    portal: 'GST',
    noticeNumber: 'GST-ASMT-10/2026/1128',
    type: 'Notice',
    noticeDate: '2026-11-25',
    dueDate: '2026-12-25',
    status: 'response_filed',
    description: 'Scrutiny notice regarding ITC reversal under Rule 42/43 for banquet hall services.',
    fileName: 'ASMT10_Aanya_Nov2026.pdf',
  },

  // ==========================================
  // NOVEMBER 2026 (CURRENT MONTH) NOTICES - INCOME TAX (IT)
  // ==========================================
  {
    clientIdentifier: 'ZENITH INFOTECH',
    portal: 'IT',
    noticeNumber: 'IT-142(1)/AY2526/1102',
    category: 'Notice u/s 142(1)',
    periodAY: '2025-26',
    issuedOn: '2026-11-03',
    dueDate: '2026-11-24',
    portalStatus: 'Pending Assessee Response',
    manualStatus: 'new',
    description: 'Inquiry before assessment under Section 142(1) seeking software export invoices and foreign currency earnings.',
    fileName: 'Notice_142_1_Zenith_Nov2026.pdf',
  },
  {
    clientIdentifier: 'TURIA INDUSTRIES',
    portal: 'IT',
    noticeNumber: 'IT-143(1)/AY2526/1106',
    category: 'Intimation u/s 143(1)',
    periodAY: '2025-26',
    issuedOn: '2026-11-05',
    dueDate: '2026-12-05',
    portalStatus: 'Demand Determined',
    manualStatus: 'response_preparing',
    description: 'Prima facie tax calculation discrepancy under Section 143(1)(a). Demand determined: Rs. 64,500.',
    fileName: 'Intimation_143_1_Turia_Nov2026.pdf',
  },
  {
    clientIdentifier: 'APEX LOGISTICS',
    portal: 'IT',
    noticeNumber: 'IT-148/AY2425/1110',
    category: 'Notice u/s 148',
    periodAY: '2024-25',
    issuedOn: '2026-11-10',
    dueDate: '2026-12-10',
    portalStatus: 'Pending Assessee Response',
    manualStatus: 'new',
    description: 'Notice for income escaping assessment regarding fleet acquisition loan interest deductions.',
    fileName: 'Notice_148_Apex_Nov2026.pdf',
  },
  {
    clientIdentifier: 'BLUEHORIZON HEALTHCARE',
    portal: 'IT',
    noticeNumber: 'IT-139(9)/AY2526/1114',
    category: 'Defective Return u/s 139(9)',
    periodAY: '2025-26',
    issuedOn: '2026-11-14',
    dueDate: '2026-11-29',
    portalStatus: 'Pending Assessee Response',
    manualStatus: 'response_filed',
    description: 'Defective return intimation under Section 139(9) due to tax audit report attachment mismatch.',
    fileName: 'Defective_139_9_Bluehorizon_Nov2026.pdf',
  },
  {
    clientIdentifier: 'KARNATAKA GENERAL TRADERS',
    portal: 'IT',
    noticeNumber: 'IT-142(1)/AY2526/1118',
    category: 'Notice u/s 142(1)',
    periodAY: '2025-26',
    issuedOn: '2026-11-18',
    dueDate: '2026-12-08',
    portalStatus: 'Hearing Scheduled',
    manualStatus: 'hearing_scheduled',
    description: 'Production of books of accounts and bank statements for cash deposits exceeding threshold.',
    fileName: 'Notice_142_1_KGT_Nov2026.pdf',
  },
  {
    clientIdentifier: 'PRIMEWEALTH FINANCIAL',
    portal: 'IT',
    noticeNumber: 'IT-274/AY2425/1122',
    category: 'Penalty Notice u/s 274 r.w.s 270A',
    periodAY: '2024-25',
    issuedOn: '2026-11-22',
    dueDate: '2026-12-22',
    portalStatus: 'Pending Assessee Response',
    manualStatus: 'appeal_filed',
    description: 'Show Cause notice for levy of penalty under Section 270A for under-reporting of consulting advisory income.',
    fileName: 'Penalty_274_Primewealth_Nov2026.pdf',
  },
  {
    clientIdentifier: 'AANYA HOSPITALITY',
    portal: 'IT',
    noticeNumber: 'IT-143(1)/AY2526/1126',
    category: 'Intimation u/s 143(1)',
    periodAY: '2025-26',
    issuedOn: '2026-11-26',
    dueDate: '2026-12-26',
    portalStatus: 'Pending Assessee Response',
    manualStatus: 'new',
    description: 'Intimation u/s 143(1)(a) with prima facie adjustment of Advance Tax interest under Section 234B/C.',
    fileName: 'Intimation_143_1_Aanya_Nov2026.pdf',
  },

  // ==========================================
  // NOVEMBER 2026 (CURRENT MONTH) NOTICES - TDS
  // ==========================================
  {
    clientIdentifier: 'ZENITH INFOTECH',
    portal: 'TDS',
    noticeNumber: 'TDS-TRACES/2026/1107',
    category: 'Short Payment',
    period: 'Q2',
    formType: '26Q',
    noticeDate: '2026-11-07',
    dueDate: '2026-11-27',
    portalStatus: 'Demand Raised',
    manualStatus: 'response_preparing',
    description: 'TRACES Default Summary Intimation for Q2. Short payment under Section 201(1) of Rs. 14,200.',
    fileName: 'TRACES_Default_Zenith_Nov2026.pdf',
  },
  {
    clientIdentifier: 'TURIA INDUSTRIES',
    portal: 'TDS',
    noticeNumber: 'TDS-TRACES/2026/1116',
    category: 'Late Filing Fee u/s 234E',
    period: 'Q2',
    formType: '24Q',
    noticeDate: '2026-11-16',
    dueDate: '2026-12-06',
    portalStatus: 'Demand Raised',
    manualStatus: 'new',
    description: 'Late filing fee intimation under Section 234E for delayed submission of salary TDS Form 24Q.',
    fileName: 'TRACES_LateFee_Turia_Nov2026.pdf',
  },
  {
    clientIdentifier: 'APEX LOGISTICS',
    portal: 'TDS',
    noticeNumber: 'TDS-TRACES/2026/1121',
    category: 'Short Deduction (PAN Invalid)',
    period: 'Q2',
    formType: '26Q',
    noticeDate: '2026-11-21',
    dueDate: '2026-12-15',
    portalStatus: 'Processed',
    manualStatus: 'closed',
    description: 'Correction statement filed and short deduction cleared on TRACES portal.',
    fileName: 'TRACES_Correction_Apex_Nov2026.pdf',
  },

  // ==========================================
  // PREVIOUS MONTHS (OCT / SEP) BACKLOG
  // ==========================================
  {
    clientIdentifier: 'TURIA INDUSTRIES',
    portal: 'GST',
    noticeNumber: 'GST-ASMT-10/2026/1012',
    type: 'Notice',
    noticeDate: '2026-10-14',
    dueDate: '2026-11-14',
    status: 'response_filed',
    description: 'Scrutiny of return under Section 61. ITC reconciliation response submitted with CA certificate.',
    fileName: 'GST_ASMT10_Turia_Oct2026.pdf',
  },
  {
    clientIdentifier: 'TURIA INDUSTRIES',
    portal: 'IT',
    noticeNumber: 'IT-143(1)/AY2526/1015',
    category: 'Intimation u/s 143(1)',
    periodAY: '2025-26',
    issuedOn: '2026-10-18',
    dueDate: '2026-11-18',
    portalStatus: 'Pending Assessee Response',
    manualStatus: 'under_dept_review',
    description: 'Prima facie adjustment under Section 143(1)(a) disallowing depreciation claim.',
    fileName: 'Intimation_143_1_Turia_Oct2026.pdf',
  },
];

export async function runNoticeSeed() {
  await connectDatabase();
  logger.info('Connected to MongoDB. Starting notice & compliance calendar sync seeding...');

  const allClients = await ClientModel.find({ isDeleted: { $ne: true } });
  logger.info(`Found ${allClients.length} active clients in the database.`);

  // 1. Seed Notices
  let noticeCount = 0;
  for (const item of NOTICES_TO_SEED) {
    const matchedClient = allClients.find((c) =>
      c.name.toLowerCase().includes(item.clientIdentifier.toLowerCase()) ||
      (c.fileNo && c.fileNo.toLowerCase() === item.clientIdentifier.toLowerCase())
    );

    if (!matchedClient) {
      logger.warn(`Could not find client matching "${item.clientIdentifier}", skipping notice ${item.noticeNumber}`);
      continue;
    }

    const fileRef = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: item.fileName,
      url: `/uploads/notices/${item.fileName}`,
      mime: 'application/pdf',
    };

    const docData: Record<string, unknown> = {
      clientId: matchedClient._id,
      portal: item.portal,
      noticeNumber: item.noticeNumber,
      description: item.description,
      files: [fileRef],
      syncedAt: new Date(),
      dueDate: item.dueDate,
      isDeleted: false,
      isSeed: false,
    };

    if (item.portal === 'GST') {
      docData.type = item.type || 'Notice';
      docData.noticeDate = item.noticeDate || new Date().toISOString().split('T')[0];
      docData.status = item.status || 'new';
    } else if (item.portal === 'IT') {
      docData.category = item.category || 'Intimation u/s 143(1)';
      docData.periodAY = item.periodAY || '2025-26';
      docData.issuedOn = item.issuedOn || new Date().toISOString().split('T')[0];
      docData.portalStatus = item.portalStatus || 'Pending Assessee Response';
      docData.manualStatus = item.manualStatus || 'new';
    } else if (item.portal === 'TDS') {
      docData.category = item.category || 'Short Payment';
      docData.period = item.period || 'Q2';
      docData.formType = item.formType || '26Q';
      docData.noticeDate = item.noticeDate || new Date().toISOString().split('T')[0];
      docData.portalStatus = item.portalStatus || 'Demand Raised';
      docData.manualStatus = item.manualStatus || 'new';
    }

    await NoticeModel.findOneAndUpdate(
      { clientId: matchedClient._id, portal: item.portal, noticeNumber: item.noticeNumber },
      docData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    noticeCount++;
  }
  logger.info(`✅ Seeded ${noticeCount} notices across GST, IT, and TDS for November & surrounding months.`);

  // 2. Ensure Compliance Items exist for CLT-001 through CLT-006
  const targetClients = allClients.filter(c =>
    c.name.includes('ZENITH') ||
    c.name.includes('TURIA') ||
    c.name.includes('APEX LOGISTICS') ||
    c.name.includes('BLUEHORIZON') ||
    c.name.includes('KARNATAKA GENERAL') ||
    c.name.includes('PRIMEWEALTH') ||
    c.name.includes('AANYA') ||
    c.name.includes('M.K.RETAIL')
  );

  const STANDARD_ITEMS = [
    { categoryId: 'cat-gst', formCode: 'GSTR-1', label: 'GSTR-1 (Outward Supplies)', kind: 'return', frequency: 'monthly' },
    { categoryId: 'cat-gst', formCode: 'GSTR-3B', label: 'GSTR-3B (Summary Return)', kind: 'return', frequency: 'monthly' },
    { categoryId: 'cat-tds', formCode: 'CHALLAN-281', label: 'TDS Payment (Challan 281)', kind: 'payment', frequency: 'monthly' },
    { categoryId: 'cat-tds', formCode: 'FORM-26Q', label: 'Quarterly TDS (Form 26Q)', kind: 'return', frequency: 'quarterly' },
    { categoryId: 'cat-it', formCode: 'ITR-6', label: 'ITR-6 (Corporate Return)', kind: 'return', frequency: 'yearly' },
    { categoryId: 'cat-it', formCode: 'FORM-3CD', label: 'Tax Audit (Section 44AB)', kind: 'return', frequency: 'yearly' },
  ];

  let itemCreatedCount = 0;
  let entryCreatedCount = 0;

  for (const client of targetClients) {
    const pan = client.pan || '';
    const statutoryGstin = client.customerFiles?.statutory?.find((s: any) => s.type === 'GSTIN')?.idNo || '';
    const state = client.state || 'Karnataka';

    for (const std of STANDARD_ITEMS) {
      const itemDoc = await ComplianceItemModel.findOneAndUpdate(
        { clientId: client._id, categoryId: std.categoryId, formCode: std.formCode },
        {
          clientId: client._id,
          categoryId: std.categoryId,
          formCode: std.formCode,
          label: std.label,
          kind: std.kind,
          frequency: std.frequency,
          identifier: std.categoryId === 'cat-gst' ? statutoryGstin : pan,
          state,
          isCustom: false,
          isSeed: true,
          isDeleted: false,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      itemCreatedCount++;

      // 3. Create Compliance Entries for November 2026 and surrounding months
      // November 2026 due dates:
      // - CHALLAN-281: 2026-11-07
      // - GSTR-1:      2026-11-11
      // - FORM-26Q:    2026-11-15 (Q2 certificate)
      // - GSTR-3B:     2026-11-20
      // - FORM-3CD:    2026-11-30
      const entriesToCreate = [];

      if (std.formCode === 'CHALLAN-281') {
        entriesToCreate.push({
          periodKey: 'M07',
          dueDate: '2026-11-07',
          filedOn: '2026-11-06',
          statusOverride: 'filed' as const,
        });
      } else if (std.formCode === 'GSTR-1') {
        entriesToCreate.push({
          periodKey: 'M07',
          dueDate: '2026-11-11',
          filedOn: null,
          statusOverride: 'pending' as const,
        });
      } else if (std.formCode === 'FORM-26Q') {
        entriesToCreate.push({
          periodKey: 'Q2',
          dueDate: '2026-11-15',
          filedOn: '2026-11-12',
          statusOverride: 'filed' as const,
        });
      } else if (std.formCode === 'GSTR-3B') {
        entriesToCreate.push({
          periodKey: 'M07',
          dueDate: '2026-11-20',
          filedOn: null,
          statusOverride: 'pending' as const,
        });
      } else if (std.formCode === 'FORM-3CD') {
        entriesToCreate.push({
          periodKey: 'Annual',
          dueDate: '2026-11-30',
          filedOn: null,
          statusOverride: 'pending' as const,
        });
      }

      for (const entryDef of entriesToCreate) {
        await ComplianceEntryModel.findOneAndUpdate(
          { itemId: itemDoc._id, fy: 'FY 2026-2027', periodKey: entryDef.periodKey },
          {
            itemId: itemDoc._id,
            fy: 'FY 2026-2027',
            periodKey: entryDef.periodKey,
            dueDate: entryDef.dueDate,
            filedOn: entryDef.filedOn,
            statusOverride: entryDef.statusOverride,
            documents: [
              {
                id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                name: `${std.formCode}_Filing_${entryDef.periodKey}.pdf`,
                url: `/uploads/compliance/${std.formCode}_${entryDef.periodKey}.pdf`,
                mime: 'application/pdf',
              },
            ],
            source: 'portal',
            syncedAt: new Date(),
            isDeleted: false,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        entryCreatedCount++;
      }
    }
  }

  logger.info(`✅ Seeded ${itemCreatedCount} compliance items and ${entryCreatedCount} compliance calendar entries for November 2026.`);
  await disconnectDatabase();
}

if (require.main === module) {
  runNoticeSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Error seeding notices and compliance:', err);
      process.exit(1);
    });
}
