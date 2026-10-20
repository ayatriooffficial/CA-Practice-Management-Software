import { Service } from './service.model';
import { IService, IServiceDocument } from './service.interface';
import { QueryBuilder, QueryOptions } from '../../shared/utils/queryBuilder';
import { AppError } from '../../shared/utils/apiError';
import { ResponseMessages } from '../../constants/messages';
import { PaginationMeta } from '../../shared/utils/apiResponse';

const INITIAL_SERVICE_SEEDS: Partial<IService>[] = [
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
  },
];

export class ServiceService {
  /**
   * Automatically seed initial service catalog if database is empty
   */
  static async seedInitialServicesIfNeeded(): Promise<void> {
    try {
      const count = await Service.countDocuments().setOptions({ includeDeleted: true });
      if (count === 0) {
        await Service.insertMany(INITIAL_SERVICE_SEEDS);
      }
    } catch {
      // Continue gracefully
    }
  }

  /**
   * Create a new service master entry
   */
  static async createService(data: Partial<IService>): Promise<IServiceDocument> {
    const existing = await Service.findOne({
      name: { $regex: new RegExp(`^${data.name?.trim()}$`, 'i') },
      isDeleted: false,
    });

    if (existing) {
      throw AppError.conflict(ResponseMessages.SERVICE_NAME_EXISTS);
    }

    const service = new Service({
      ...data,
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
    queryOptions: QueryOptions
  ): Promise<{ items: IServiceDocument[]; pagination: PaginationMeta }> {
    await this.seedInitialServicesIfNeeded();

    const searchableFields = ['name', 'category', 'sacCode', 'description', 'sop'];
    const parsedQuery = QueryBuilder.parse<IServiceDocument>(queryOptions, searchableFields);

    return await QueryBuilder.paginate<IServiceDocument>(Service, parsedQuery);
  }

  /**
   * Retrieve single service by ID
   */
  static async getServiceById(id: string, includeDeleted = false): Promise<IServiceDocument> {
    const service = await Service.findById(id).setOptions({ includeDeleted });
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
    const service = await Service.findById(id);
    if (!service) {
      throw AppError.notFound(ResponseMessages.SERVICE_NOT_FOUND);
    }

    if (data.name && data.name.trim().toLowerCase() !== service.name.toLowerCase()) {
      const conflict = await Service.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
        isDeleted: false,
      });
      if (conflict) {
        throw AppError.conflict(ResponseMessages.SERVICE_NAME_EXISTS);
      }
    }

    Object.assign(service, data);
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
  static async getServiceStats(): Promise<{
    totalServices: number;
    activeServices: number;
    recurringServices: number;
    categoriesCount: number;
    avgFee: number;
  }> {
    const [stats] = await Service.aggregate([
      { $match: { isDeleted: false } },
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
}
