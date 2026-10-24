import mongoose from 'mongoose';
import { Service } from './service.model';
import { Task } from '../task/task.model';
import { Client } from '../client/client.model';
import {
  ComplianceCategoryModel,
  ComplianceItemModel,
  ComplianceEntryModel,
  Frequency,
} from '../compliance/compliance.model';
import { IService, IServiceDocument } from './service.interface';
import { QueryBuilder, QueryOptions } from '../../shared/utils/queryBuilder';
import { AppError } from '../../shared/utils/apiError';
import { ResponseMessages } from '../../constants/messages';
import { PaginationMeta } from '../../shared/utils/apiResponse';
import { CounterService } from '../counter/counter.service';

const INITIAL_SERVICE_SEEDS: Partial<IService>[] = [
  {
    name: 'GST IFF',
    category: 'Retainer',
    frequency: 'Monthly',
    difficulty: 'Easy',
    description: 'Prepare invoice data for IFF under QRMP scheme. Perform reconciliation with GSTR-2B before filing.',
    isRecurring: true,
    professionalFee: 2500,
    taxRate: '18%',
    sacCode: '998231',
    maxOopBudget: 0,
    tatDays: 2,
    tatHours: '02:00',
    sop: 'Standard IFF QRMP SOP v1.0',
    subTasks: [
      { id: '1', name: 'Step 1', description: 'Collect Invoices & Data', totalHours: '0 Hrs', percentage: 34 },
      { id: '2', name: 'Step 2', description: 'Verify & Reconcile GSTR-2B', totalHours: '0 Hrs', percentage: 33 },
      { id: '3', name: 'Step 3', description: 'File IFF on GST Portal', totalHours: '0 Hrs', percentage: 33 },
    ],
    checklist: [
      { id: 'c1', title: 'Verify PAN details for all deductees', isMandatory: true },
      { id: 'c2', title: 'Verify B2B invoice upload status', isMandatory: true },
    ],
    documentRequests: [
      { id: 'd1', title: 'Sales Register / B2B Invoices', description: 'Monthly B2B invoices for QRMP scheme', isMandatory: true },
      { id: 'd2', title: 'Purchase Register (Optional)', description: 'For input tax reconciliation', isMandatory: false },
    ],
    status: 'Active',
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
    name: 'EPFO & ESIC Monthly Compliance',
    category: 'Labour & Payroll',
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
  },
];

export class ServiceService {
  /**
   * Automatically seed initial service catalog if database is empty
   */
  static async seedInitialServicesIfNeeded(): Promise<void> {
    try {
      for (const seed of INITIAL_SERVICE_SEEDS) {
        const exists = await Service.findOne({ name: seed.name }).setOptions({ includeDeleted: true });
        if (!exists) {
          await Service.create(seed);
        }
      }
    } catch {
      // Continue gracefully
    }
  }

  /**
   * Create a new service master entry
   */
  static async createService(
    data: Partial<IService>,
    userCtx?: { userId: string | null; orgId?: string | null } | string | null
  ): Promise<IServiceDocument> {
    const userId = typeof userCtx === 'string' ? userCtx : userCtx?.userId;
    const orgId = typeof userCtx === 'object' ? userCtx?.orgId : undefined;

    const existing = await Service.findOne({
      name: { $regex: new RegExp(`^${data.name?.trim()}$`, 'i') },
      isDeleted: false,
    });

    if (existing) {
      throw AppError.conflict(ResponseMessages.SERVICE_NAME_EXISTS);
    }

    if (!data.serviceId) {
      data.serviceId = await CounterService.getNextServiceId();
    }

    if (orgId) {
      data.orgId = orgId;
    }
    if (userId) {
      data.userId = userId;
      data.createdBy = userId;
    }

    const service = new Service({
      ...data,
      serviceId: data.serviceId,
      name: data.name?.trim(),
      category: data.category?.trim(),
      professionalFee: Number(data.professionalFee) || 0,
    });

    return await service.save();
  }

