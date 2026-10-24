import { Client } from './client.model';
import { IClient, IClientDocument } from './client.interface';
import { QueryBuilder, QueryOptions } from '../../shared/utils/queryBuilder';
import { AppError } from '../../shared/utils/apiError';
import { ResponseMessages } from '../../constants/messages';
import { PaginationMeta } from '../../shared/utils/apiResponse';

import { DriveService } from '../drive/drive.service';
import { DocumentCategory } from '../drive/drive.interface';
import { CounterService } from '../counter/counter.service';
import { AgentExecutionService } from '../agentCenter/execution.service';

export class ClientService {
  /**
   * Helper to generate unique sequential file number: CL-YYYY-XXXX via Dedicated Counter Collection
   */
  private static async generateUniqueFileNo(): Promise<string> {
    return CounterService.getNextClientFileNo();
  }

  /**
   * Register a new client
   */
  static async createClient(
    data: Partial<IClient>,
    userCtx?: { userId: string | null; orgId?: string | null } | string | null
  ): Promise<IClientDocument> {
    const userId = typeof userCtx === 'string' ? userCtx : userCtx?.userId;
    const orgId = typeof userCtx === 'object' ? userCtx?.orgId : undefined;
    if (orgId) {
      data.orgId = orgId;
    }
    if (userId) {
      data.userId = userId;
      data.createdBy = userId;
      if (!data.users) data.users = [];
      if (!data.users.includes(userId)) data.users.push(userId);
    }
    let fileNo = data.fileNo?.trim();
    if (!fileNo) {
      fileNo = await this.generateUniqueFileNo();
    } else {
      // Check if manually provided fileNo already exists
      const existingFileNo = await Client.findOne({ fileNo, isDeleted: false });
      if (existingFileNo) {
        throw AppError.conflict(ResponseMessages.CLIENT_FILE_NO_EXISTS);
      }
    }

    // Check PAN conflict if PAN is provided
    if (data.pan && data.pan.trim() !== '') {
      const existingPan = await Client.findOne({
        pan: data.pan.toUpperCase(),
        isDeleted: false,
      });
      if (existingPan) {
        throw AppError.conflict(ResponseMessages.CLIENT_PAN_EXISTS);
      }
    }

    // Process photo if base64 data was supplied
    if (data.photo && data.photo.startsWith('data:')) {
      try {
        const { url } = await DriveService.processAndUploadAttachment(
          data.photo,
          DocumentCategory.KYC_IDENTITY,
          {
            defaultName: `${data.name || 'client'}_photo`,
            clientName: data.name,
            description: `Profile photo for client ${data.name || fileNo}`,
          }
        );
        data.photo = url;
      } catch (err: any) {
        // Fall back or continue if optional
      }
    }

    // Process statutory file attachments if base64 was supplied
    if (data.customerFiles?.statutory && Array.isArray(data.customerFiles.statutory)) {
      for (const stat of data.customerFiles.statutory) {
        if (stat.attachment && stat.attachment.startsWith('data:')) {
          try {
            const { url } = await DriveService.processAndUploadAttachment(
              stat.attachment,
              DocumentCategory.KYC_IDENTITY,
              {
                defaultName: `${stat.type || 'statutory'}_${stat.idNo || 'doc'}`,
                clientName: data.name,
                description: `Statutory attachment (${stat.type}) for client ${data.name || fileNo}`,
              }
            );
            stat.attachment = url;
          } catch {
            // fallback
          }
        }
      }
    }

    const client = new Client({
      ...data,
      fileNo,
      pan: data.pan ? data.pan.toUpperCase() : '',
    });

    return await client.save();
  }

/**
   * Seed Turia Industries private Limited if not present
   */
  static async seedInitialClientsIfNeeded(): Promise<void> {
    try {
      const existing = await Client.findOne({ name: 'Turia Industries private Limited' }).setOptions({ includeDeleted: true });
      if (!existing) {
        await Client.create({
          name: 'Turia Industries private Limited',
          fileNo: 'PVT0000',
          type: 'Private Limited Company',
          mobile: '9876543210',
          email: 'compliance@turiaindustries.com',
          pan: 'ATVOO3872J',
          address: '104, Industrial Estate, Phase 2, Peenya',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560058',
          group: 'Corporate Clients',
          tags: ['Active GST', 'MCA Compliance', 'Statutory Audit'],
          active: true,
          status: 'Active',
          legalName: 'Turia Industries Private Limited',
          services: ['Monthly Accounting', 'GST Compliance', 'Advance Tax', 'ROC Annual Filing'],
          users: ['Milton', 'Likith', 'Kavin'],
          licenses: [
            {
              id: 'lic-1',
              name: 'FSSAI',
              licenseNo: '329833232',
              issuedDate: '09 Jul, 2026',
              expiryDate: '31 Jul, 2026',
              url: '-',
              file: 'fssai_cert.pdf',
              remarks: 'This is the final MOA',
            },
            {
              id: 'lic-2',
              name: 'Okay',
              licenseNo: '-',
              issuedDate: '-',
              expiryDate: '-',
              url: '-',
              file: null,
              remarks: '-',
            },
            {
              id: 'lic-3',
              name: 'PAN',
              licenseNo: 'ATVOO3872372J',
              issuedDate: '25 Nov, 2025',
              expiryDate: '-',
              url: '-',
              file: 'pan_card.pdf',
              remarks: '-',
            },
            {
              id: 'lic-4',
              name: 'Shop License',
              licenseNo: '-',
              issuedDate: '-',
              expiryDate: '-',
              url: '-',
              file: 'shop_act.xlsx',
              remarks: '-',
            },
          ],
          dscs: [
            {
              id: 'dsc-1',
              dscId: '#S00184',
              name: 'Kavin',
              issuedDate: '-',
              expiryDate: '20-05-2026',
              binNumber: '-',
              vendor: '-',
              class: '-',
              location: 'Missing',
              status: 'Expired',
              remarks: '-',
            },
            {
              id: 'dsc-2',
              dscId: '#S00180',
              name: 'Milton',
              issuedDate: '-',
              expiryDate: '10-12-2025',
              binNumber: '123',
              vendor: 'eMudhra',
              class: 'Class III',
              location: 'Client Office',
              status: 'Expired',
              remarks: '-',
            },
            {
              id: 'dsc-3',
              dscId: '#S00168',
              name: 'Lobo',
              issuedDate: '28-01-2025',
              expiryDate: '28-01-2027',
              binNumber: '-',
              vendor: '-',
              class: 'Class III',
              location: 'CA Office',
              status: 'Active',
              remarks: '-',
            },
          ],
          documentsInOut: [
            {
              id: 'doc-1',
              documentName: 'Share Certificate',
              personName: 'Likith',
              date: '30 Jun, 2026',
              status: 'In',
              returnable: 'Yes',
              returnDate: '03 Jul, 2026',
              remarks: 'test',
              file: null,
            },
            {
              id: 'doc-2',
              documentName: 'Bank Statement',
              personName: 'Rajesh from client',
              date: '05 May, 2026',
              status: 'Out',
              returnable: 'No',
              returnDate: '-',
              remarks: 'Handed over document...',
              file: null,
            },
            {
              id: 'doc-3',
              documentName: 'Share certificate',
              personName: 'Ramesh',
              date: '20 May, 2026',
              status: 'Out',
              returnable: 'No',
              returnDate: '-',
              remarks: 'share certificates hande...',
              file: null,
            },
            {
              id: 'doc-4',
              documentName: 'MSME 2025',
              personName: '-',
              date: '-',
              status: 'In',
              returnable: 'No',
              returnDate: '-',
              remarks: '-',
              file: 'msme_reg.pdf',
            },
            {
              id: 'doc-5',
              documentName: 'Valuation',
              personName: 'Milton',
              date: '06 Apr, 2026',
              status: 'Out',
              returnable: 'No',
              returnDate: '-',
              remarks: 'Milton from the clinets o...',
              file: null,
            },
            {
              id: 'doc-6',
              documentName: 'Audited financials',
              personName: 'Raju',
              date: '02 Apr, 2026',
              status: 'Out',
              returnable: 'No',
              returnDate: '-',
              remarks: 'Raju from the clinet offi...',
              file: null,
            },
            {
              id: 'doc-7',
              documentName: 'NCD, Bonds',
              personName: 'Raju',
              date: '31 Mar, 2026',
              status: 'In',
              returnable: 'No',
              returnDate: '-',
              remarks: 'audited financial colloc...',
              file: 'ncd_bonds.pdf',
            },
            {
              id: 'doc-8',
              documentName: 'Valuation',
              personName: 'Kavin',
              date: '30 Mar, 2026',
              status: 'Out',
              returnable: 'No',
              returnDate: '-',
              remarks: 'Valuation reprot handed...',
              file: null,
            },
            {
              id: 'doc-9',
              documentName: 'Certificate',
              personName: 'Raju',
              date: '27 Mar, 2026',
              status: 'Out',
              returnable: 'No',
              returnDate: '-',
              remarks: 'Raju collected documen...',
              file: null,
            },
          ],
          serviceSettings: [],
        });
      }
    } catch {
      // Continue gracefully
    }
  }

