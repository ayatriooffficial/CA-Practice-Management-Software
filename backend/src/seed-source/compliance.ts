import type {
  ComplianceCategory,
  ComplianceItem,
  ComplianceEntry,
  SyncEntitlement,
} from './types/compliance';
import type { Client } from './types/notices';
import { daysAgo, daysAgoIso, daysFromNow, getFinancialYear } from '../dates';

export const COMPLIANCE_CATEGORIES_DATA: {
  id: string;
  name: string;
  order: number;
  mode: 'auto' | 'manual';
  portal?: 'GST' | 'IT' | 'TDS';
}[] = [
  { id: 'cat-calendar', name: 'Calendar', order: 1, mode: 'manual' },
  { id: 'cat-gst', name: 'GST', order: 2, mode: 'auto', portal: 'GST' },
  { id: 'cat-tds', name: 'TDS/TCS', order: 3, mode: 'auto', portal: 'TDS' },
  { id: 'cat-it', name: 'Income Tax', order: 4, mode: 'auto', portal: 'IT' },
  { id: 'cat-adv-tax', name: 'Adv Tax', order: 5, mode: 'manual' },
  { id: 'cat-pf', name: 'PF', order: 6, mode: 'manual' },
  { id: 'cat-esi', name: 'ESI', order: 7, mode: 'manual' },
  { id: 'cat-it-comp', name: 'Income Tax Compliances', order: 8, mode: 'manual' },
  { id: 'cat-stage-1', name: 'Stage 1', order: 9, mode: 'manual' },
  {
    id: 'cat-corp-sec',
    name: 'Corporate & Secretarial Compliances',
    order: 10,
    mode: 'manual',
  },
  { id: 'cat-mgmt-cons', name: 'Management Consultancy', order: 11, mode: 'manual' },
  { id: 'cat-tds-comp', name: 'TDS Compliances', order: 12, mode: 'manual' },
  { id: 'cat-accounts', name: 'Accounts', order: 13, mode: 'manual' },
  { id: 'cat-retainer', name: 'Retainer', order: 14, mode: 'manual' },
  { id: 'cat-book-keeping', name: 'Book Keeping', order: 15, mode: 'manual' },
  { id: 'cat-labour', name: 'Labour Compliances', order: 16, mode: 'manual' },
  { id: 'cat-pune-pt', name: 'Pune PT', order: 17, mode: 'manual' },
  { id: 'cat-real-estate', name: 'Real Estate', order: 18, mode: 'manual' },
  { id: 'cat-uncat', name: 'Uncategorized', order: 19, mode: 'manual' },
  { id: 'cat-audit', name: 'Audit & Assurance', order: 20, mode: 'manual' },
  { id: 'cat-cfo', name: 'CFO Services', order: 21, mode: 'manual' },
  { id: 'cat-gst-comp', name: 'GST Compliances', order: 22, mode: 'manual' },
  { id: 'cat-payroll', name: 'Payroll', order: 23, mode: 'manual' },
  { id: 'cat-sebi', name: 'SEBI', order: 24, mode: 'manual' },
  { id: 'cat-stpi', name: 'STPI Compliances', order: 25, mode: 'manual' },
  { id: 'cat-turia-test', name: 'CA Test', order: 26, mode: 'manual' },
  { id: 'cat-logs', name: 'Logs', order: 27, mode: 'manual' },
];

export function createComplianceCategoriesSeed(): ComplianceCategory[] {
  return COMPLIANCE_CATEGORIES_DATA;
}