  /**
   * Retrieve paginated services with filters and full-text search
   */
  static async getAllServices(
    queryOptions: QueryOptions,
    userCtx?: { userId: string | null; orgId?: string | null; name?: string; email?: string; role?: string } | string | null
  ): Promise<{ items: IServiceDocument[]; pagination: PaginationMeta }> {
    const searchableFields = ['name', 'category', 'sacCode', 'description', 'sop'];
    const parsedQuery = QueryBuilder.parse<IServiceDocument>(queryOptions, searchableFields);

    const orgId = typeof userCtx === 'object' ? userCtx?.orgId : undefined;
    const userId = typeof userCtx === 'string' ? userCtx : userCtx?.userId;

    if (orgId) {
      const orgConditions: any[] = [
        { orgId },
        { orgId: String(orgId) },
      ];
      if (userId) {
        orgConditions.push({ userId }, { createdBy: userId });
      }
      const orgFilter = { $or: orgConditions };

      if (parsedQuery.filter.$or) {
        const existingOr = parsedQuery.filter.$or;
        delete parsedQuery.filter.$or;
        parsedQuery.filter.$and = [
          { $or: existingOr },
          orgFilter,
        ];
      } else {
        Object.assign(parsedQuery.filter, orgFilter);
      }
    } else if (userId) {
      const userCondition = {
        $or: [
          { userId },
          { createdBy: userId },
        ],
      };
      if (parsedQuery.filter.$or) {
        const existingOr = parsedQuery.filter.$or;
        delete parsedQuery.filter.$or;
        parsedQuery.filter.$and = [
          { $or: existingOr },
          userCondition,
        ];
      } else {
        Object.assign(parsedQuery.filter, userCondition);
      }
    }

    return await QueryBuilder.paginate<IServiceDocument>(Service, parsedQuery);
  }