  /**
   * Retrieve paginated clients with advanced filters and search
   */
  static async getAllClients(
    queryOptions: QueryOptions,
    userCtx?: { userId: string | null; orgId?: string | null; name?: string; email?: string; role?: string } | string | null
  ): Promise<{ items: IClientDocument[]; pagination: PaginationMeta }> {
    const searchableFields = ['name', 'fileNo', 'mobile', 'email', 'pan', 'city', 'tags'];
    const parsedQuery = QueryBuilder.parse<IClientDocument>(queryOptions, searchableFields);

    const orgId = typeof userCtx === 'object' ? userCtx?.orgId : undefined;
    const userId = typeof userCtx === 'string' ? userCtx : userCtx?.userId;

    if (orgId) {
      const orgConditions: any[] = [
        { orgId },
        { orgId: String(orgId) },
      ];
      if (userId) {
        orgConditions.push({ userId }, { createdBy: userId }, { users: userId });
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
      const userCondition = { $or: [{ userId }, { createdBy: userId }, { users: userId }] };
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

    return await QueryBuilder.paginate<IClientDocument>(Client, parsedQuery);
  }

  /**
   * Retrieve client by ID
   */
  static async getClientById(id: string, includeDeleted: boolean = false): Promise<IClientDocument> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId
      ? Client.findById(id)
      : Client.findOne({ $or: [{ fileNo: id }, { name: id }] });
    if (includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }

    const client = await query.populate('leadId').exec();
    if (!client) {
      throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    }
    return client;
  }

  /**
   * Update client details
   */
  static async updateClientById(id: string, updateData: Partial<IClient>): Promise<IClientDocument> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const client = isObjectId
      ? await Client.findById(id)
      : await Client.findOne({ $or: [{ fileNo: id }, { name: id }] });
    if (!client) {
      throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    }

    // Validate fileNo uniqueness if changed
    if (updateData.fileNo && updateData.fileNo !== client.fileNo) {
      const conflict = await Client.findOne({
        _id: { $ne: client._id },
        fileNo: updateData.fileNo,
        isDeleted: false,
      });
      if (conflict) {
        throw AppError.conflict(ResponseMessages.CLIENT_FILE_NO_EXISTS);
      }
    }

    // Validate PAN uniqueness if changed
    if (updateData.pan && updateData.pan.toUpperCase() !== client.pan) {
      const conflict = await Client.findOne({
        _id: { $ne: client._id },
        pan: updateData.pan.toUpperCase(),
        isDeleted: false,
      });
      if (conflict) {
        throw AppError.conflict(ResponseMessages.CLIENT_PAN_EXISTS);
      }
    }

    // Process photo if base64 data was supplied in update
    if (updateData.photo && updateData.photo.startsWith('data:')) {
      try {
        const { url } = await DriveService.processAndUploadAttachment(
          updateData.photo,
          DocumentCategory.KYC_IDENTITY,
          {
            defaultName: `${client.name || 'client'}_photo`,
            clientId: String(client._id),
            clientName: client.name,
            description: `Updated profile photo for client ${client.name}`,
          }
        );
        updateData.photo = url;
      } catch {
        // keep fallback
      }
    }

    Object.assign(client, updateData);
    if (updateData.pan) {
      client.pan = updateData.pan.toUpperCase();
    }
    if (updateData.serviceSettings) {
      client.markModified('serviceSettings');
      const activeNames = updateData.serviceSettings
        .filter((s: any) => s.compliance)
        .map((s: any) => s.serviceName);
      client.services = activeNames;
      client.markModified('services');
    }
    if (updateData.licenses) client.markModified('licenses');
    if (updateData.documentsInOut) client.markModified('documentsInOut');
    if (updateData.dscs) client.markModified('dscs');
    if (updateData.passwords) client.markModified('passwords');
    if (updateData.notes) client.markModified('notes');

    return await client.save();
  }