export function createComplianceItemsSeed(clients: Client[]): ComplianceItem[] {
  const items: ComplianceItem[] = [];
  let itemSeq = 1;

  for (const client of clients) {
    // GST items for clients with GST portal
    if (client.portals.includes('GST')) {
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-gst',
        formCode: 'GSTR1',
        label: 'GSTR-1',
        frequency: 'monthly',
        isCustom: false,
      });
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-gst',
        formCode: 'GSTR3B',
        label: 'GSTR-3B',
        frequency: 'monthly',
        isCustom: false,
      });
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-gst',
        formCode: 'GSTR5',
        label: 'GSTR-5',
        frequency: 'monthly',
        isCustom: false,
      });

      // One custom item for KARNATAKA STORES
      if (client.id === 'client-karnataka-stores') {
        items.push({
          id: `c-item-${itemSeq++}`,
          clientId: client.id,
          categoryId: 'cat-gst',
          formCode: 'GST_1_3B',
          label: 'GST 1 and 3B',
          frequency: 'monthly',
          isCustom: true,
        });
      }
    }

    // TDS items for clients with TDS portal
    if (client.portals.includes('TDS')) {
      // Payment
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-tds',
        kind: 'payment',
        formCode: 'CHALLAN_281',
        label: 'Payment',
        frequency: 'monthly',
        isCustom: false,
      });
      // Returns 24Q, 26Q, 27Q, 27EQ
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-tds',
        kind: 'return',
        formCode: 'FORM_24Q',
        label: 'Return 24Q',
        frequency: 'quarterly',
        isCustom: false,
      });
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-tds',
        kind: 'return',
        formCode: 'FORM_26Q',
        label: 'Return 26Q',
        frequency: 'quarterly',
        isCustom: false,
      });
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-tds',
        kind: 'return',
        formCode: 'FORM_27Q',
        label: 'Return 27Q',
        frequency: 'quarterly',
        isCustom: false,
      });
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-tds',
        kind: 'return',
        formCode: 'FORM_27EQ',
        label: 'Return 27EQ',
        frequency: 'quarterly',
        isCustom: false,
      });
      // Certificates 27D, 16, 16A
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-tds',
        kind: 'certificate',
        formCode: 'CERT_27D',
        label: 'Certificate 27D',
        frequency: 'quarterly',
        isCustom: false,
      });
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-tds',
        kind: 'certificate',
        formCode: 'CERT_16',
        label: 'Certificate 16',
        frequency: 'yearly',
        isCustom: false,
      });
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-tds',
        kind: 'certificate',
        formCode: 'CERT_16A',
        label: 'Certificate 16A',
        frequency: 'quarterly',
        isCustom: false,
      });
    }

    // IT items for clients with IT portal
    if (client.portals.includes('IT')) {
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-it',
        formCode: 'ITR1',
        label: 'ITR-1',
        frequency: 'yearly',
        isCustom: false,
      });
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-it',
        formCode: 'ITR2',
        label: 'ITR-2',
        frequency: 'yearly',
        isCustom: false,
      });
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: 'cat-it',
        formCode: 'ITR3',
        label: 'ITR-3',
        frequency: 'yearly',
        isCustom: false,
      });
    }
  }

  // Add 6 manual categories for 4 clients each
  const manualCategoriesConfig = [
    { catId: 'cat-accounts', formCode: 'ACC_FIN', label: 'Accounts Finalization', freq: 'monthly' as const },
    { catId: 'cat-retainer', formCode: 'RET_FEE', label: 'Monthly Retainership', freq: 'monthly' as const },
    { catId: 'cat-book-keeping', formCode: 'BK_REC', label: 'Bank Reconciliation', freq: 'monthly' as const },
    { catId: 'cat-payroll', formCode: 'PAY_RUN', label: 'Monthly Payroll Run', freq: 'monthly' as const },
    { catId: 'cat-pf', formCode: 'EPF_ECR', label: 'EPF ECR Filing', freq: 'monthly' as const },
    { catId: 'cat-esi', formCode: 'ESIC_CH', label: 'ESIC Monthly Challan', freq: 'monthly' as const },
  ];

  const targetClients = clients.slice(0, 4);
  for (const mCat of manualCategoriesConfig) {
    for (const client of targetClients) {
      items.push({
        id: `c-item-${itemSeq++}`,
        clientId: client.id,
        categoryId: mCat.catId,
        formCode: mCat.formCode,
        label: mCat.label,
        frequency: mCat.freq,
        isCustom: false,
      });
    }
  }

  return items;
}

