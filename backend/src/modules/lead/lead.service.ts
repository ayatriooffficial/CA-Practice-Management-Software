import { Types } from 'mongoose';
import { Lead } from './lead.model';
import { LeadTask } from './leadTask.model';
import { ILead, ILeadDocument } from './lead.interface';
import { Client } from '../client/client.model';
import { QueryBuilder, QueryOptions } from '../../shared/utils/queryBuilder';
import { AppError } from '../../shared/utils/apiError';
import { ResponseMessages } from '../../constants/messages';
import { PaginationMeta } from '../../shared/utils/apiResponse';
import { DriveService } from '../drive/drive.service';
import { DocumentCategory } from '../drive/drive.interface';
import { CounterService } from '../counter/counter.service';

export class LeadService {
  /**
   * Register a new lead
   */
  static async createLead(
    data: Partial<ILead>,
    userCtx?: { userId: string | null; orgId?: string | null } | string | null
  ): Promise<ILeadDocument> {
    const userId = typeof userCtx === 'string' ? userCtx : userCtx?.userId;
    const orgId = typeof userCtx === 'object' ? userCtx?.orgId : undefined;
    if (orgId) {
      data.orgId = orgId;
    }
    if (userId) {
      data.userId = userId;
      data.createdBy = userId;
    }
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

    // Process photo if base64 provided
    if (data.photo && data.photo.startsWith('data:')) {
      try {
        const { url } = await DriveService.processAndUploadAttachment(
          data.photo,
          DocumentCategory.KYC_IDENTITY,
          {
            defaultName: `${data.fullName || 'lead'}_photo`,
            clientName: data.fullName,
            description: `Profile photo for lead ${data.fullName}`,
            tags: ['Lead-Photo', 'KYC'],
          }
        );
        data.photo = url;
      } catch {
        // keep fallback
      }
    }

    // Process PAN attachment if base64 provided
    if (data.panAttachment && data.panAttachment.startsWith('data:')) {
      try {
        const { url } = await DriveService.processAndUploadAttachment(
          data.panAttachment,
          DocumentCategory.KYC_IDENTITY,
          {
            defaultName: `${data.fullName || 'lead'}_PAN`,
            clientName: data.fullName,
            description: `PAN Card attachment for lead ${data.fullName} (${data.pan || ''})`,
            tags: ['PAN', 'KYC'],
          }
        );
        data.panAttachment = url;
      } catch {
        // fallback
      }
    }

    // Process Aadhaar attachment if base64 provided
    if (data.aadhaarAttachment && data.aadhaarAttachment.startsWith('data:')) {
      try {
        const { url } = await DriveService.processAndUploadAttachment(
          data.aadhaarAttachment,
          DocumentCategory.KYC_IDENTITY,
          {
            defaultName: `${data.fullName || 'lead'}_Aadhaar`,
            clientName: data.fullName,
            description: `Aadhaar attachment for lead ${data.fullName}`,
            tags: ['Aadhaar', 'KYC'],
          }
        );
        data.aadhaarAttachment = url;
      } catch {
        // fallback
      }
    }

    // Process DIN attachment if base64 provided
    if (data.dinAttachment && data.dinAttachment.startsWith('data:')) {
      try {
        const { url } = await DriveService.processAndUploadAttachment(
          data.dinAttachment,
          DocumentCategory.KYC_IDENTITY,
          {
            defaultName: `${data.fullName || 'lead'}_DIN`,
            clientName: data.fullName,
            description: `DIN attachment for lead ${data.fullName}`,
            tags: ['DIN', 'KYC'],
          }
        );
        data.dinAttachment = url;
      } catch {
        // fallback
      }
    }

    const lead = new Lead(data);
    return await lead.save();
  }

