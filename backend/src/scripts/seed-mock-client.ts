import { Types } from 'mongoose';
import { logger } from '../config/logger';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Client as ClientModel } from '../modules/client/client.model';
import { Task as TaskModel } from '../modules/task/task.model';
import { NoticeModel } from '../modules/notice/notice.model';
import {
  PortalSyncStateModel,
  PracticeSettingModel,
  SyncJobModel,
} from '../modules/sync/sync.model';
import {
  ComplianceCategoryModel,
  ComplianceItemModel,
  ComplianceEntryModel,
} from '../modules/compliance/compliance.model';
import { KNOWN_COMPLIANCE_CATEGORIES } from '../modules/shared-nc/service-map';

export async function createMockClient() {
  await connectDatabase();
  logger.info('Connected to MongoDB. Starting database reset for single mock client...');

  const DEFAULT_ORG_ID = '6ad9e23bf460aa2e6102c0c6';
  const DEFAULT_USER_ID = '6ad9e23bf460aa2e6102c0c8';

  // 1. Remove seed notices and compliances completely
  logger.info('Purging all notices, compliance items, and compliance entries...');
  await NoticeModel.deleteMany({});
  await ComplianceEntryModel.deleteMany({});
  await ComplianceItemModel.deleteMany({});
  await PortalSyncStateModel.deleteMany({});
  await SyncJobModel.deleteMany({});

  // 2. Remove all old demo seed clients
  logger.info('Purging old demo seed clients...');
  await ClientModel.deleteMany({
    $or: [
      { fileNo: { $regex: /^SEED-/ } },
      { tags: 'demo-seed' },
      { name: { $ne: 'ZENITH INFOTECH SOLUTIONS PRIVATE LIMITED' } },
    ],
  });

  // 3. Upsert Practice Settings
  await PracticeSettingModel.findOneAndUpdate(
    { key: 'default' },
    {
      key: 'default',
      credits: 13841,
      lastFreeSyncAt: new Date(),
      cooldownDays: 7,
      plan: 'Professional',
      isSeed: false,
      isDeleted: false,
    },
    { upsert: true, new: true }
  );

  // 4. Ensure All 27 Compliance Categories are present
  logger.info('Ensuring compliance categories...');
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

  // 5. Create or Upsert Single Mock Client
  const clientName = 'ZENITH INFOTECH SOLUTIONS PRIVATE LIMITED';
  const fileNo = 'CLT-2026-MOCK';
  const pan = 'AABCZ9876K';

  logger.info(`Creating single mock client: ${clientName} (${fileNo})...`);

  const clientPayload = {
    name: clientName,
    legalName: clientName,
    fileNo: fileNo,
    type: 'private-limited',
    mobile: '9845012345',
    secondaryMobile: '9845067890',
    email: 'accounts@zenithinfotech.io',
    address: 'Tower B, 4th Floor, Global Tech Park, Outer Ring Road, Bellandur',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560103',
    group: 'Corporate Clients',
    tags: ['VIP Client', 'Monthly Retainer', 'Full Audit', 'Active'],
    active: true,
    status: 'Active',
    services: [
      'GST Monthly Compliance',
      'Income Tax Advisory & Audit',
      'TDS Quarterly Filing',
      'MCA Annual Return',
      'Transfer Pricing',
    ],
    users: ['Admin', 'Rahul Sharma', 'Ananya Roy'],
    pan: pan,
    dob: '2019-06-18',
    referredBy: 'Direct Partner Referral',
    orgId: DEFAULT_ORG_ID,
    userId: DEFAULT_USER_ID,
    createdBy: DEFAULT_USER_ID,
    customerFiles: {
      promoter: [
        {
          key: 1,
          name: 'Rajesh Verma',
          pan: 'ABCDE1234F',
          share: '65%',
          designation: 'Managing Director',
          mcaId: 'DIN-07823901',
        },
        {
          key: 2,
          name: 'Priya Nambiar',
          pan: 'FGHIJ5678K',
          share: '35%',
          designation: 'Whole-Time Director & CFO',
          mcaId: 'DIN-08912344',
        },
      ],
      statutory: [
        {
          key: 1,
          type: 'GSTIN',
          idNo: '29AABCZ9876K1Z8',
          userId: 'zenith_gst_admin',
        },
        {
          key: 2,
          type: 'PAN',
          idNo: pan,
          userId: 'zenith_incometax',
        },
        {
          key: 3,
          type: 'TAN',
          idNo: 'BLRZ09876F',
          userId: 'zenith_tan_traces',
        },
        {
          key: 4,
          type: 'CIN',
          idNo: 'U72900KA2019PTC125890',
          userId: 'zenith_mca_user',
        },
        {
          key: 5,
          type: 'PF Code',
          idNo: 'KN/BNG/0045892/000',
          userId: 'zenith_epfo',
        },
        {
          key: 6,
          type: 'ESIC Code',
          idNo: '53000892340001001',
          userId: 'zenith_esic',
        },
      ],
      recurring: [
        {
          key: 1,
          category: 'GST',
          service: 'Monthly GSTR-1 & GSTR-3B Return Filing',
          tariff: '12000.00',
        },
        {
          key: 2,
          category: 'TDS',
          service: 'Quarterly 24Q (Salary) & 26Q (Non-Salary) Filing',
          tariff: '8500.00',
        },
        {
          key: 3,
          category: 'Income Tax',
          service: 'Corporate Advance Tax Computations & Form 29B MAT',
          tariff: '25000.00',
        },
        {
          key: 4,
          category: 'ROC / MCA',
          service: 'Annual Return AOC-4 (XBRL) & MGT-7 Compliance',
          tariff: '20000.00',
        },
      ],
    },
    licenses: [
      {
        id: 'lic-01',
        name: 'Shop & Commercial Establishment Act',
        licenseNo: 'KAR/BLR/EST/2019/55490',
        issuedDate: '2019-07-01',
        expiryDate: '2029-06-30',
        url: 'https://ekarmika.karnataka.gov.in',
        remarks: 'Registered with Karnataka Labour Dept (Renewed 10 Yrs)',
      },
      {
        id: 'lic-02',
        name: 'MSME Udyam Registration',
        licenseNo: 'UDYAM-KR-03-0098765',
        issuedDate: '2020-11-15',
        expiryDate: 'Permanent',
        url: 'https://udyamregistration.gov.in',
        remarks: 'Medium Enterprise Category - Software Services',
      },
      {
        id: 'lic-03',
        name: 'Import Export Code (IEC)',
        licenseNo: pan,
        issuedDate: '2021-01-20',
        expiryDate: 'Permanent',
        url: 'https://www.dgft.gov.in',
        remarks: 'Software Export & IT Enabled Services (DGFT)',
      },
      {
        id: 'lic-04',
        name: 'Karnataka Professional Tax (PTRC & PTEC)',
        licenseNo: '2938472910',
        issuedDate: '2019-08-10',
        expiryDate: 'Permanent',
        url: '',
        remarks: 'Karnataka Commercial Tax Dept (Active)',
      },
    ],
    dscs: [
      {
        id: 'dsc-01',
        dscId: 'DSC-7710',
        name: 'Rajesh Verma',
        issuedDate: '2025-01-10',
        expiryDate: '2027-01-09',
        binNumber: 'BIN-A101',
        vendor: 'eMudhra',
        class: 'Class 3 - Combo (Signing + Encryption)',
        location: 'CA Office',
        status: 'Active',
        remarks: 'Vault Key B-2, USB Token Serial #294819',
      },
      {
        id: 'dsc-02',
        dscId: 'DSC-7711',
        name: 'Priya Nambiar',
        issuedDate: '2024-03-15',
        expiryDate: '2026-03-14',
        binNumber: 'BIN-B202',
        vendor: 'Vsign',
        class: 'Class 3 - Signing Only',
        location: 'Client Office',
        status: 'Active',
        remarks: 'Authorized signatory for EPFO and banking mandates',
      },
    ],
    documentsInOut: [
      {
        id: 'doc-01',
        documentName: 'Original Commercial Lease Agreement & Building Fire NOC',
        personName: 'Kavita Sharma (Finance Lead)',
        date: '2026-02-10',
        status: 'In',
        returnable: true,
        returnDate: '2026-05-30',
        remarks: 'Safekeeping for STPI Registration and Banker inspection',
      },
      {
        id: 'doc-02',
        documentName: 'FY 2024-25 Physical General Ledgers & Tax Invoices Vol 1-4',
        personName: 'Arun Nayak (Senior Auditor)',
        date: '2026-03-01',
        status: 'Out',
        returnable: true,
        returnDate: '2026-04-15',
        remarks: 'Out for statutory audit branch sampling review',
      },
      {
        id: 'doc-03',
        documentName: 'Original Share Certificates (Vol I & II) & Statutory Registers',
        personName: 'Rajesh Verma (MD)',
        date: '2026-01-05',
        status: 'In',
        returnable: false,
        remarks: 'Permanent custody in CA firm master locker #4',
      },
    ],
    passwords: [
      {
        id: 'pwd-01',
        portal: 'GST Portal',
        userId: '29AABCZ9876K1Z8',
        password: 'GstMaster2026!#',
        url: 'https://services.gst.gov.in',
        remarks: 'Primary GSTR filing account (Authorized: Rajesh Verma)',
      },
      {
        id: 'pwd-02',
        portal: 'Income Tax e-Filing',
        userId: pan,
        password: 'ITaxApex$9900',
        url: 'https://eportal.incometax.gov.in',
        remarks: 'Linked with Digital Signature Token #294819',
      },
      {
        id: 'pwd-03',
        portal: 'MCA V3 Portal',
        userId: 'ZENITH_CORP_DIR',
        password: 'McaV3Secret@2026',
        url: 'https://www.mca.gov.in',
        remarks: 'Company Officer V3 profile for e-form filings',
      },
      {
        id: 'pwd-04',
        portal: 'TRACES TDS Portal',
        userId: 'BLRZ09876F',
        password: 'TracesSecret#88',
        url: 'https://www.tdscpc.gov.in',
        remarks: 'Deductor login for Form 16 / 16A generation',
      },
      {
        id: 'pwd-05',
        portal: 'EPFO Employer Portal',
        userId: 'KNBNG0045892',
        password: 'EpfoSecure$2026',
        url: 'https://unifiedportal-emp.epfindia.gov.in',
        remarks: 'Monthly ECR challan filing desk',
      },
    ],
    notes: [
      {
        id: 'note-01',
        title: 'FY 2025-26 Tax Planning & Capital Goods ITC Admissibility',
        content:
          'Client acquired high-end servers & networking racks worth INR 65 Lakhs in Q3. Ensure 100% CGST/SGST ITC eligibility under Section 16 CGST Act and verify that no depreciation is double-claimed under Section 32 of Income Tax Act.',
        author: 'Rahul Sharma (Partner)',
        createdAt: '2026-03-10T10:30:00.000Z',
      },
      {
        id: 'note-02',
        title: 'Cross-Border SaaS Royalty Withholding Under Section 195',
        content:
          'Client remittances to Singapore affiliate for cloud infra reviewed. Tax Residency Certificate (TRC) and Form 10F obtained to avail DTAA 10% beneficial rate.',
        author: 'Ananya Roy (Tax Lead)',
        createdAt: '2026-02-20T14:15:00.000Z',
      },
      {
        id: 'note-03',
        title: 'Annual Board Meeting & Shareholder Compliances',
        content:
          'AGM notice draft approved. Final financial statements with Statutory Auditor Report to be dispatched 21 clear days before scheduled meeting.',
        author: 'Corporate Secretarial Team',
        createdAt: '2026-01-15T09:00:00.000Z',
      },
    ],
    serviceSettings: [
      {
        id: 'srv-01',
        serviceId: 'srv_gst_monthly',
        serviceName: 'GST Monthly Compliance (GSTR-1 & 3B)',
        category: 'GST',
        compliance: true,
        recTask: 'Enabled',
        recInvoice: 'Enabled',
        frequency: 'Monthly',
        start: '2026-04-01',
        target: '20th of every month',
        end: '2027-03-31',
        invFreq: 'Monthly',
        amount: 12000,
      },
      {
        id: 'srv-02',
        serviceId: 'srv_tds_qtr',
        serviceName: 'Quarterly TDS Filing (24Q / 26Q)',
        category: 'TDS',
        compliance: true,
        recTask: 'Enabled',
        recInvoice: 'Enabled',
        frequency: 'Quarterly',
        start: '2026-04-01',
        target: '31st of following month',
        end: '2027-03-31',
        invFreq: 'Quarterly',
        amount: 8500,
      },
      {
        id: 'srv-03',
        serviceId: 'srv_it_adv',
        serviceName: 'Corporate Advance Tax & Income Tax Audit (3CD)',
        category: 'Income Tax',
        compliance: true,
        recTask: 'Enabled',
        recInvoice: 'Disabled',
        frequency: 'Quarterly',
        start: '2026-04-01',
        target: '15th Jun/Sep/Dec/Mar',
        end: '2027-03-31',
        invFreq: 'Annual',
        amount: 35000,
      },
      {
        id: 'srv-04',
        serviceId: 'srv_roc_mca',
        serviceName: 'ROC Annual Compliances (AOC-4 & MGT-7)',
        category: 'ROC / MCA',
        compliance: true,
        recTask: 'Enabled',
        recInvoice: 'Enabled',
        frequency: 'Annually',
        start: '2026-04-01',
        target: '30th October',
        end: '2027-03-31',
        invFreq: 'Annual',
        amount: 20000,
      },
    ],
    isDeleted: false,
  };

  const clientDoc = await ClientModel.findOneAndUpdate(
    { fileNo: fileNo },
    clientPayload,
    { upsert: true, new: true }
  );

  const clientId = clientDoc._id as Types.ObjectId;
  logger.info(`Single mock client upserted with ID: ${clientId}`);

  // 6. Linked PortalSyncState entries
  const portals = ['GST', 'IT', 'TDS', 'MCA'];
  for (const p of portals) {
    await PortalSyncStateModel.findOneAndUpdate(
      { clientId: clientId, portal: p },
      {
        clientId: clientId,
        portal: p,
        status: 'synced',
        errorMessage: '',
        lastSyncAt: new Date(),
        hasCredentials: true,
        isSeed: false,
        isDeleted: false,
      },
      { upsert: true }
    );
  }

  // 7. Delete old tasks and create 3 fresh tasks for this client
  await TaskModel.deleteMany({});
  const tasks = [
    {
      taskId: 'TSK-2026-0091',
      taskName: 'GSTR-3B Monthly Return Filing - March 2026',
      clientId: clientId.toString(),
      clientName: clientName,
      clientFileNo: fileNo,
      clientPan: pan,
      legalName: clientName,
      serviceName: 'GST Monthly Compliance (GSTR-1 & 3B)',
      frequency: 'Monthly',
      period: 'Mar 2026',
      financialYear: 'FY 2025 - 2026',
      department: 'GST',
      orgId: DEFAULT_ORG_ID,
      userId: DEFAULT_USER_ID,
      createdBy: DEFAULT_USER_ID,
      assigneeName: 'Vikram Adve',
      assigneeInitials: 'VA',
      assigneeColor: '#8B5CF6',
      reviewerName: 'Rahul Sharma (Partner)',
      priority: 'High',
      status: 'In Progress',
      dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      startDate: new Date(),
      estimatedHours: '04:00',
      description:
        'Reconcile purchase register with GSTR-2B, calculate RCM liability, and file GSTR-3B with DSC.',
      checklist: [
        {
          id: 'chk-1',
          title: 'Download GSTR-2B JSON and reconcile 2B vs books',
          completed: true,
          isMandatory: true,
        },
        {
          id: 'chk-2',
          title: 'Verify Reverse Charge (RCM) on advocate fees & rent',
          completed: true,
          isMandatory: true,
        },
        {
          id: 'chk-3',
          title: 'Compute net cash tax liability in Form GST PMT-06',
          completed: false,
          isMandatory: true,
        },
        {
          id: 'chk-4',
          title: 'Offset liability and file return using authorized signatory DSC',
          completed: false,
          isMandatory: true,
        },
      ],
      documentRequests: [
        {
          id: 'dreq-1',
          title: 'March 2026 Sales & Purchase Register with Debit/Credit Notes',
          description: 'Excel or Tally export of all B2B/B2C invoices',
          status: 'Received',
          isMandatory: true,
          fileUrl: '/uploads/march-2026-purchase-register.xlsx',
          receivedAt: new Date(),
        },
        {
          id: 'dreq-2',
          title: 'Bank Statement showing advance tax & RCM challan payments',
          description: 'HDFC Current Account statement for March',
          status: 'Pending',
          isMandatory: true,
        },
      ],
      comments: [
        {
          id: 'comm-1',
          author: 'Vikram Adve',
          authorInitials: 'VA',
          avatarColor: '#8B5CF6',
          text: 'Books reconciliation completed. ₹42,500 ITC difference identified in vendor invoice #V-990.',
          createdAt: new Date(),
        },
      ],
      complianceStatus: {
        period: 'Mar 2026',
        dueDate: '20 Apr, 2026',
        status: 'Pending',
        filedDate: '—',
        referenceNo: '—',
        attachmentsCount: 1,
      },
      isDeleted: false,
    },
    {
      taskId: 'TSK-2026-0092',
      taskName: 'Corporate Tax Audit Form 3CD Preparation & Verification',
      clientId: clientId.toString(),
      clientName: clientName,
      clientFileNo: fileNo,
      clientPan: pan,
      legalName: clientName,
      serviceName: 'Corporate Advance Tax & Income Tax Audit (3CD)',
      frequency: 'Annually',
      period: 'AY 2026-27',
      financialYear: 'FY 2025 - 2026',
      department: 'Income Tax',
      orgId: DEFAULT_ORG_ID,
      userId: DEFAULT_USER_ID,
      createdBy: DEFAULT_USER_ID,
      assigneeName: 'Ananya Roy',
      assigneeInitials: 'AR',
      assigneeColor: '#10B981',
      reviewerName: 'Rahul Sharma (Partner)',
      priority: 'Urgent',
      status: 'Review',
      dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000),
      startDate: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      estimatedHours: '20:00',
      description:
        'Clause-by-clause audit verification under Section 44AB of the Income Tax Act, 1961.',
      checklist: [
        {
          id: 'chk-5',
          title: 'Verify Section 43B statutory dues paid on or before due date',
          completed: true,
          isMandatory: true,
        },
        {
          id: 'chk-6',
          title: 'Examine Section 40A(2)(b) payments to directors & relatives',
          completed: true,
          isMandatory: true,
        },
        {
          id: 'chk-7',
          title: 'Verify TDS deductions & deposits under Chapter XVII-B',
          completed: true,
          isMandatory: true,
        },
        {
          id: 'chk-8',
          title: 'Cross-check quantitative inventory details under Clause 35',
          completed: false,
          isMandatory: false,
        },
      ],
      documentRequests: [
        {
          id: 'dreq-3',
          title: 'Signed Financial Statements (Balance Sheet, P&L, Notes)',
          description: 'Audited draft approved by board',
          status: 'Received',
          isMandatory: true,
          fileUrl: '/uploads/zenith-signed-fs-2026.pdf',
          receivedAt: new Date(),
        },
      ],
      comments: [
        {
          id: 'comm-2',
          author: 'Ananya Roy',
          authorInitials: 'AR',
          avatarColor: '#10B981',
          text: 'Clause 34 TDS compliance verification completed with zero disallowances.',
          createdAt: new Date(),
        },
      ],
      complianceStatus: {
        period: 'AY 2026-27',
        dueDate: '30 Sep, 2026',
        status: 'Compliant',
        filedDate: '—',
        referenceNo: '—',
        attachmentsCount: 2,
      },
      isDeleted: false,
    },
    {
      taskId: 'TSK-2026-0093',
      taskName: 'Quarterly TDS Return Filing (Form 26Q & Form 24Q)',
      clientId: clientId.toString(),
      clientName: clientName,
      clientFileNo: fileNo,
      clientPan: pan,
      legalName: clientName,
      serviceName: 'Quarterly TDS Filing (24Q / 26Q)',
      frequency: 'Quarterly',
      period: 'Q4 FY 25-26',
      financialYear: 'FY 2025 - 2026',
      department: 'TDS',
      orgId: DEFAULT_ORG_ID,
      userId: DEFAULT_USER_ID,
      createdBy: DEFAULT_USER_ID,
      assigneeName: 'Suresh Rao',
      assigneeInitials: 'SR',
      assigneeColor: '#F59E0B',
      reviewerName: 'Ananya Roy',
      priority: 'Medium',
      status: 'Completed',
      dueDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      startDate: new Date(Date.now() - 12 * 24 * 3600 * 1000),
      estimatedHours: '06:00',
      description: 'Prepare FVU file, validate CSI file from NSDL, and file returns.',
      checklist: [
        {
          id: 'chk-9',
          title: 'Download and validate Challan Status Inquiry (.csi) file',
          completed: true,
          isMandatory: true,
        },
        {
          id: 'chk-10',
          title: 'Generate .fvu text file using latest NSDL FVU utility',
          completed: true,
          isMandatory: true,
        },
        {
          id: 'chk-11',
          title: 'Upload to TRACES e-filing portal & obtain provisional receipt',
          completed: true,
          isMandatory: true,
        },
      ],
      documentRequests: [
        {
          id: 'dreq-4',
          title: 'Q4 Salary Sheet with TDS Deduction Breakup',
          description: 'Payroll team reconciliation',
          status: 'Received',
          isMandatory: true,
          fileUrl: '/uploads/q4-salary-tds.xlsx',
          receivedAt: new Date(),
        },
      ],
      comments: [
        {
          id: 'comm-3',
          author: 'Suresh Rao',
          authorInitials: 'SR',
          avatarColor: '#F59E0B',
          text: 'Filing successful. Provisional receipt number 0400192839 issued.',
          createdAt: new Date(),
        },
      ],
      complianceStatus: {
        period: 'Q4 FY 25-26',
        dueDate: '31 May, 2026',
        status: 'Filed',
        filedDate: '18 Apr, 2026',
        referenceNo: 'PR-0400192839',
        attachmentsCount: 1,
      },
      isDeleted: false,
    },
  ];

  for (const t of tasks) {
    await TaskModel.findOneAndUpdate({ taskId: t.taskId }, t, { upsert: true });
  }
  logger.info(`Seeded 3 tasks for ${clientName}`);

  // 8. Create exactly 5 Notices for this client (2 GST, 2 TDS, 1 IT)
  const notices = [
    {
      clientId: clientId,
      portal: 'GST',
      noticeNumber: 'GST-ASMT-10/2026/0941',
      type: 'Notice',
      noticeDate: '2026-03-05',
      dueDate: '2026-04-04',
      status: 'response_preparing',
      description:
        'Discrepancy observed between ITC claimed in GSTR-3B vs ITC available in auto-drafted GSTR-2B for FY 2024-25.',
      files: [
        {
          id: 'f-01',
          name: 'ASMT10_Notice_Zenith.pdf',
          url: '/uploads/notices/ASMT10_Zenith.pdf',
          mime: 'application/pdf',
        },
      ],
      syncedAt: new Date(),
      isSeed: false,
      isDeleted: false,
    },
    {
      clientId: clientId,
      portal: 'GST',
      noticeNumber: 'GST-DRC-01A/2026/0188',
      type: 'Order',
      noticeDate: '2026-02-20',
      dueDate: '2026-04-30',
      status: 'new',
      description:
        'Intimation of tax ascertained as being payable under Section 73(5) in Form GST DRC-01A.',
      files: [
        {
          id: 'f-02',
          name: 'DRC01A_Intimation_Zenith.pdf',
          url: '/uploads/notices/DRC01A_Zenith.pdf',
          mime: 'application/pdf',
        },
      ],
      syncedAt: new Date(),
      isSeed: false,
      isDeleted: false,
    },
    {
      clientId: clientId,
      portal: 'TDS',
      noticeNumber: 'TDS-JUST-201/26Q/8892',
      category: 'Short Deduction u/s 201',
      period: 'Q3 2025-26',
      formType: '26Q',
      noticeDate: '2026-02-15',
      dueDate: '2026-05-15',
      portalStatus: 'Demand Outstanding',
      manualStatus: 'response_preparing',
      description:
        'TRACES Justification report generated for short deduction on 194C contract payments.',
      files: [
        {
          id: 'f-03',
          name: 'TRACES_Justification_Q3.pdf',
          url: '/uploads/notices/TRACES_Q3.pdf',
          mime: 'application/pdf',
        },
      ],
      syncedAt: new Date(),
      isSeed: false,
      isDeleted: false,
    },
    {
      clientId: clientId,
      portal: 'TDS',
      noticeNumber: 'TDS-LATE-234E/24Q/3391',
      category: 'Late Filing Fee u/s 234E',
      period: 'Q2 2025-26',
      formType: '24Q',
      noticeDate: '2026-01-10',
      dueDate: '2026-03-31',
      portalStatus: 'Fee Processed',
      manualStatus: 'closed',
      description:
        'Demand notice for late fee under Section 234E for Salary return Form 24Q.',
      files: [
        {
          id: 'f-04',
          name: 'Sec234E_Intimation.pdf',
          url: '/uploads/notices/Sec234E.pdf',
          mime: 'application/pdf',
        },
      ],
      syncedAt: new Date(),
      isSeed: false,
      isDeleted: false,
    },
    {
      clientId: clientId,
      portal: 'IT',
      noticeNumber: 'IT-143(1)/AY2526/882190',
      category: 'Intimation u/s 143(1)',
      periodAY: '2025-26',
      issuedOn: '2026-02-12',
      dueDate: '2026-04-30',
      portalStatus: 'Demand Determined',
      manualStatus: 'under_dept_review',
      description:
        'Prima facie adjustment made for TDS mismatch under Section 143(1)(a). Rectification application in progress.',
      files: [
        {
          id: 'f-05',
          name: 'Intimation_143_1_Zenith.pdf',
          url: '/uploads/notices/Intimation_143_1.pdf',
          mime: 'application/pdf',
        },
      ],
      syncedAt: new Date(),
      isSeed: false,
      isDeleted: false,
    },
  ];

  for (const n of notices) {
    await NoticeModel.findOneAndUpdate(
      { clientId: clientId, portal: n.portal, noticeNumber: n.noticeNumber },
      n,
      { upsert: true }
    );
  }
  logger.info(`Seeded exactly ${notices.length} notices for ${clientName}`);

  // 9. Create 5 Compliance Items (2 GST, 2 TDS, 1 IT) with at max 5 period records
  const complianceItems = [
    {
      clientId: clientId,
      categoryId: 'cat-gst',
      identifier: '29AABCZ9876K1Z8',
      state: 'Karnataka',
      formCode: 'GSTR-1',
      label: 'Monthly Statement of Outward Supplies (GSTR-1)',
      kind: 'returns',
      frequency: 'monthly',
      isCustom: false,
      isSeed: false,
      isDeleted: false,
    },
    {
      clientId: clientId,
      categoryId: 'cat-gst',
      identifier: '29AABCZ9876K1Z8',
      state: 'Karnataka',
      formCode: 'GSTR-3B',
      label: 'Monthly Summary Return & Tax Payment (GSTR-3B)',
      kind: 'returns',
      frequency: 'monthly',
      isCustom: false,
      isSeed: false,
      isDeleted: false,
    },
    {
      clientId: clientId,
      categoryId: 'cat-tds',
      identifier: 'BLRZ09876F',
      state: 'Karnataka',
      formCode: '24Q',
      label: 'Quarterly Return of TDS from Salary (Form 24Q)',
      kind: 'returns',
      frequency: 'quarterly',
      isCustom: false,
      isSeed: false,
      isDeleted: false,
    },
    {
      clientId: clientId,
      categoryId: 'cat-tds',
      identifier: 'BLRZ09876F',
      state: 'Karnataka',
      formCode: '26Q',
      label: 'Quarterly Return of TDS on Other than Salary (Form 26Q)',
      kind: 'returns',
      frequency: 'quarterly',
      isCustom: false,
      isSeed: false,
      isDeleted: false,
    },
    {
      clientId: clientId,
      categoryId: 'cat-it',
      identifier: pan,
      state: 'Karnataka',
      formCode: 'ITR-6',
      label: 'Annual Income Tax Return for Companies (ITR-6)',
      kind: 'returns',
      frequency: 'annual',
      isCustom: false,
      isSeed: false,
      isDeleted: false,
    },
  ];

  for (const item of complianceItems) {
    const itemDoc = await ComplianceItemModel.findOneAndUpdate(
      { clientId: clientId, categoryId: item.categoryId, formCode: item.formCode },
      item,
      { upsert: true, new: true }
    );

    const mongoItemId = itemDoc._id as Types.ObjectId;

    // Seed at max 5 period records per item matching grid columns
    const fys = ['2025-26', '2026-27'];
    for (const fy of fys) {
      if (item.frequency === 'monthly') {
        // 5 periods: M10, M11, M12, M01, M02 (max 5 records)
        const months = [
          { key: 'M10', due: '2025-10-20', filed: '2025-10-18', name: 'OCT' },
          { key: 'M11', due: '2025-11-20', filed: '2025-11-19', name: 'NOV' },
          { key: 'M12', due: '2025-12-20', filed: '2025-12-18', name: 'DEC' },
          { key: 'M01', due: '2026-01-20', filed: '2026-01-19', name: 'JAN' },
          { key: 'M02', due: '2026-02-20', filed: null, name: 'FEB' },
        ];
        for (const m of months) {
          await ComplianceEntryModel.findOneAndUpdate(
            { itemId: mongoItemId, fy, periodKey: m.key },
            {
              itemId: mongoItemId,
              fy,
              periodKey: m.key,
              dueDate: m.due,
              filedOn: m.filed || undefined,
              documents: m.filed
                ? [{ id: `doc-${item.formCode}-${m.name}`, name: `${item.formCode}_${m.name}.pdf`, size: 105000, mimeType: 'application/pdf' }]
                : [],
              source: 'portal',
              syncedAt: new Date(),
              isSeed: false,
              isDeleted: false,
            },
            { upsert: true }
          );
        }
      } else if (item.frequency === 'quarterly') {
        // 4 periods: Q1, Q2, Q3, Q4 (max 5 records)
        const quarters = [
          { key: 'Q1', due: '2025-07-31', filed: '2025-07-28' },
          { key: 'Q2', due: '2025-10-31', filed: '2025-10-29' },
          { key: 'Q3', due: '2026-01-31', filed: '2026-01-29' },
          { key: 'Q4', due: '2026-05-31', filed: null },
        ];
        for (const q of quarters) {
          await ComplianceEntryModel.findOneAndUpdate(
            { itemId: mongoItemId, fy, periodKey: q.key },
            {
              itemId: mongoItemId,
              fy,
              periodKey: q.key,
              dueDate: q.due,
              filedOn: q.filed || undefined,
              documents: q.filed
                ? [{ id: `doc-tds-${q.key}`, name: `Form_${item.formCode}_${q.key}.pdf`, size: 120000, mimeType: 'application/pdf' }]
                : [],
              source: 'portal',
              syncedAt: new Date(),
              isSeed: false,
              isDeleted: false,
            },
            { upsert: true }
          );
        }
      } else if (item.frequency === 'annual') {
        // 1 annual period record
        await ComplianceEntryModel.findOneAndUpdate(
          { itemId: mongoItemId, fy, periodKey: 'ANNUAL' },
          {
            itemId: mongoItemId,
            fy,
            periodKey: 'ANNUAL',
            dueDate: '2026-10-31',
            filedOn: undefined,
            source: 'portal',
            syncedAt: new Date(),
            isSeed: false,
            isDeleted: false,
          },
          { upsert: true }
        );
      }
    }
  }

  logger.info(`Seeded compliance items & periods for ${clientName}`);

  await disconnectDatabase();
  logger.info('Database disconnected. Mock client creation complete!');

  return {
    id: clientId.toString(),
    name: clientName,
    fileNo: fileNo,
    pan: pan,
  };
}

// Direct execution support
if (require.main === module) {
  createMockClient()
    .then((res) => {
      console.log('SUCCESS: Single mock client created in DB:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('ERROR creating mock client:', err);
      process.exit(1);
    });
}
