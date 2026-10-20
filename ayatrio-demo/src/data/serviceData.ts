export interface Service {
  id: string;
  name: string;
  category: string;
  frequency: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Complex';
  description?: string;
  isRecurring: boolean;
  professionalFee: number;
  taxRate?: string;
  sacCode?: string;
  exemptionReason?: string;
  maxOopBudget?: number;
  tatDays?: number;
  tatHours?: string;
  note?: string;
  sop?: string;
  subTasks?: string[];
  status: 'Active' | 'Inactive' | 'Draft';
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export const SERVICE_CATEGORIES = [
  'G.S.T',
  'Income Tax',
  'R.O.C',
  'E.P.F.P',
  'E.S.I.C',
  'Audit',
  'Import Export',
  'Profession Tax',
  'Shram Suvida',
  'Trade License',
];

export const SERVICE_FREQUENCIES = [
  'Monthly',
  'Quarterly',
  'Half-Yearly',
  'Annually',
  'One-Time',
  'Weekly',
  'Bi-Weekly',
  'As-Needed',
];

export const SERVICE_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Complex'] as const;

export const TAX_RATES = ['18%', '12%', '5%', '0%', 'Exempt'];

export const EXEMPTION_REASONS = [
  'SEZ Supply',
  'Export of Services',
  'Nil Rated',
  'Government Entity',
  'Other',
];

export const INITIAL_SERVICES: Service[] = [
  {
    id: 'srv-1',
    name: 'GST Monthly Return Filing (GSTR-3B & GSTR-1)',
    category: 'G.S.T',
    frequency: 'Monthly',
    difficulty: 'Medium',
    description: 'Monthly synthesis of sales and purchase invoices, input tax credit reconciliation, tax calculation and portal filing.',
    isRecurring: true,
    professionalFee: 3500,
    taxRate: '18%',
    sacCode: '998231',
    maxOopBudget: 0,
    tatDays: 3,
    tatHours: '04:00',
    sop: 'Standard SOP v1.2',
    subTasks: [
      'Collect Sales & Purchase Invoices',
      'Download GSTR-2B Statement',
      'Perform 2B vs Purchase Reconciliation',
      'Generate Challan & File GSTR-3B',
    ],
    status: 'Active',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-04-10T14:30:00Z',
  },
  {
    id: 'srv-2',
    name: 'TDS Payment & Monthly Compliance',
    category: 'Income Tax',
    frequency: 'Monthly',
    difficulty: 'Easy',
    description: 'Monthly calculation of TDS liability under 194C, 194J, 194I, 194H and challan generation on Income Tax portal.',
    isRecurring: true,
    professionalFee: 2000,
    taxRate: '18%',
    sacCode: '998231',
    maxOopBudget: 0,
    tatDays: 2,
    tatHours: '02:00',
    sop: 'Standard SOP v1.0',
    subTasks: ['Audit Deductions in Books', 'Verify Section Applicability', 'Generate ITNS 281 Challan'],
    status: 'Active',
    createdAt: '2026-03-05T11:20:00Z',
    updatedAt: '2026-04-05T09:15:00Z',
  },
  {
    id: 'srv-3',
    name: 'Quarterly TDS Return Filing (24Q & 26Q)',
    category: 'Income Tax',
    frequency: 'Quarterly',
    difficulty: 'Medium',
    description: 'Quarterly compilation of salary (24Q) and non-salary (26Q) TDS returns with FVU validation and Traces filing.',
    isRecurring: true,
    professionalFee: 4500,
    taxRate: '18%',
    sacCode: '998231',
    maxOopBudget: 0,
    tatDays: 5,
    tatHours: '06:00',
    sop: 'Standard SOP v2.0',
    subTasks: ['Extract Challan BSR Details', 'Run CSI File Verification', 'Generate FVU File', 'Upload to Income Tax'],
    status: 'Active',
    createdAt: '2026-03-10T14:45:00Z',
    updatedAt: '2026-04-08T11:00:00Z',
  },
  {
    id: 'srv-4',
    name: 'ROC Annual Filing (AOC-4 & MGT-7)',
    category: 'R.O.C',
    frequency: 'Annually',
    difficulty: 'Hard',
    description: 'Statutory MCA filing of Balance Sheet, P&L, Board Report and Annual Return for Private Limited and Limited entities.',
    isRecurring: true,
    professionalFee: 15000,
    taxRate: '18%',
    sacCode: '998231',
    maxOopBudget: 1500,
    tatDays: 7,
    tatHours: '12:00',
    sop: 'ROC Statutory SOP v3.1',
    subTasks: [
      'Draft Director Report & Notice of AGM',
      'Prepare Form AOC-4 with Financials',
      'Prepare Form MGT-7 with Shareholding',
      'Affix DSC and Upload to MCA V3 Portal',
    ],
    status: 'Active',
    createdAt: '2026-03-15T09:15:00Z',
    updatedAt: '2026-04-12T16:20:00Z',
  },
  {
    id: 'srv-5',
    name: 'Company Incorporation (SPICe+ Part A & B)',
    category: 'R.O.C',
    frequency: 'One-Time',
    difficulty: 'Complex',
    description: 'End-to-end Private Limited Company setup including Name Reservation, MOA/AOA, PAN, TAN, EPFO, ESIC and Bank Account.',
    isRecurring: false,
    professionalFee: 12500,
    taxRate: '18%',
    sacCode: '998231',
    maxOopBudget: 2500,
    tatDays: 10,
    tatHours: '16:00',
    sop: 'MCA SPICe+ Workflow SOP',
    subTasks: [
      'Name Approval (RUN / SPICe+ Part A)',
      'Drafting MOA and AOA Charters',
      'Digital Signature Certificate (DSC) Generation',
      'Filing SPICe+ Part B, AGILE-PRO-S',
      'COI and PAN/TAN Issuance',
    ],
    status: 'Active',
    createdAt: '2026-03-20T16:00:00Z',
    updatedAt: '2026-04-14T10:45:00Z',
  },
  {
    id: 'srv-6',
    name: 'Statutory Tax Audit (Section 44AB)',
    category: 'Income Tax',
    frequency: 'Annually',
    difficulty: 'Complex',
    description: 'Comprehensive financial statement audit and Form 3CA/3CB and 3CD certification by Practicing Chartered Accountant.',
    isRecurring: true,
    professionalFee: 35000,
    taxRate: '18%',
    sacCode: '998231',
    maxOopBudget: 0,
    tatDays: 15,
    tatHours: '24:00',
    sop: 'ICAI Audit Standards SOP',
    subTasks: [
      'Audit Planning & Vouching',
      'Scrutiny of Ledger Accounts',
      'Form 3CD Annexure Preparation',
      'Partner Review and UDIN Generation',
      'Online e-Filing & Client Acceptance',
    ],
    status: 'Active',
    createdAt: '2026-03-22T08:30:00Z',
    updatedAt: '2026-04-15T13:10:00Z',
  },
  {
    id: 'srv-7',
    name: 'EPFO & ESIC Monthly Compliance',
    category: 'E.P.F.P',
    frequency: 'Monthly',
    difficulty: 'Easy',
    description: 'Monthly payroll deductions computation, ECR electronic return filing and online payment challan generation.',
    isRecurring: true,
    professionalFee: 2500,
    taxRate: '18%',
    sacCode: '998231',
    maxOopBudget: 0,
    tatDays: 2,
    tatHours: '02:00',
    sop: 'Labour Compliance SOP v1.0',
    subTasks: ['Validate Monthly Wage Sheet', 'Generate EPFO ECR Challan', 'Generate ESIC Contribution Challan'],
    status: 'Active',
    createdAt: '2026-03-25T13:40:00Z',
    updatedAt: '2026-04-11T15:25:00Z',
  },
  {
    id: 'srv-8',
    name: 'GST Annual Return & Reconciliation (GSTR-9 & 9C)',
    category: 'G.S.T',
    frequency: 'Annually',
    difficulty: 'Hard',
    description: 'Annual GST reconciliation statement and audit certificate matching audited financial statements with monthly GST returns.',
    isRecurring: true,
    professionalFee: 18000,
    taxRate: '18%',
    sacCode: '998231',
    maxOopBudget: 0,
    tatDays: 8,
    tatHours: '14:00',
    sop: 'GSTR-9 Audit SOP v2.0',
    subTasks: [
      'Download GSTR-9 Auto-Populated Tables',
      'Reconcile with Audited Financials',
      'Prepare Table 14 Differential Tax Computation',
      'Generate DRC-03 if required and File',
    ],
    status: 'Active',
    createdAt: '2026-03-28T10:10:00Z',
    updatedAt: '2026-04-16T17:00:00Z',
  },
];