  /**
   * Retrieve paginated leads with filtering & full-text search
   */
  static async getAllLeads(
    queryOptions: QueryOptions,
    userCtx?: { userId: string | null; orgId?: string | null; name?: string; email?: string; role?: string } | string | null
  ): Promise<{ items: ILeadDocument[]; pagination: PaginationMeta }> {
    const searchableFields = ['fullName', 'mobile', 'email', 'pan', 'notes'];
    const parsedQuery = QueryBuilder.parse<ILeadDocument>(queryOptions, searchableFields);

    const orgId = typeof userCtx === 'object' ? userCtx?.orgId : undefined;
    const userId = typeof userCtx === 'string' ? userCtx : userCtx?.userId;

    if (orgId) {
      const orgConditions: any[] = [
        { orgId },
        { orgId: String(orgId) },
      ];
      if (Types.ObjectId.isValid(orgId)) {
        orgConditions.push({ orgId: new Types.ObjectId(orgId) });
      }
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
      const userCondition = { $or: [{ userId }, { createdBy: userId }] };
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

    // Process base64 uploads in update
    if (updateData.photo && updateData.photo.startsWith('data:')) {
      try {
        const { url } = await DriveService.processAndUploadAttachment(
          updateData.photo,
          DocumentCategory.KYC_IDENTITY,
          {
            defaultName: `${lead.fullName || 'lead'}_photo`,
            leadId: id,
            clientName: lead.fullName,
            description: `Updated profile photo for lead ${lead.fullName}`,
            tags: ['Lead-Photo', 'KYC'],
          }
        );
        updateData.photo = url;
      } catch {
        // keep fallback
      }
    }

    if (updateData.panAttachment && updateData.panAttachment.startsWith('data:')) {
      try {
        const { url } = await DriveService.processAndUploadAttachment(
          updateData.panAttachment,
          DocumentCategory.KYC_IDENTITY,
          {
            defaultName: `${lead.fullName || 'lead'}_PAN`,
            leadId: id,
            clientName: lead.fullName,
            description: `PAN Card attachment for lead ${lead.fullName}`,
            tags: ['PAN', 'KYC'],
          }
        );
        updateData.panAttachment = url;
      } catch {
        // fallback
      }
    }

    if (updateData.aadhaarAttachment && updateData.aadhaarAttachment.startsWith('data:')) {
      try {
        const { url } = await DriveService.processAndUploadAttachment(
          updateData.aadhaarAttachment,
          DocumentCategory.KYC_IDENTITY,
          {
            defaultName: `${lead.fullName || 'lead'}_Aadhaar`,
            leadId: id,
            clientName: lead.fullName,
            description: `Aadhaar attachment for lead ${lead.fullName}`,
            tags: ['Aadhaar', 'KYC'],
          }
        );
        updateData.aadhaarAttachment = url;
      } catch {
        // fallback
      }
    }

    if (updateData.dinAttachment && updateData.dinAttachment.startsWith('data:')) {
      try {
        const { url } = await DriveService.processAndUploadAttachment(
          updateData.dinAttachment,
          DocumentCategory.KYC_IDENTITY,
          {
            defaultName: `${lead.fullName || 'lead'}_DIN`,
            leadId: id,
            clientName: lead.fullName,
            description: `DIN attachment for lead ${lead.fullName}`,
            tags: ['DIN', 'KYC'],
          }
        );
        updateData.dinAttachment = url;
      } catch {
        // fallback
      }
    }

    Object.assign(lead, updateData);
    return await lead.save();
  }

  /**
   * Upload and verify Lead Profile Photo to Google Drive
   */
  static async uploadLeadPhoto(
    id: string,
    file: Express.Multer.File
  ): Promise<{ photoUrl: string; lead: ILeadDocument }> {
    const lead = await Lead.findById(id);
    if (!lead) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }

    const { url } = await DriveService.processAndUploadAttachment(
      file,
      DocumentCategory.KYC_IDENTITY,
      {
        defaultName: `${lead.fullName}_photo`,
        leadId: id,
        clientName: lead.fullName,
        description: `Verified profile photo for lead ${lead.fullName}`,
        tags: ['Lead-Photo', 'KYC'],
      }
    );

    lead.photo = url;
    await lead.save();

    return { photoUrl: url, lead };
  }

  /**
   * Upload and verify identity attachment (PAN, Aadhaar, DIN) to Google Drive
   */
  static async uploadLeadAttachment(
    id: string,
    file: Express.Multer.File,
    field: 'panAttachment' | 'aadhaarAttachment' | 'dinAttachment'
  ): Promise<ILeadDocument> {
    const lead = await Lead.findById(id);
    if (!lead) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }

    const fieldLabel =
      field === 'panAttachment' ? 'PAN' : field === 'aadhaarAttachment' ? 'Aadhaar' : 'DIN';

    const { url } = await DriveService.processAndUploadAttachment(
      file,
      DocumentCategory.KYC_IDENTITY,
      {
        defaultName: `${lead.fullName}_${fieldLabel}_doc`,
        leadId: id,
        clientName: lead.fullName,
        description: `Verified ${fieldLabel} attachment for lead ${lead.fullName}`,
        tags: [fieldLabel, 'KYC'],
      }
    );

