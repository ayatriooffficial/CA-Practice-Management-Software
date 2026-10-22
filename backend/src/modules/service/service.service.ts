import mongoose from 'mongoose';
import { Service } from './service.model';
import { Task } from '../task/task.model';
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
}
