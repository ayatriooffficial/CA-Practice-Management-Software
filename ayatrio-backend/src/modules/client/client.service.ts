import { Client } from './client.model';
import { IClient, IClientDocument } from './client.interface';
import { QueryBuilder, QueryOptions } from '../../shared/utils/queryBuilder';
import { AppError } from '../../shared/utils/apiError';
import { ResponseMessages } from '../../constants/messages';
import { PaginationMeta } from '../../shared/utils/apiResponse';

import { DriveService } from '../drive/drive.service';
import { DocumentCategory } from '../drive/drive.interface';

export class ClientService {
  /**
   * Helper to generate unique sequential file number: CL-YYYY-XXXX
   */
  private static async generateUniqueFileNo(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const count = await Client.countDocuments().setOptions({ includeDeleted: true });
    return `CL-${currentYear}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Register a new client
   */
  static async createClient(data: Partial<IClient>): Promise<IClientDocument> {
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
   * Retrieve paginated clients with advanced filters and search
   */
  static async getAllClients(
    queryOptions: QueryOptions
  ): Promise<{ items: IClientDocument[]; pagination: PaginationMeta }> {
    const searchableFields = ['name', 'fileNo', 'mobile', 'email', 'pan', 'city', 'tags'];
    const parsedQuery = QueryBuilder.parse<IClientDocument>(queryOptions, searchableFields);

    return await QueryBuilder.paginate<IClientDocument>(Client, parsedQuery);
  }

  /**
   * Retrieve client by ID
   */
  static async getClientById(id: string, includeDeleted: boolean = false): Promise<IClientDocument> {
    const query = Client.findById(id);
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
    const client = await Client.findById(id);
    if (!client) {
      throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    }

    // Validate fileNo uniqueness if changed
    if (updateData.fileNo && updateData.fileNo !== client.fileNo) {
      const conflict = await Client.findOne({
        _id: { $ne: id },
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
        _id: { $ne: id },
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
            clientId: id,
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
  static async getClientStats(): Promise<Record<string, unknown>> {
    const [totalClients, activeClients, inactiveClients, totalDeleted, typeBreakdown, groupBreakdown] =
      await Promise.all([
        Client.countDocuments({ isDeleted: false }),
        Client.countDocuments({ active: true, isDeleted: false }),
        Client.countDocuments({ active: false, isDeleted: false }),
        Client.countDocuments({ isDeleted: true }).setOptions({ includeDeleted: true }),
        Client.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Client.aggregate([
          { $match: { isDeleted: false } },
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
}