    lead[field] = url;
    await lead.save();

    return lead;
  }

  /**
   * Upload any general document for a lead to Google Drive
   */
  static async uploadLeadDocument(
    id: string,
    file: Express.Multer.File,
    category: DocumentCategory = DocumentCategory.KYC_IDENTITY,
    description?: string,
    tags: string[] = []
  ): Promise<any> {
    const lead = await Lead.findById(id);
    if (!lead) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }

    return await DriveService.uploadDocument(file, {
      category,
      description: description || `Document uploaded for lead ${lead.fullName}`,
      leadId: id,
      clientName: lead.fullName,
      tags: [...tags, 'Lead-Document'],
    });
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
      fileNo = await CounterService.getNextClientFileNo();
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
  static async getLeadStats(
    userCtx?: { userId: string | null; orgId?: string | null; name?: string; email?: string; role?: string } | string | null
  ): Promise<Record<string, unknown>> {
    const orgId = typeof userCtx === 'object' ? userCtx?.orgId : undefined;
    const userId = typeof userCtx === 'string' ? userCtx : userCtx?.userId;

    const baseMatch: Record<string, any> = { isDeleted: false };
    const deletedMatch: Record<string, any> = { isDeleted: true };

    if (orgId) {
      const orgConditions: any[] = [
        { orgId },
        { orgId: String(orgId) },
      ];
      if (Types.ObjectId.isValid(orgId)) {
        orgConditions.push({ orgId: new Types.ObjectId(orgId) });
      }
      if (userId) {
        orgConditions.push({ userId }, { createdBy: userId });
      }
      baseMatch.$or = orgConditions;
      deletedMatch.$or = orgConditions;
    } else if (userId) {
      const orClauses: any[] = [
        { userId },
        { createdBy: userId },
      ];
      baseMatch.$or = orClauses;
      deletedMatch.$or = orClauses;
    }

    const stats = await Lead.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalLeads = await Lead.countDocuments(baseMatch);
    const totalDeleted = await Lead.countDocuments(deletedMatch).setOptions({
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

  /**
   * Get all follow-up tasks for a lead
   */
  static async getLeadTasks(leadId: string) {
    const tasks = await LeadTask.find({ leadId, isDeleted: false }).sort({ createdAt: -1 });
    return tasks;
  }

  /**
   * Create a new follow-up task for a lead
   */
  static async createLeadTask(
    leadId: string,
    data: any,
    userCtx?: { userId: string | null; orgId?: string | null } | string | null
  ) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }
    const userId = typeof userCtx === 'string' ? userCtx : userCtx?.userId;
    const orgId = typeof userCtx === 'object' ? userCtx?.orgId : undefined;

    const task = await LeadTask.create({
      ...data,
      leadId,
      orgId: orgId || lead.orgId,
      userId: userId || lead.userId,
      contactEmail: data.contactEmail || lead.email || '',
      contactPhone: data.contactPhone || lead.mobile || '',
    });
    return task;
  }

  /**
   * Update a lead task
   */
  static async updateLeadTask(taskId: string, data: any) {
    const task = await LeadTask.findOneAndUpdate(
      { _id: taskId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!task) {
      throw AppError.notFound('Lead task not found');
    }
    return task;
  }

  /**
   * Delete a lead task
   */
  static async deleteLeadTask(taskId: string) {
    const task = await LeadTask.findOne({ _id: taskId, isDeleted: false });
    if (!task) {
      throw AppError.notFound('Lead task not found');
    }
    await (task as any).softDelete();
    return { id: taskId, message: 'Task deleted successfully' };
  }

  /**
   * Add a detail note to lead
   */
  static async addLeadNote(leadId: string, note: string, author = 'Staff') {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }
    const newNote = {
      id: new Types.ObjectId().toString(),
      note,
      author,
      createdAt: new Date(),
    };
    lead.detailNotes = lead.detailNotes || [];
    lead.detailNotes.unshift(newNote as any);
    await lead.save();
    return lead;
  }

  /**
   * Delete a detail note from lead
   */
  static async deleteLeadNote(leadId: string, noteId: string) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }
    lead.detailNotes = (lead.detailNotes || []).filter((n: any) => n.id !== noteId);
    await lead.save();
    return lead;
  }
}