export function createComplianceEntriesSeed(items: ComplianceItem[]): ComplianceEntry[] {
  const entries: ComplianceEntry[] = [];
  const fyPrev = getFinancialYear(-1);
  const fyCurr = getFinancialYear(0);
  const financialYears = [fyPrev, fyCurr];

  const monthlyPeriods = [
    'M04', 'M05', 'M06', 'M07', 'M08', 'M09',
    'M10', 'M11', 'M12', 'M01', 'M02', 'M03',
  ];
  const quarterlyPeriods = ['Q1', 'Q2', 'Q3', 'Q4'];
  const yearlyPeriods = ['ANNUAL'];

  let entrySeq = 1;
  let docSeq = 1;

  for (const item of items) {
    const periods =
      item.frequency === 'monthly'
        ? monthlyPeriods
        : item.frequency === 'quarterly'
        ? quarterlyPeriods
        : yearlyPeriods;

    for (const fy of financialYears) {
      const isPrev = fy === fyPrev;

      periods.forEach((periodKey, pIdx) => {
        // Leave some periods blank (e.g., every 5th slot)
        if (!isPrev && pIdx % 5 === 4) {
          return;
        }

        let filedOn: string | null = null;
        let dueDate: string;
        const documents = [];

        if (isPrev) {
          // In previous FY, mostly filed, a few missed
          if (pIdx === 2 && item.formCode === 'GSTR5') {
            // Missed
            dueDate = daysAgo(200 + pIdx * 15);
            filedOn = null;
          } else {
            // Filed
            dueDate = daysAgo(220 + pIdx * 15);
            filedOn = daysAgo(225 + pIdx * 15);
            if (pIdx % 3 === 0) {
              documents.push({
                id: `c-doc-${docSeq++}`,
                name: `${item.formCode}_${periodKey}_Receipt.pdf`,
                url: `/docs/${item.formCode}_Receipt.pdf`,
                mime: 'application/pdf',
              });
            }
          }
        } else {
          // Current FY
          if (pIdx < 4) {
            // Early months - filed
            dueDate = daysAgo(60 + pIdx * 20);
            filedOn = daysAgo(62 + pIdx * 20);
            if (pIdx % 2 === 0) {
              documents.push({
                id: `c-doc-${docSeq++}`,
                name: `${item.formCode}_${periodKey}_Ack.pdf`,
                url: `/docs/${item.formCode}_Ack.pdf`,
                mime: 'application/pdf',
              });
            }
          } else if (pIdx === 4 || pIdx === 5) {
            // Missed: dueDate in past, not filed
            dueDate = daysAgo(10 + pIdx * 2);
            filedOn = null;
          } else if (pIdx === 6) {
            // Current month (October)
            dueDate = daysAgo(2 + (entrySeq % 10));
            filedOn = entrySeq % 2 === 0 ? daysAgo(3 + (entrySeq % 10)) : null;
          } else {
            // Pending: dueDate in future, not filed
            dueDate = daysFromNow(15 + (pIdx - 5) * 20);
            filedOn = null;
          }
        }

        entries.push({
          id: `c-entry-${entrySeq++}`,
          itemId: item.id,
          fy,
          periodKey,
          dueDate,
          filedOn,
          documents,
          source: 'portal',
          syncedAt: daysAgoIso(2),
        });
      });
    }
  }

  return entries;
}

export const SEED_CREDITS = 13841;

export function createSyncEntitlementSeed(): SyncEntitlement {
  return {
    lastFreeSyncAt: daysAgoIso(5),
    cooldownDays: 14,
    plan: 'Pro',
  };
}