  /**
   * Directly upload and verify Client Photo to Google Drive
   */
  static async uploadClientPhoto(
    id: string,
    file: Express.Multer.File
  ): Promise<{ photoUrl: string; client: IClientDocument }> {
    const client = await Client.findById(id);
    if (!client) {
      throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    }

    const { url } = await DriveService.processAndUploadAttachment(
      file,
      DocumentCategory.KYC_IDENTITY,
      {
        defaultName: `${client.name}_photo`,
        clientId: id,
        clientName: client.name,
        description: `Verified profile photo for client ${client.name} (${client.fileNo})`,
        tags: ['Client-Photo', 'KYC'],
      }
    );

    client.photo = url;
    await client.save();

    return { photoUrl: url, client };
  }

  /**
   * Upload and attach statutory file (e.g. GST, PAN, Certificate) directly to Google Drive
   */
  static async uploadClientStatutoryAttachment(
    id: string,
    file: Express.Multer.File,
    key?: number,
    statutoryType?: string,
    idNo?: string
  ): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) {
      throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    }

    const { url } = await DriveService.processAndUploadAttachment(
      file,
      DocumentCategory.KYC_IDENTITY,
      {
        defaultName: `${client.name}_${statutoryType || 'statutory'}_doc`,
        clientId: id,
        clientName: client.name,
        description: `Statutory attachment (${statutoryType || 'Document'}) for client ${client.name}`,
        tags: ['Statutory', statutoryType || 'KYC'],
      }
    );

    // If key provided, update matching row, otherwise create new entry
    const statutoryList = client.customerFiles.statutory;
    let targetRow = key ? statutoryList.find((r) => r.key === key) : null;

    if (targetRow) {
      targetRow.attachment = url;
    } else {
      const nextKey = statutoryList.length > 0 ? Math.max(...statutoryList.map((x) => x.key || 0)) + 1 : 1;
      statutoryList.push({
        key: nextKey,
        type: statutoryType || 'Other Document',
        idNo: idNo || 'N/A',
        attachment: url,
      });
    }

    await client.save();
    return client;
  }

  /**
   * Upload any general/compliance document for a client to Google Drive
   */
  static async uploadClientDocument(
    id: string,
    file: Express.Multer.File,
    category: DocumentCategory = DocumentCategory.GENERAL,
    description?: string,
    tags: string[] = []
  ): Promise<any> {
    const client = await Client.findById(id);
    if (!client) {
      throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    }

    return await DriveService.uploadDocument(file, {
      category,
      description: description || `Document uploaded for client ${client.name}`,
      clientId: id,
      clientName: client.name,
      tags: [...tags, 'Client-Document'],
    });
  }

  /**
   * Soft delete client
   */
  static async softDeleteClient(id: string, deletedBy?: string): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) {
      throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    }

    await client.softDelete(deletedBy);
    return client;
  }

  /**
   * Restore soft-deleted client
   */
  static async restoreClient(id: string): Promise<IClientDocument> {
    const client = await Client.findOne({ _id: id }).setOptions({ includeDeleted: true });
    if (!client) {
      throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    }

    if (!client.isDeleted) {
      throw AppError.badRequest('This client record is currently active and not deleted.');
    }

    await client.restore();
    return client;
  }

  /**
   * Permanently hard-delete client
   */
  static async permanentDeleteClient(id: string): Promise<void> {
    const result = await Client.findByIdAndDelete(id).setOptions({ includeDeleted: true });
    if (!result) {
      throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    }
  }

  /**
   * Add item to customerFiles sub-arrays (promoter, statutory, recurring)
   */
  static async addCustomerFileItem(
    clientId: string,
    fileType: 'promoter' | 'statutory' | 'recurring',
    itemData: Record<string, unknown>
  ): Promise<IClientDocument> {
    const client = await Client.findById(clientId);
    if (!client) {
      throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    }

    const currentList = client.customerFiles[fileType] as any[];
    const nextKey = currentList.length > 0 ? Math.max(...currentList.map((x) => x.key || 0)) + 1 : 1;
    itemData.key = nextKey;

    currentList.push(itemData);
    await client.save();
    return client;
  }

  /**
   * Remove item from customerFiles sub-arrays
   */
  static async removeCustomerFileItem(
    clientId: string,
    fileType: 'promoter' | 'statutory' | 'recurring',
    itemIdOrKey: string | number
  ): Promise<IClientDocument> {
    const client = await Client.findById(clientId);
    if (!client) {
      throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    }

    const currentList = client.customerFiles[fileType] as any[];
    const index = currentList.findIndex(
      (item) => String(item._id) === String(itemIdOrKey) || String(item.key) === String(itemIdOrKey)
    );

    if (index === -1) {
      throw AppError.notFound(`File entry not found in ${fileType}`);
    }

    currentList.splice(index, 1);
    await client.save();
    return client;
  }

  /**
   * Aggregate client summary statistics
   */
  static async getClientStats(
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
      if (userId) {
        orgConditions.push({ userId }, { createdBy: userId }, { users: userId });
      }
      baseMatch.$or = orgConditions;
      deletedMatch.$or = orgConditions;
    } else if (userId) {
      const orClauses: any[] = [
        { userId },
        { createdBy: userId },
        { users: userId },
      ];
      baseMatch.$or = orClauses;
      deletedMatch.$or = orClauses;
    }

    const [totalClients, activeClients, inactiveClients, totalDeleted, typeBreakdown, groupBreakdown] =
      await Promise.all([
        Client.countDocuments(baseMatch),
        Client.countDocuments({ ...baseMatch, active: true }),
        Client.countDocuments({ ...baseMatch, active: false }),
        Client.countDocuments(deletedMatch).setOptions({ includeDeleted: true }),
        Client.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Client.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$group', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ]);

    return {
      totalClients,
      activeClients,
      inactiveClients,
      totalDeleted,
      byType: typeBreakdown.map((t) => ({ type: t._id, count: t.count })),
      topGroups: groupBreakdown.map((g) => ({ group: g._id, count: g.count })),
    };
  }

  /**
   * Add a License to Client
   */
  static async addLicense(id: string, data: any): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    const newLicense = {
      id: data.id || `lic-${Date.now()}`,
      name: data.name,
      licenseNo: data.licenseNo || '-',
      issuedDate: data.issuedDate || '-',
      expiryDate: data.expiryDate || '-',
      url: data.url || '-',
      file: data.file || null,
      remarks: data.remarks || '',
    };
    client.licenses = client.licenses || [];
    client.licenses.unshift(newLicense);
    client.markModified('licenses');
    const saved = await client.save();
    if (saved.orgId) {
      void AgentExecutionService.dispatchLicenseEvent(
        String(saved.orgId),
        'License Created',
        {
          clientId: String(saved._id),
          clientName: saved.name,
          license: newLicense,
        },
        `lic-created:${String(saved._id)}:${newLicense.id}`
      ).catch(() => []);
    }
    return saved;
  }

  /**
   * Delete a License from Client
   */
  static async deleteLicense(id: string, licenseId: string): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    client.licenses = (client.licenses || []).filter((l: any) => l.id !== licenseId && l._id?.toString() !== licenseId);
    client.markModified('licenses');
    return await client.save();
  }

  /**
   * Add a DSC to Client
   */
  static async addDsc(id: string, data: any): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    const newDsc = {
      id: data.id || `dsc-${Date.now()}`,
      dscId: data.dscId || `#S00${Math.floor(100 + Math.random() * 900)}`,
      name: data.name,
      issuedDate: data.issuedDate || '-',
      expiryDate: data.expiryDate || '-',
      binNumber: data.binNumber || '-',
      vendor: data.vendor || '-',
      class: data.class || 'Class III',
      location: data.location || 'CA Office',
      status: data.status || 'Active',
      remarks: data.remarks || '',
    };
    client.dscs = client.dscs || [];
    client.dscs.unshift(newDsc);
    client.markModified('dscs');
    const saved = await client.save();
    if (saved.orgId) {
      void AgentExecutionService.dispatchDscEvent(
        String(saved.orgId),
        'DSC Created',
        {
          clientId: String(saved._id),
          clientName: saved.name,
          dsc: newDsc,
        },
        `dsc-created:${String(saved._id)}:${newDsc.id}`
      ).catch(() => []);
    }
    return saved;
  }

  /**
   * Delete a DSC from Client
   */
  static async deleteDsc(id: string, dscId: string): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    client.dscs = (client.dscs || []).filter((d: any) => d.id !== dscId && d._id?.toString() !== dscId);
    client.markModified('dscs');
    return await client.save();
  }

  /**
   * Add a Document In - Out movement to Client
   */
  static async addDocumentInOut(id: string, data: any): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    const newDoc = {
      id: data.id || `doc-${Date.now()}`,
      documentName: data.documentName,
      personName: data.personName,
      date: data.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: data.status || 'In',
      returnable: data.returnable || 'No',
      returnDate: data.returnDate || '-',
      remarks: data.remarks || '',
      file: data.file || null,
    };
    client.documentsInOut = client.documentsInOut || [];
    client.documentsInOut.unshift(newDoc);
    client.markModified('documentsInOut');
    return await client.save();
  }

  /**
   * Delete a Document In - Out movement from Client
   */
  static async deleteDocumentInOut(id: string, docId: string): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    client.documentsInOut = (client.documentsInOut || []).filter((d: any) => d.id !== docId && d._id?.toString() !== docId);
    client.markModified('documentsInOut');
    return await client.save();
  }

  /**
   * Update Service Settings for Client
   */
  static async updateServiceSettings(id: string, settings: any[]): Promise<IClientDocument> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const client = isObjectId
      ? await Client.findById(id)
      : await Client.findOne({ $or: [{ fileNo: id }, { name: id }] });
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    client.serviceSettings = settings;

    // Keep client.services in sync with enabled services
    const activeNames = settings.filter((s: any) => s.compliance).map((s: any) => s.serviceName);
    client.services = activeNames;

    client.markModified('serviceSettings');
    client.markModified('services');
    return await client.save();
  }

  /**
   * Add a Password / Credential to Client
   */
  static async addPassword(id: string, data: any): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    const newPwd = {
      id: data.id || `pwd-${Date.now()}`,
      portal: data.portal || 'Income Tax',
      userId: data.userId || data.username || '',
      password: data.password || '',
      url: data.url || '',
      remarks: data.remarks || '',
    };
    client.passwords = client.passwords || [];
    client.passwords.unshift(newPwd);
    client.markModified('passwords');
    return await client.save();
  }

  /**
   * Delete a Password from Client
   */
  static async deletePassword(id: string, pwdId: string): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    client.passwords = (client.passwords || []).filter((p: any) => p.id !== pwdId && p._id?.toString() !== pwdId);
    client.markModified('passwords');
    return await client.save();
  }

  /**
   * Add a Note to Client
   */
  static async addNote(id: string, data: any): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    const newNote = {
      id: data.id || `note-${Date.now()}`,
      title: data.title || 'Client Note',
      content: data.content,
      author: data.author || 'Admin',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    client.notes = client.notes || [];
    client.notes.unshift(newNote);
    client.markModified('notes');
    return await client.save();
  }

  /**
   * Delete a Note from Client
   */
  static async deleteNote(id: string, noteId: string): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    client.notes = (client.notes || []).filter((n: any) => n.id !== noteId && n._id?.toString() !== noteId);
    client.markModified('notes');
    return await client.save();
  }
}
