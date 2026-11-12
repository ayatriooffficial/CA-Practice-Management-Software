import { Types } from 'mongoose';
import { Lead } from './lead.model';
import { LeadTask } from './leadTask.model';
import { ILead, ILeadDocument } from './lead.interface';
import { Client } from '../client/client.model';
import { ClientServiceSetting } from '../client/clientServiceSetting.model';
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

    if (!data.addressDetails || Object.keys(data.addressDetails).length === 0) {
      if (data.address || data.state || data.pincode) {
        data.addressDetails = {
          addressLine1: data.address || '',
          state: data.state || '',
          pincode: data.pincode || '',
          country: data.country || 'India',
        };
      }
    }

    if (!data.fullName) {
      data.fullName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ');
    }

    if ((data as any).id) {
      delete (data as any).id;
    }

    const lead = new Lead(data);
    return await lead.save();
  }

  /**
   * Retrieve paginated leads with filtering & full-text search
   */
  static async getAllLeads(
    queryOptions: QueryOptions,
    _userCtx?: { userId: string | null; orgId?: string | null; name?: string; email?: string; role?: string } | string | null
  ): Promise<{ items: ILeadDocument[]; pagination: PaginationMeta }> {
    const searchableFields = ['fullName', 'mobile', 'email', 'pan', 'notes'];
    const parsedQuery = QueryBuilder.parse<ILeadDocument>(queryOptions, searchableFields);

    // Single organization practice: all leads are accessible across the practice
    // Lightweight table projection: only fetch fields required for table view.
    const defaultLeadTableFields = [
      'fullName',
      'firstName',
      'middleName',
      'lastName',
      'abbreviation',
      'status',
      'mobile',
      'aadhaarMobile',
      'email',
      'pan',
      'aadhaar',
      'gender',
      'dob',
      'state',
      'country',
      'pincode',
      'nationality',
      'policeStation',
      'postOffice',
      'din',
      'mcaId',
      'referredBy',
      'photo',
      'panAttachment',
      'aadhaarAttachment',
      'dinAttachment',
      'isDeleted',
      'orgId',
      'userId',
      'createdAt',
      'updatedAt',
    ];
    if (!parsedQuery.projection) {
      parsedQuery.projection = defaultLeadTableFields.join(' ');
    }

    return await QueryBuilder.paginate<ILeadDocument>(Lead, parsedQuery);
  }

  /**
   * Retrieve single lead by ID
   */
  static async getLeadById(id: string, includeDeleted: boolean = false): Promise<any> {
    const query = Lead.findById(id);
    if (includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }

    const leadDoc = await query.exec();
    if (!leadDoc) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }
    const leadObj: any = leadDoc.toObject();

    // Attach all associated companies (clients) where this lead is the promoter/director
    try {
      const orConditions: any[] = [
        { leadId: leadDoc._id },
        { _id: { $in: leadDoc.associatedClientIds || [] } },
      ];
      if (leadDoc.pan && leadDoc.pan.trim()) {
        orConditions.push({ 'customerFiles.promoter.pan': leadDoc.pan.trim().toUpperCase() });
      }
      if (leadDoc.fullName && leadDoc.fullName.trim()) {
        orConditions.push({
          'customerFiles.promoter.name': leadDoc.fullName.trim(),
        });
      }

      const companies = await Client.find({
        $or: orConditions,
        isDeleted: false,
      }).select('name legalName fileNo type group mobile email status active customerFiles.promoter createdAt');

      leadObj.companies = companies;
    } catch {
      leadObj.companies = [];
    }

    return leadObj;
  }

  /**
   * Get all companies where this Lead is a Promoter / Director
   */
  static async getLeadCompanies(leadId: string): Promise<any[]> {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }

    const orConditions: any[] = [
      { leadId: lead._id },
      { _id: { $in: lead.associatedClientIds || [] } },
    ];
    if (lead.pan && lead.pan.trim()) {
      orConditions.push({ 'customerFiles.promoter.pan': lead.pan.trim().toUpperCase() });
    }
    if (lead.fullName && lead.fullName.trim()) {
      orConditions.push({
        'customerFiles.promoter.name': lead.fullName.trim(),
      });
    }

    return Client.find({
      $or: orConditions,
      isDeleted: false,
    }).select('name legalName fileNo type group mobile email status active customerFiles.promoter createdAt');
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

    if (updateData.address || updateData.state || updateData.pincode) {
      if (!updateData.addressDetails) {
        updateData.addressDetails = {
          addressLine1: updateData.address ?? lead.address ?? '',
          state: updateData.state ?? lead.state ?? '',
          pincode: updateData.pincode ?? lead.pincode ?? '',
          country: updateData.country ?? lead.country ?? 'India',
        };
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
   * Check deletion impact: whether this lead is the sole/last director for any active clients
   */
  static async checkLeadDeletionImpact(id: string): Promise<{
    isSoleDirector: boolean;
    affectedClients: Array<{ id: string; name: string; fileNo?: string; totalDirectors: number }>;
  }> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const lead = isObjectId ? await Lead.findById(id).lean() : null;
    if (!lead) {
      return { isSoleDirector: false, affectedClients: [] };
    }

    const orConditions: any[] = [
      { leadId: lead._id },
      { _id: { $in: lead.associatedClientIds || [] } },
    ];
    if (lead.convertedToClientId) {
      orConditions.push({ _id: lead.convertedToClientId });
    }
    if (lead.pan && lead.pan.trim()) {
      orConditions.push({ 'customerFiles.promoter.pan': lead.pan.trim().toUpperCase() });
    }
    if (lead.fullName && lead.fullName.trim()) {
      orConditions.push({ 'customerFiles.promoter.name': lead.fullName.trim() });
    }

    const associatedClients = await Client.find({
      $or: orConditions,
      isDeleted: false,
    }).select('name legalName fileNo customerFiles.promoter contacts').lean();

    const affectedClients: Array<{ id: string; name: string; fileNo?: string; totalDirectors: number }> = [];

    for (const client of associatedClients) {
      const promoters = Array.isArray(client.customerFiles?.promoter) ? client.customerFiles.promoter : [];
      const contacts = Array.isArray(client.contacts) ? client.contacts : [];

      const seen = new Set<string>();
      promoters.forEach((p: any) => {
        if (p.name) seen.add(p.name.trim().toLowerCase());
      });
      contacts.forEach((c: any) => {
        if (c.name) seen.add(c.name.trim().toLowerCase());
      });

      // If client has 1 or fewer distinct directors, this lead is the sole director!
      if (seen.size <= 1) {
        affectedClients.push({
          id: client._id.toString(),
          name: client.name || client.legalName || 'Client',
          fileNo: client.fileNo,
          totalDirectors: seen.size,
        });
      }
    }

    return {
      isSoleDirector: affectedClients.length > 0,
      affectedClients,
    };
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

    // Clean up director associations on clients so stale links are removed
    try {
      const leadIdStr = lead._id.toString();
      const panUpper = lead.pan ? lead.pan.trim().toUpperCase() : null;
      const nameTrim = lead.fullName ? lead.fullName.trim().toLowerCase() : null;

      const clientFilters: any[] = [
        { leadId: lead._id },
        { _id: { $in: lead.associatedClientIds || [] } },
      ];
      if (lead.convertedToClientId) clientFilters.push({ _id: lead.convertedToClientId });
      if (panUpper) clientFilters.push({ 'customerFiles.promoter.pan': panUpper });
      if (nameTrim) clientFilters.push({ 'customerFiles.promoter.name': new RegExp(`^${lead.fullName.trim()}$`, 'i') });

      const affectedClients = await Client.find({ $or: clientFilters, isDeleted: false });

      for (const c of affectedClients) {
        let modified = false;
        if (Array.isArray(c.customerFiles?.promoter)) {
          const prevLen = c.customerFiles.promoter.length;
          c.customerFiles.promoter = c.customerFiles.promoter.filter((p: any) => {
            const matchPan = panUpper && p.pan && p.pan.toUpperCase() === panUpper;
            const matchName = nameTrim && p.name && p.name.trim().toLowerCase() === nameTrim;
            const matchLead = p.leadId && (p.leadId === leadIdStr || p.leadId.toString() === leadIdStr);
            return !matchPan && !matchName && !matchLead;
          });
          if (c.customerFiles.promoter.length !== prevLen) {
            c.markModified('customerFiles');
            modified = true;
          }
        }
        if (Array.isArray(c.contacts)) {
          const prevLen = c.contacts.length;
          c.contacts = c.contacts.filter((ct: any) => {
            const matchPan = panUpper && ct.pan && ct.pan.toUpperCase() === panUpper;
            const matchName = nameTrim && ct.name && ct.name.trim().toLowerCase() === nameTrim;
            const matchLead = ct.leadId && (ct.leadId === leadIdStr || ct.leadId.toString() === leadIdStr);
            return !matchPan && !matchName && !matchLead;
          });
          if (c.contacts.length !== prevLen) {
            c.markModified('contacts');
            modified = true;
          }
        }

        // Also remove this director's stored credentials from client.passwords
        if (Array.isArray(c.passwords)) {
          const prevLen = c.passwords.length;
          c.passwords = c.passwords.filter((pwd: any) => {
            const uId = (pwd.userId || '').trim().toLowerCase();
            const uPan = (pwd.userId || '').trim().toUpperCase();
            const remarksLower = (pwd.remarks || '').trim().toLowerCase();
            const matchPan = panUpper && uPan === panUpper;
            const matchDin = lead.din && uId === lead.din.toLowerCase();
            const matchMca = lead.mcaId && uId === lead.mcaId.toLowerCase();
            const matchName = nameTrim && uId === nameTrim;
            const matchRemark = nameTrim && remarksLower.includes(nameTrim);
            return !matchPan && !matchDin && !matchMca && !matchName && !matchRemark;
          });
          if (c.passwords.length !== prevLen) {
            c.markModified('passwords');
            modified = true;
          }
        }

        // Check if this lead was the LAST remaining director of client c
        const remPromoters = (c.customerFiles?.promoter || []).filter((p: any) => p.name && p.name.trim() !== '').length;
        const remContacts = (c.contacts || []).length;
        if (remPromoters === 0 && remContacts === 0) {
          const { ClientService } = await import('../client/client.service');
          await ClientService.softDeleteClient(c._id.toString(), deletedBy);
        } else if (modified) {
          await c.save();
        }
      }
    } catch (err) {
      console.error('Error pruning client director associations on lead delete:', err);
    }

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
      companyName?: string;
      type: string;
      group: string;
      fileNo?: string;
      active?: boolean;
      services?: string[];
      users?: string[];
      directorDesignation?: string;
      directorShare?: string;
    },
    userCtx?: { userId: string | null; orgId?: string | null } | null
  ) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw AppError.notFound(ResponseMessages.LEAD_NOT_FOUND);
    }

    // Generate automatic unique fileNo if not supplied
    let fileNo = conversionData.fileNo;
    if (!fileNo) {
      fileNo = await CounterService.getNextClientFileNo();
    }

    const companyName = (conversionData.companyName || lead.businessName || lead.fullName || 'Company').trim();

    // Construct customerFiles: Lead is the director/promoter of this company
    const promoterFiles = [
      {
        key: 1,
        name: lead.fullName,
        pan: lead.pan || '',
        share: conversionData.directorShare || '100%',
        designation: conversionData.directorDesignation || 'Director / Promoter',
        mcaId: lead.mcaId || '',
        mcaPassword: lead.mcaPassword || '',
      },
    ];

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

    // Create company (client)
    const newClient = new Client({
      name: companyName,
      legalName: companyName,
      fileNo,
      type: conversionData.type,
      group: conversionData.group,
      mobile: lead.mobile,
      secondaryMobile: lead.aadhaarMobile || '',
      email: lead.email || '',



      pan: lead.pan || '',
      dob: lead.dob || '',
      referredBy: lead.referredBy || '',
      photo: lead.photo || null,
      active: conversionData.active ?? true,


      addressDetails: lead.addressDetails || {
        addressLine1: lead.address || '',


        country: lead.country || 'India',
      },
      paymentDetails: lead.paymentDetails || {},

      orgId: userCtx?.orgId || (lead as any).orgId || null,

      createdBy: userCtx?.userId || null,
      customerFiles: {
        promoter: promoterFiles,
        statutory: statutoryFiles,
        recurring: [],
      },
    });

    const savedClient = await newClient.save();
    if (Array.isArray(conversionData.services) && conversionData.services.length > 0) {
      try {
        await ClientServiceSetting.insertMany(
          conversionData.services.map((sName: string) => ({
            clientId: savedClient._id,
            orgId: savedClient.orgId || null,
            serviceName: sName,
            category: 'General',
            isActive: true,
            compliance: true,
            recTask: 'Enabled',
            frequency: 'Monthly',
            amount: 0,
            createdBy: userCtx?.userId || null,
          }))
        );
      } catch { }
    }

    // Link company to lead & update lead status
    lead.status = 'converted';
    lead.convertedToClientId = savedClient._id as Types.ObjectId;
    lead.convertedAt = lead.convertedAt || new Date();
    if (!lead.associatedClientIds) {
      lead.associatedClientIds = [];
    }
    if (!lead.associatedClientIds.some((id) => String(id) === String(savedClient._id))) {
      lead.associatedClientIds.push(savedClient._id as Types.ObjectId);
    }
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
    _userCtx?: { userId: string | null; orgId?: string | null; name?: string; email?: string; role?: string } | string | null
  ): Promise<Record<string, unknown>> {
    const baseMatch: Record<string, any> = { isDeleted: false };
    const deletedMatch: Record<string, any> = { isDeleted: true };

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

