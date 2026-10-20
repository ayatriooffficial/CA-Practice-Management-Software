import { Types } from 'mongoose';
import { Lead } from './lead.model';
import { ILead, ILeadDocument } from './lead.interface';
import { Client } from '../client/client.model';
import { QueryBuilder, QueryOptions } from '../../shared/utils/queryBuilder';
import { AppError } from '../../shared/utils/apiError';
import { ResponseMessages } from '../../constants/messages';
import { PaginationMeta } from '../../shared/utils/apiResponse';

export class LeadService {
  /**
   * Register a new lead
   */
  static async createLead(data: Partial<ILead>): Promise<ILeadDocument> {
    // Check if duplicate active lead exists with same mobile or PAN
    const orConditions: Record<string, unknown>[] = [{ mobile: data.mobile }];
    if (data.pan) {
      orConditions.push({ pan: data.pan.toUpperCase() });
    }

    const existingLead = await Lead.findOne({
      $or: orConditions,
      isDeleted: false,
    });

    if (existingLead) {
      if (data.pan && existingLead.pan === data.pan.toUpperCase()) {
        throw AppError.conflict(ResponseMessages.LEAD_PAN_EXISTS);
      }
      throw AppError.conflict(`An active lead already exists with mobile number: ${data.mobile}`);
    }

    const lead = new Lead(data);
    return await lead.save();
  }

  /**
   * Retrieve paginated leads with filtering & full-text search
   */
  static async getAllLeads(
    queryOptions: QueryOptions
  ): Promise<{ items: ILeadDocument[]; pagination: PaginationMeta }> {
    const searchableFields = ['fullName', 'mobile', 'email', 'pan', 'notes'];
    const parsedQuery = QueryBuilder.parse<ILeadDocument>(queryOptions, searchableFields);

    return await QueryBuilder.paginate<ILeadDocument>(Lead, parsedQuery);
  }

  /**
   * Retrieve single lead by ID
   */
  static async getLeadById(id: string, includeDeleted: boolean = false): Promise<ILeadDocument> {
    const query = Lead.findById(id);
    if (includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }

    const lead = await query.exec();
    if (!lead) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }
    return lead;
  }

  /**
   * Update lead details
   */
  static async updateLeadById(id: string, updateData: Partial<ILead>): Promise<ILeadDocument> {
    const lead = await Lead.findById(id);
    if (!lead) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }

    // Check PAN conflict if PAN is modified
    if (updateData.pan && updateData.pan.toUpperCase() !== lead.pan) {
      const conflict = await Lead.findOne({
        _id: { $ne: id },
        pan: updateData.pan.toUpperCase(),
        isDeleted: false,
      });
      if (conflict) {
        throw AppError.conflict(ResponseMessages.LEAD_PAN_EXISTS);
      }
    }

    Object.assign(lead, updateData);
    return await lead.save();
  }

  /**
   * Soft-delete lead record
   */
  static async softDeleteLead(id: string, deletedBy?: string): Promise<ILeadDocument> {
    const lead = await Lead.findById(id);
    if (!lead) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }

    await lead.softDelete(deletedBy);
    return lead;
  }

  /**
   * Restore soft-deleted lead
   */
  static async restoreLead(id: string): Promise<ILeadDocument> {
    const lead = await Lead.findOne({ _id: id }).setOptions({ includeDeleted: true });
    if (!lead) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }

    if (!lead.isDeleted) {
      throw AppError.badRequest('This lead record is already active and not deleted.');
    }

    await lead.restore();
    return lead;
  }

  /**
   * Permanently hard-delete lead
   */
  static async permanentDeleteLead(id: string): Promise<void> {
    const result = await Lead.findByIdAndDelete(id).setOptions({ includeDeleted: true });
    if (!result) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }
  }

  /**
   * Convert Lead into an active Client
   */
  static async convertLeadToClient(
    leadId: string,
    conversionData: {
      type: string;
      group: string;
      fileNo?: string;
      active?: boolean;
      services?: string[];
      users?: string[];
    }
  ) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }

    if (lead.status === 'converted' && lead.convertedToClientId) {
      throw AppError.badRequest(ResponseMessages.LEAD_ALREADY_CONVERTED);
    }

    // Generate automatic unique fileNo if not supplied
    let fileNo = conversionData.fileNo;
    if (!fileNo) {
      const count = await Client.countDocuments().setOptions({ includeDeleted: true });
      const year = new Date().getFullYear();
      fileNo = `CL-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Construct customerFiles from lead details (e.g. Promoter and Statutory entries)
    const promoterFiles = [];
    if (lead.din || lead.mcaId || lead.pan) {
      promoterFiles.push({
        key: 1,
        name: lead.fullName,
        pan: lead.pan || '',
        share: '100%',
        designation: 'Director / Proprietor',
        mcaId: lead.mcaId || '',
        mcaPassword: '',
      });
    }

    const statutoryFiles = [];
    if (lead.pan) {
      statutoryFiles.push({
        key: 1,
        type: 'PAN',
        idNo: lead.pan,
        attachment: lead.panAttachment || null,
      });
    }
    if (lead.aadhaar) {
      statutoryFiles.push({
        key: 2,
        type: 'Aadhaar',
        idNo: lead.aadhaar,
        attachment: lead.aadhaarAttachment || null,
      });
    }

    // Create client
    const newClient = new Client({
      name: lead.fullName,
      fileNo,
      type: conversionData.type,
      group: conversionData.group,
      mobile: lead.mobile,
      secondaryMobile: lead.aadhaarMobile || '',
      email: lead.email || '',
      address: lead.address || '',
      state: lead.state || '',
      pincode: lead.pincode || '',
      pan: lead.pan || '',
      dob: lead.dob || '',
      referredBy: lead.referredBy || '',
      photo: lead.photo || null,
      active: conversionData.active ?? true,
      services: conversionData.services || [],
      users: conversionData.users || [],
      leadId: lead._id,
      customerFiles: {
        promoter: promoterFiles,
        statutory: statutoryFiles,
        recurring: [],
      },
    });

    const savedClient = await newClient.save();

    // Mark lead as converted
    lead.status = 'converted';
    lead.convertedToClientId = savedClient._id as Types.ObjectId;
    lead.convertedAt = new Date();
    await lead.save();

    return {
      lead,
      client: savedClient,
    };
  }

  /**
   * Aggregate lead status statistics
   */
  static async getLeadStats(): Promise<Record<string, unknown>> {
    const stats = await Lead.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalLeads = await Lead.countDocuments({ isDeleted: false });
    const totalDeleted = await Lead.countDocuments({ isDeleted: true }).setOptions({
      includeDeleted: true,
    });

    const statusCounts: Record<string, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      dropped: 0,
    };

    stats.forEach((item) => {
      if (item._id && statusCounts[item._id] !== undefined) {
        statusCounts[item._id] = item.count;
      }
    });

    return {
      totalLeads,
      totalDeleted,
      byStatus: statusCounts,
      conversionRate:
        totalLeads > 0 ? Number(((statusCounts.converted / totalLeads) * 100).toFixed(2)) : 0,
    };
  }
}