  /**
   * Retrieve single service by ID
   */
  static async getServiceById(id: string, includeDeleted = false): Promise<IServiceDocument> {
    let service: IServiceDocument | null = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      try {
        service = await Service.findById(id).setOptions({ includeDeleted });
      } catch {
        service = null;
      }
    }
    if (!service) {
      service = await Service.findOne({
        $or: [
          { serviceId: id },
          { name: id },
          { name: new RegExp(`^${id}$`, 'i') },
        ],
      }).setOptions({ includeDeleted });
    }
    if (!service) {
      throw AppError.notFound(ResponseMessages.SERVICE_NOT_FOUND);
    }
    return service;
  }

  /**
   * Update service entry
   */
  static async updateServiceById(
    id: string,
    data: Partial<IService>
  ): Promise<IServiceDocument> {
    const service = await this.getServiceById(id);

    if (data.name && data.name.trim().toLowerCase() !== service.name.toLowerCase()) {
      const conflict = await Service.findOne({
        _id: { $ne: service._id },
        name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
        isDeleted: false,
      });
      if (conflict) {
        throw AppError.conflict(ResponseMessages.SERVICE_NAME_EXISTS);
      }
    }

    Object.assign(service, data);

    if (data.sopDetails) {
      service.sopDetails = {
        ...(service.sopDetails || {}),
        ...data.sopDetails,
        lastUpdated: new Date(),
      };
      service.markModified('sopDetails');
    }
    if (data.comments) {
      service.markModified('comments');
    }
    if (data.checklist) {
      service.markModified('checklist');
    }
    if (data.documentRequests) {
      service.markModified('documentRequests');
    }
    if (data.subTasks) {
      service.markModified('subTasks');
    }

    return await service.save();
  }

  /**
   * Update SOP document and structured steps
   */
  static async updateSop(
    id: string,
    sopData: {
      sop?: string;
      sopDetails?: import('./service.interface').IServiceSop;
      purpose?: string;
      applicability?: string;
      steps?: string[];
    }
  ): Promise<IServiceDocument> {
    const service = await this.getServiceById(id);
    if (sopData.sop !== undefined) {
      service.sop = sopData.sop;
    }
    const currentSop = service.sopDetails || {
      purpose: '',
      applicability: '',
      steps: [],
    };
    service.sopDetails = {
      purpose: sopData.sopDetails?.purpose ?? sopData.purpose ?? currentSop.purpose ?? '',
      applicability: sopData.sopDetails?.applicability ?? sopData.applicability ?? currentSop.applicability ?? '',
      steps: sopData.sopDetails?.steps ?? sopData.steps ?? currentSop.steps ?? [],
      lastUpdated: new Date(),
    };
    service.markModified('sopDetails');
    return await service.save();
  }

  /**
   * Add a comment to service SOP review thread
   */
  static async addComment(
    id: string,
    comment: { text: string; author?: string; authorInitials?: string; avatarColor?: string }
  ): Promise<IServiceDocument> {
    const service = await this.getServiceById(id);
    if (!service.comments) {
      service.comments = [];
    }
    const initials =
      comment.authorInitials ||
      (comment.author
        ? comment.author
            .split(' ')
            .map((n) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()
        : 'AU');

    const newComment = {
      id: `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      author: comment.author || 'Team Member',
      authorInitials: initials,
      avatarColor: comment.avatarColor || '#6366F1',
      text: comment.text,
      createdAt: new Date(),
    };

    service.comments.push(newComment);
    service.markModified('comments');
    return await service.save();
  }

  /**
   * Retrieve comments for a service
   */
  static async getComments(id: string): Promise<import('./service.interface').IServiceComment[]> {
    const service = await this.getServiceById(id);
    return service.comments || [];
  }

  /**
   * Soft-delete a service
   */
  static async softDeleteService(id: string): Promise<IServiceDocument> {
    const service = await Service.findById(id);
    if (!service) {
      throw AppError.notFound(ResponseMessages.SERVICE_NOT_FOUND);
    }
    await service.softDelete();
    return service;
  }

  /**
   * Restore a soft-deleted service
   */
  static async restoreService(id: string): Promise<IServiceDocument> {
    const service = await Service.findById(id).setOptions({ includeDeleted: true });
    if (!service) {
      throw AppError.notFound(ResponseMessages.SERVICE_NOT_FOUND);
    }
    await service.restore();
    return service;
  }

  /**
   * Permanent hard-delete
   */
  static async hardDeleteService(id: string): Promise<void> {
    const result = await Service.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw AppError.notFound(ResponseMessages.SERVICE_NOT_FOUND);
    }
  }

  /**
   * Analytics and category breakdown
   */
  static async getServiceStats(
    userCtx?: { userId: string | null; orgId?: string | null; name?: string; email?: string; role?: string } | string | null
  ): Promise<{
    totalServices: number;
    activeServices: number;
    recurringServices: number;
    categoriesCount: number;
    avgFee: number;
  }> {
    const orgId = typeof userCtx === 'object' ? userCtx?.orgId : undefined;
    const userId = typeof userCtx === 'string' ? userCtx : userCtx?.userId;
    const matchCondition: Record<string, any> = { isDeleted: false };
    if (orgId) {
      const orgConditions: any[] = [
        { orgId },
        { orgId: String(orgId) },
      ];
      if (userId) {
        orgConditions.push({ userId }, { createdBy: userId });
      }
      matchCondition.$or = orgConditions;
    } else if (userId) {
      matchCondition.$or = [{ userId }, { createdBy: userId }];
    }

    const [stats] = await Service.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalServices: { $sum: 1 },
          activeServices: {
            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] },
          },
          recurringServices: {
            $sum: { $cond: ['$isRecurring', 1, 0] },
          },
          categories: { $addToSet: '$category' },
          totalFee: { $sum: '$professionalFee' },
        },
      },
      {
        $project: {
          _id: 0,
          totalServices: 1,
          activeServices: 1,
          recurringServices: 1,
          categoriesCount: { $size: '$categories' },
          avgFee: {
            $cond: [
              { $gt: ['$totalServices', 0] },
              { $round: [{ $divide: ['$totalFee', '$totalServices'] }, 2] },
              0,
            ],
          },
        },
      },
    ]);

    return (
      stats || {
        totalServices: 0,
        activeServices: 0,
        recurringServices: 0,
        categoriesCount: 0,
        avgFee: 0,
      }
    );
  }

  /**
   * Sync service subtasks, checklist and document requests to all active tasks linked to this service
   */
  static async syncServiceToTasks(serviceId: string): Promise<{ syncedTasksCount: number }> {
    const service = await this.getServiceById(serviceId);

    // Map subtasks
    const subTasks = (service.subTasks || []).map((t: any, idx: number) => {
      if (typeof t === 'string') {
        return {
          id: String(idx + 1),
          title: t,
          completed: false,
          timeSpent: '00:00:00',
        };
      }
      return {
        id: t.id || String(idx + 1),
        title: t.name || t.title || `Step ${idx + 1}`,
        completed: false,
        timeSpent: t.totalHours || '00:00:00',
      };
    });

    // Map checklist
    const checklist = ((service as any).checklist || []).map((c: any, idx: number) => {
      if (typeof c === 'string') {
        return {
          id: `c${idx + 1}`,
          title: c,
          completed: false,
          isMandatory: true,
        };
      }
      return {
        id: c.id || `c${idx + 1}`,
        title: c.title || c.name || `Checklist ${idx + 1}`,
        completed: false,
        isMandatory: c.isMandatory !== false,
      };
    });

    // Map document requests
    const documentRequests = ((service as any).documentRequests || []).map((d: any, idx: number) => {
      if (typeof d === 'string') {
        return {
          id: `d${idx + 1}`,
          title: d,
          status: 'Pending',
          isMandatory: true,
        };
      }
      return {
        id: d.id || `d${idx + 1}`,
        title: d.title || d.name || `Document ${idx + 1}`,
        status: 'Pending',
        isMandatory: d.isMandatory !== false,
      };
    });

    // Find all active tasks for this service
    const filter = {
      isDeleted: false,
      status: { $nin: ['Completed', 'Cancelled'] },
      $or: [
        { serviceId: service._id?.toString() },
        { serviceId: service.id },
        { serviceName: service.name },
        { serviceName: { $regex: new RegExp(`^${service.name?.trim()}$`, 'i') } },
      ],
    };

    const activeTasks = await Task.find(filter);
    let modifiedCount = 0;

    for (const activeTask of activeTasks) {
      // 1. Merge subtasks while preserving completed status
      const existingSubMap = new Map(
        (activeTask.subTasks || []).map((s: any) => [s.id || s.title || s.name, s])
      );
      const mergedSubTasks = subTasks.map((st: any) => {
        const existing: any = existingSubMap.get(st.id) || existingSubMap.get(st.title);
        return {
          ...st,
          completed: existing ? existing.completed : false,
          timeSpent: existing ? existing.timeSpent : '00:00:00',
          taskId: activeTask.taskId,
          serviceId: service._id?.toString(),
        };
      });

      // 2. Merge checklist while preserving completed status
      const existingCheckMap = new Map(
        (activeTask.checklist || []).map((c: any) => [c.id || c.title, c])
      );
      const mergedChecklist = checklist.map((cl: any) => {
        const existing: any = existingCheckMap.get(cl.id) || existingCheckMap.get(cl.title);
        return {
          ...cl,
          completed: existing ? existing.completed : false,
          taskId: activeTask.taskId,
          serviceId: service._id?.toString(),
        };
      });

      // 3. Merge document requests while preserving received status
      const existingDocMap = new Map(
        (activeTask.documentRequests || []).map((d: any) => [d.id || d.title, d])
      );
      const mergedDocs = documentRequests.map((doc: any) => {
        const existing: any = existingDocMap.get(doc.id) || existingDocMap.get(doc.title);
        return {
          ...doc,
          status: existing ? existing.status : 'Pending',
          fileUrl: existing ? existing.fileUrl : '',
          receivedAt: existing ? existing.receivedAt : null,
          taskId: activeTask.taskId,
          serviceId: service._id?.toString(),
        };
      });

      if (mergedSubTasks.length > 0) activeTask.subTasks = mergedSubTasks as any;
      if (mergedChecklist.length > 0) activeTask.checklist = mergedChecklist as any;
      if (mergedDocs.length > 0) activeTask.documentRequests = mergedDocs as any;

      activeTask.markModified('subTasks');
      activeTask.markModified('checklist');
      activeTask.markModified('documentRequests');
      await activeTask.save();
      modifiedCount++;
    }

    return { syncedTasksCount: modifiedCount };
  }

  /**
   * Toggle a client's subscription/compliance status for a service
   */
  static async toggleClientService(
    serviceId: string,
    clientId: string,
    enabled: boolean
  ): Promise<any> {
    // 1. Resolve Service
    const isServiceObjectId = mongoose.Types.ObjectId.isValid(serviceId) && /^[0-9a-fA-F]{24}$/.test(serviceId);
    const service = isServiceObjectId
      ? await Service.findById(serviceId)
      : await Service.findOne({ $or: [{ _id: serviceId as any }, { name: serviceId }] });
    if (!service) {
      throw AppError.notFound(ResponseMessages.SERVICE_NOT_FOUND);
    }

    // 2. Resolve Client
    const isClientObjectId = /^[0-9a-fA-F]{24}$/.test(clientId);
    const client = isClientObjectId
      ? await Client.findById(clientId)
      : await Client.findOne({ $or: [{ fileNo: clientId }, { name: clientId }] });
    if (!client) {
      throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    }

    // 3. Update Client's serviceSettings array
    client.serviceSettings = client.serviceSettings || [];
    const settingIndex = client.serviceSettings.findIndex(
      (s: any) => s.serviceName && s.serviceName.trim().toLowerCase() === service.name.trim().toLowerCase()
    );

    if (settingIndex >= 0) {
      client.serviceSettings[settingIndex].compliance = enabled;
      client.serviceSettings[settingIndex].recTask = enabled ? 'Enabled' : 'Disabled';
      if (!client.serviceSettings[settingIndex].serviceId && service._id) {
        client.serviceSettings[settingIndex].serviceId = service._id.toString();
      }
    } else if (enabled) {
      client.serviceSettings.push({
        id: `ss-${Date.now()}`,
        serviceId: service._id?.toString() || serviceId,
        serviceName: service.name,
        category: service.category || 'General',
        compliance: true,
        recTask: 'Enabled',
        recInvoice: 'Disabled',
        frequency: service.frequency || 'Monthly',
        start: 'Day 1',
        target: service.tatDays ? `Day ${service.tatDays}` : 'Day 15',
        end: service.tatDays ? `Day ${service.tatDays + 2}` : 'Day 20',
        amount: service.professionalFee || 0,
      });
    }

    // 4. Update Client's services array (active service names)
    client.services = client.services || [];
    const hasServiceName = client.services.some(
      (s: string) => s.trim().toLowerCase() === service.name.trim().toLowerCase()
    );
    if (enabled && !hasServiceName) {
      client.services.push(service.name);
    } else if (!enabled && hasServiceName) {
      client.services = client.services.filter(
        (s: string) => s.trim().toLowerCase() !== service.name.trim().toLowerCase()
      );
    }

    // 5. Update Client's customerFiles.recurring array
    if (!client.customerFiles) {
      client.customerFiles = { promoter: [], statutory: [], recurring: [] };
    }
    client.customerFiles.recurring = client.customerFiles.recurring || [];
    const recurringIndex = client.customerFiles.recurring.findIndex(
      (r: any) => r.service && r.service.trim().toLowerCase() === service.name.trim().toLowerCase()
    );

    if (enabled && recurringIndex === -1) {
      client.customerFiles.recurring.push({
        key: Date.now(),
        category: service.category || 'General',
        service: service.name,
        tariff: String(service.professionalFee || '0.00'),
      });
    } else if (!enabled && recurringIndex >= 0) {
      client.customerFiles.recurring.splice(recurringIndex, 1);
    }

    client.markModified('serviceSettings');
    client.markModified('services');
    client.markModified('customerFiles');

    await client.save();

    // 6. Synchronize Compliance Module (ComplianceItem and ComplianceEntry)
    try {
      const resolvedCatId = await ServiceService.resolveComplianceCategoryId(service.category, service.name);
      const freq = ServiceService.resolveComplianceFrequency(service.frequency);
      const formCode = ServiceService.resolveComplianceFormCode(service);

      // Extract client identifier & state
      let clientIdentifier = '';
      if (client.customerFiles?.statutory) {
        const statutory = client.customerFiles.statutory as Array<{ type?: string; idNo?: string }>;
        const panEntry = statutory.find((s) => s.type?.toUpperCase() === 'PAN');
        const gstinEntry = statutory.find((s) => s.type?.toUpperCase() === 'GSTIN');
        const tanEntry = statutory.find((s) => s.type?.toUpperCase() === 'TAN');

        if (resolvedCatId === 'cat-it') {
          clientIdentifier = panEntry?.idNo || gstinEntry?.idNo || tanEntry?.idNo || '';
        } else if (resolvedCatId === 'cat-gst') {
          clientIdentifier = gstinEntry?.idNo || panEntry?.idNo || '';
        } else if (resolvedCatId === 'cat-tds') {
          clientIdentifier = tanEntry?.idNo || panEntry?.idNo || '';
        } else {
          clientIdentifier = panEntry?.idNo || gstinEntry?.idNo || tanEntry?.idNo || '';
        }
      }
      if (!clientIdentifier && (client as any).identifiers) {
        clientIdentifier = (client as any).identifiers.pan || (client as any).identifiers.gstin || '';
      }
      const clientAddress = client.address as any;
      const clientState = clientAddress?.state || (client as any).state || 'Karnataka';

      const itemFilter = {
        clientId: client._id,
        $or: [
          { label: service.name },
          { formCode },
          { formCode: service.name.toUpperCase() },
        ],
      };

      const MONTH_PERIODS = [
        { key: 'M04', due: '2025-05-20' },
        { key: 'M05', due: '2025-06-20' },
        { key: 'M06', due: '2025-07-20' },
        { key: 'M07', due: '2025-08-20' },
        { key: 'M08', due: '2025-09-20' },
        { key: 'M09', due: '2025-10-20' },
        { key: 'M10', due: '2025-11-20' },
        { key: 'M11', due: '2025-12-20' },
        { key: 'M12', due: '2026-01-20' },
        { key: 'M01', due: '2026-02-20' },
        { key: 'M02', due: '2026-03-20' },
        { key: 'M03', due: '2026-04-20' },
      ];

      const QUARTER_PERIODS = [
        { key: 'Q1', due: '2025-07-31' },
        { key: 'Q2', due: '2025-10-31' },
        { key: 'Q3', due: '2026-01-31' },
        { key: 'Q4', due: '2026-04-30' },
      ];

      const HALF_YEAR_PERIODS = [
        { key: 'H1', due: '2025-10-31' },
        { key: 'H2', due: '2026-04-30' },
      ];

      const ANNUAL_PERIODS = [
        { key: 'ANNUAL', due: '2026-10-31' },
      ];

      if (enabled) {
        // Upsert ComplianceItem
        let compItem = await ComplianceItemModel.findOne(itemFilter);
        if (compItem) {
          compItem.isDeleted = false;
          compItem.deletedAt = null;
          compItem.deletedBy = null;
          compItem.categoryId = resolvedCatId;
          compItem.label = service.name;
          compItem.frequency = freq;
          if (clientIdentifier) compItem.identifier = clientIdentifier;
          if (clientState) compItem.state = clientState;
          await compItem.save();
        } else {
          compItem = await ComplianceItemModel.create({
            clientId: client._id,
            categoryId: resolvedCatId,
            identifier: clientIdentifier,
            state: clientState,
            formCode,
            label: service.name,
            frequency: freq,
            isCustom: true,
            isSeed: false,
            isDeleted: false,
          });
        }

        // Generate ComplianceEntry records for fy: '2025-26'
        const fy = '2025-26';
        let periods: { key: string; due: string }[] = [];
        if (freq === 'monthly') {
          periods = MONTH_PERIODS;
        } else if (freq === 'quarterly') {
          periods = QUARTER_PERIODS;
        } else if (freq === 'half_yearly') {
          periods = HALF_YEAR_PERIODS;
        } else {
          periods = ANNUAL_PERIODS;
        }

        for (const p of periods) {
          await ComplianceEntryModel.findOneAndUpdate(
            { itemId: compItem._id, fy, periodKey: p.key },
            {
              itemId: compItem._id,
              fy,
              periodKey: p.key,
              dueDate: p.due,
              source: 'portal',
              syncedAt: new Date(),
              isSeed: false,
              isDeleted: false,
              $setOnInsert: {
                documents: [],
                statusOverride: null,
                filedOn: null,
              },
            },
            { upsert: true, new: true }
          );
        }
      } else {
        // Soft delete matching compliance items and their entries
        const existingItems = await ComplianceItemModel.find(itemFilter);
        for (const it of existingItems) {
          it.isDeleted = true;
          it.deletedAt = new Date();
          it.deletedBy = 'user-toggle';
          await it.save();
          await ComplianceEntryModel.updateMany(
            { itemId: it._id },
            { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: 'user-toggle' } }
          );
        }
      }
    } catch (complianceErr) {
      console.error('Error synchronizing compliance item on service toggle:', complianceErr);
    }

    return client;
  }

  static async resolveComplianceCategoryId(serviceCategory?: string, serviceName?: string): Promise<string> {
    const cat = (serviceCategory || '').trim().toLowerCase();
    const name = (serviceName || '').trim().toLowerCase();

    if (cat.includes('income tax') || cat === 'it' || name.includes('income tax') || name.includes('itr')) {
      return 'cat-it';
    }
    if (cat.includes('gst') || name.includes('gstr') || name.includes('gst') || cat.includes('g.s.t')) {
      return 'cat-gst';
    }
    if (cat.includes('tds') || cat.includes('tcs') || name.includes('tds')) {
      return 'cat-tds';
    }
    if (cat.includes('advance tax') || cat.includes('adv tax') || name.includes('advance tax')) {
      return 'cat-adv-tax';
    }
    if (cat.includes('corporate') || cat.includes('roc') || cat.includes('mca') || cat.includes('secretarial')) {
      return 'cat-corp-sec';
    }
    if (cat.includes('payroll') || name.includes('payroll')) {
      return 'cat-payroll';
    }
    if (cat.includes('pf') || name.includes('pf')) {
      return 'cat-pf';
    }
    if (cat.includes('esi') || name.includes('esi')) {
      return 'cat-esi';
    }
    if (cat.includes('audit')) {
      return 'cat-audit';
    }
    if (cat.includes('account') || cat.includes('book keeping') || cat.includes('book-keeping')) {
      return 'cat-accounts';
    }

    const clean = (serviceCategory || '').trim();
    if (clean) {
      const dbCat = await ComplianceCategoryModel.findOne({
        isDeleted: false,
        $or: [
          { categoryId: clean },
          { categoryId: `cat-${clean.toLowerCase().replace(/[^a-z0-9]/g, '-')}` },
          { name: new RegExp(`^${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        ],
      }).lean();

      if (dbCat) {
        return dbCat.categoryId;
      }
    }

    return 'cat-it';
  }

  static resolveComplianceFrequency(freq?: string): Frequency {
    const f = (freq || '').toLowerCase().trim();
    if (f === 'quarterly' || f === 'quarter') return 'quarterly';
    if (f === 'half_yearly' || f === 'half-yearly' || f === 'half yearly') return 'half_yearly';
    if (f === 'yearly' || f === 'annual' || f === 'annually') return 'yearly';
    return 'monthly';
  }

  static resolveComplianceFormCode(service: any): string {
    if (service.code && typeof service.code === 'string') return service.code.trim().toUpperCase();
    const raw = (service.name || 'SERVICE').toUpperCase();
    return raw.replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
  }
}
