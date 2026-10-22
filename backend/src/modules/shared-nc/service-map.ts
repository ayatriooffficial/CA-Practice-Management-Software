import { Portal } from '../notice/notice.interface';
import { Frequency } from '../compliance/compliance.model';

export interface ServiceCategoryMapping {
  category: string;
  portal?: Portal;
  mode: 'auto' | 'manual';
  frequency: Frequency;
  defaultItems: { formCode: string; label: string; kind?: 'payment' | 'return' | 'certificate' }[];
}

export const KNOWN_COMPLIANCE_CATEGORIES = [
  { id: 'cat-gst', name: 'GST', order: 1, mode: 'auto' as const, portal: 'GST' as Portal },
  { id: 'cat-tds', name: 'TDS/TCS', order: 2, mode: 'auto' as const, portal: 'TDS' as Portal },
  { id: 'cat-it', name: 'Income Tax', order: 3, mode: 'auto' as const, portal: 'IT' as Portal },
  { id: 'cat-adv-tax', name: 'Adv Tax', order: 4, mode: 'manual' as const },
  { id: 'cat-pf', name: 'PF', order: 5, mode: 'manual' as const },
  { id: 'cat-esi', name: 'ESI', order: 6, mode: 'manual' as const },
  { id: 'cat-it-comp', name: 'Income Tax Compliances', order: 7, mode: 'manual' as const },
  { id: 'cat-stage-1', name: 'Stage 1', order: 8, mode: 'manual' as const },
  { id: 'cat-corp-sec', name: 'Corporate & Secretarial Compliances', order: 9, mode: 'manual' as const },
  { id: 'cat-mgmt-consult', name: 'Management Consultancy', order: 10, mode: 'manual' as const },
  { id: 'cat-tds-comp', name: 'TDS Compliances', order: 11, mode: 'manual' as const },
  { id: 'cat-accounts', name: 'Accounts', order: 12, mode: 'manual' as const },
  { id: 'cat-retainer', name: 'Retainer', order: 13, mode: 'manual' as const },
  { id: 'cat-book-keeping', name: 'Book Keeping', order: 14, mode: 'manual' as const },
  { id: 'cat-labour', name: 'Labour Compliances', order: 15, mode: 'manual' as const },
  { id: 'cat-pune-pt', name: 'Pune PT', order: 16, mode: 'manual' as const },
  { id: 'cat-real-estate', name: 'Real Estate', order: 17, mode: 'manual' as const },
  { id: 'cat-uncategorized', name: 'Uncategorized', order: 18, mode: 'manual' as const },
  { id: 'cat-audit', name: 'Audit & Assurance', order: 19, mode: 'manual' as const },
  { id: 'cat-cfo', name: 'CFO Services', order: 20, mode: 'manual' as const },
  { id: 'cat-gst-comp', name: 'GST Compliances', order: 21, mode: 'manual' as const },
  { id: 'cat-payroll', name: 'Payroll', order: 22, mode: 'manual' as const },
  { id: 'cat-sebi', name: 'SEBI', order: 23, mode: 'manual' as const },
  { id: 'cat-stpi', name: 'STPI Compliances', order: 24, mode: 'manual' as const },
  { id: 'cat-turia-test', name: 'Turia Test', order: 25, mode: 'manual' as const },
  { id: 'cat-calendar', name: 'Calendar', order: 0, mode: 'manual' as const },
  { id: 'cat-logs', name: 'Logs', order: 26, mode: 'manual' as const },
];
