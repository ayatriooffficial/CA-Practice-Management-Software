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
import { Lead } from '../lead/lead.model';

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

    // Sync services array and serviceSettings from customerFiles.recurring if present
    if (data.customerFiles?.recurring && Array.isArray(data.customerFiles.recurring)) {
      const recurringServiceNames = data.customerFiles.recurring
        .map((r) => r.service?.trim())
        .filter((s): s is string => Boolean(s));

      if (!data.services) {
        data.services = [];
      }
      for (const sName of recurringServiceNames) {
        if (!data.services.includes(sName)) {
          data.services.push(sName);
        }
      }

      if (!data.serviceSettings) {
        data.serviceSettings = [];
      }
      for (const r of data.customerFiles.recurring) {
        if (r.service && !data.serviceSettings.some((s) => s.serviceName === r.service)) {
          data.serviceSettings.push({
            serviceName: r.service,
            category: r.category || 'General',
            compliance: true,
            isActive: true,
            recTask: 'Enabled',
            recInvoice: 'Enabled',
            frequency: 'Monthly',
            start: 'Day 1',
            target: 'Day 15',
            end: 'Day 20',
            amount: parseFloat(r.tariff) || 0,
          });
        }
      }
    }

    // Sync contacts from customerFiles.promoter
    if (data.customerFiles?.promoter && Array.isArray(data.customerFiles.promoter)) {
      if (!data.contacts) data.contacts = [];
      const existingContactNames = new Set(data.contacts.map((c: any) => c.name?.toLowerCase()));
      data.customerFiles.promoter.forEach((p, i) => {
        if (p.name && !existingContactNames.has(p.name.toLowerCase())) {
          data.contacts!.push({
            name: p.name,
            isPrimary: i === 0 && data.contacts!.length === 0,
            designation: p.designation || 'Director',
            pan: p.pan || undefined,
            din: p.mcaId || undefined,
            mcaId: p.mcaId || undefined,
            mcaPassword: p.mcaPassword || undefined,
            dinStatus: 'Active',
          });
          existingContactNames.add(p.name.toLowerCase());
        }
      });
    }

    // Sync licenses, passwords, and documentsInOut from customerFiles.statutory
    if (data.customerFiles?.statutory && Array.isArray(data.customerFiles.statutory)) {
      if (!data.licenses) data.licenses = [];
      const existingLicNames = new Set(data.licenses.map((l: any) => l.name?.toLowerCase()));
      data.customerFiles.statutory.forEach((s) => {
        if (s.type && !existingLicNames.has(s.type.toLowerCase())) {
          data.licenses!.push({
            name: s.type,
            licenseNo: s.idNo || '-',
            file: s.attachment || null,
            fileUrl: s.attachment || undefined,
            remarks: s.userId ? `User ID: ${s.userId}` : undefined,
          });
          existingLicNames.add(s.type.toLowerCase());
        }
      });

      if (!data.passwords) data.passwords = [];
      const existingPwdPortals = new Set(data.passwords.map((p: any) => p.portal?.toLowerCase()));
      data.customerFiles.statutory.forEach((s) => {
        if ((s.userId || s.password) && s.type && !existingPwdPortals.has(s.type.toLowerCase())) {
          data.passwords!.push({
            portal: s.type,
            userId: s.userId || '-',
            password: s.password || '',
            remarks: s.idNo ? `ID: ${s.idNo}` : undefined,
          });
          existingPwdPortals.add(s.type.toLowerCase());
        }
      });

      if (Array.isArray(data.customerFiles.promoter)) {
        data.customerFiles.promoter.forEach((p: any) => {
          if ((p.mcaId || p.mcaPassword) && p.name) {
            const portalName = `MCA Portal (${p.name})`;
            if (!existingPwdPortals.has(portalName.toLowerCase())) {
              data.passwords!.push({
                portal: portalName,
                userId: p.mcaId || '-',
                password: p.mcaPassword || '',
                remarks: p.pan ? `PAN: ${p.pan}` : undefined,
              });
              existingPwdPortals.add(portalName.toLowerCase());
            }
          }
        });
      }

      if (!data.documentsInOut) data.documentsInOut = [];
      const existingDocNames = new Set(data.documentsInOut.map((d: any) => d.documentName?.toLowerCase()));
      data.customerFiles.statutory.forEach((s) => {
        const docName = `${s.type} Registration Document`;
        if (s.attachment && !existingDocNames.has(docName.toLowerCase())) {
          data.documentsInOut!.push({
            documentName: docName,
            personName: data.name || 'Client',
            date: new Date().toISOString().split('T')[0],
            status: 'In',
            returnable: false,
            file: s.attachment,
            fileUrl: s.attachment,
            remarks: `Statutory Type: ${s.type}, ID: ${s.idNo || '-'}`,
          });
          existingDocNames.add(docName.toLowerCase());
        }
      });
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
        { orgId: null },
        { orgId: { $exists: false } },
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
    if (updateData.customerFiles) {
      client.markModified('customerFiles');
      if (Array.isArray(updateData.customerFiles.recurring)) {
        const recurringNames = updateData.customerFiles.recurring
          .map((r: any) => r.service?.trim())
          .filter((s: any): s is string => Boolean(s));
        if (recurringNames.length > 0) {
          const currentServices = Array.isArray(client.services) ? [...client.services] : [];
          for (const sName of recurringNames) {
            if (!currentServices.includes(sName)) {
              currentServices.push(sName);
            }
          }
          client.services = currentServices;
          client.markModified('services');
        }
      }

      if (Array.isArray(updateData.customerFiles.promoter)) {
        const currentContacts = Array.isArray(client.contacts) ? [...client.contacts] : [];
        const existingNames = new Set(currentContacts.map((c: any) => c.name?.toLowerCase()));
        updateData.customerFiles.promoter.forEach((p: any, i: number) => {
          if (p.name && !existingNames.has(p.name.toLowerCase())) {
            currentContacts.push({
              name: p.name,
              isPrimary: i === 0 && currentContacts.length === 0,
              designation: p.designation || 'Director',
              pan: p.pan || undefined,
              din: p.mcaId || undefined,
              mcaId: p.mcaId || undefined,
              mcaPassword: p.mcaPassword || undefined,
              dinStatus: 'Active',
            });
            existingNames.add(p.name.toLowerCase());
          } else if (p.name) {
            const existingIdx = currentContacts.findIndex((c: any) => c.name?.toLowerCase() === p.name.toLowerCase());
            if (existingIdx >= 0) {
              if (p.mcaId) {
                currentContacts[existingIdx].mcaId = p.mcaId;
                currentContacts[existingIdx].din = currentContacts[existingIdx].din || p.mcaId;
              }
              if (p.mcaPassword) {
                currentContacts[existingIdx].mcaPassword = p.mcaPassword;
              }
            }
          }
        });
        client.contacts = currentContacts;
        client.markModified('contacts');
      }

      if (Array.isArray(updateData.customerFiles.statutory)) {
        const currentLicenses = Array.isArray(client.licenses) ? [...client.licenses] : [];
        const existingLicNames = new Set(currentLicenses.map((l: any) => l.name?.toLowerCase()));
        updateData.customerFiles.statutory.forEach((s: any) => {
          if (s.type && !existingLicNames.has(s.type.toLowerCase())) {
            currentLicenses.push({
              name: s.type,
              licenseNo: s.idNo || '-',
              file: s.attachment || null,
              fileUrl: s.attachment || undefined,
              remarks: s.userId ? `User ID: ${s.userId}` : undefined,
            });
            existingLicNames.add(s.type.toLowerCase());
          }
        });
        client.licenses = currentLicenses;
        client.markModified('licenses');

        const currentPasswords = Array.isArray(client.passwords) ? [...client.passwords] : [];
        const existingPwdPortals = new Set(currentPasswords.map((p: any) => p.portal?.toLowerCase()));
        updateData.customerFiles.statutory.forEach((s: any) => {
          if ((s.userId || s.password) && s.type && !existingPwdPortals.has(s.type.toLowerCase())) {
            currentPasswords.push({
              portal: s.type,
              userId: s.userId || '-',
              password: s.password || '',
              remarks: s.idNo ? `ID: ${s.idNo}` : undefined,
            });
            existingPwdPortals.add(s.type.toLowerCase());
          }
        });
        client.passwords = currentPasswords;
        client.markModified('passwords');

        const currentDocs = Array.isArray(client.documentsInOut) ? [...client.documentsInOut] : [];
        const existingDocNames = new Set(currentDocs.map((d: any) => d.documentName?.toLowerCase()));
        updateData.customerFiles.statutory.forEach((s: any) => {
          const docName = `${s.type} Registration Document`;
          if (s.attachment && !existingDocNames.has(docName.toLowerCase())) {
            currentDocs.push({
              documentName: docName,
              personName: client.name || 'Client',
              date: new Date().toISOString().split('T')[0],
              status: 'In',
              returnable: false,
              file: s.attachment,
              fileUrl: s.attachment,
              remarks: `Statutory Type: ${s.type}, ID: ${s.idNo || '-'}`,
            });
            existingDocNames.add(docName.toLowerCase());
          }
        });
        client.documentsInOut = currentDocs;
        client.markModified('documentsInOut');
      }
    }
    if (updateData.serviceSettings) {
      client.markModified('serviceSettings');
      updateData.serviceSettings = updateData.serviceSettings.map((s: any) => {
        const active = s.isActive !== undefined ? Boolean(s.isActive) : Boolean(s.compliance);
        return {
          ...s,
          isActive: active,
          compliance: active,
          recTask: active ? (s.recTask === 'Disabled' ? 'Enabled' : s.recTask || 'Enabled') : 'Disabled',
        };
      });
      const activeNames = updateData.serviceSettings
        .filter((s: any) => s.isActive || s.compliance)
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
        { orgId: null },
        { orgId: { $exists: false } },
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

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(currentYear, currentMonth, 1);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendBuckets: Array<{ month: string; start: Date; end: Date }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const nextD = new Date(y, m + 1, 1);
      trendBuckets.push({
        month: monthNames[m],
        start: d,
        end: nextD,
      });
    }

    const [
      totalClients,
      activeClients,
      inactiveClients,
      totalDeleted,
      newThisWeek,
      newThisMonth,
      clientsToConvertCount,
      typeBreakdown,
      groupBreakdown,
      ...trendCounts
    ] = await Promise.all([
      Client.countDocuments(baseMatch),
      Client.countDocuments({ ...baseMatch, active: true }),
      Client.countDocuments({ ...baseMatch, active: false }),
      Client.countDocuments(deletedMatch).setOptions({ includeDeleted: true }),
      Client.countDocuments({ ...baseMatch, createdAt: { $gte: sevenDaysAgo } }),
      Client.countDocuments({ ...baseMatch, createdAt: { $gte: startOfMonth } }),
      Lead.countDocuments({ ...baseMatch, status: { $in: ['new', 'contacted', 'qualified'] } }).catch(() => 0),
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
      ...trendBuckets.map((b) =>
        Client.countDocuments({
          ...baseMatch,
          createdAt: { $gte: b.start, $lt: b.end },
        })
      ),
    ]);

    const registrationTrend = trendBuckets.map((b, idx) => ({
      month: b.month,
      count: trendCounts[idx] || 0,
    }));

    return {
      totalClients,
      activeClients,
      inactiveClients,
      totalDeleted,
      newThisWeek,
      newThisMonth: Math.max(newThisMonth, newThisWeek),
      clientsToConvert: clientsToConvertCount || inactiveClients,
      registrationTrend,
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
    const fileUrl = data.fileUrl || (data.file && (data.file.startsWith('http') || data.file.startsWith('/')) ? data.file : null);
    const newLicense = {
      id: data.id || `lic-${Date.now()}`,
      name: data.name,
      licenseNo: data.licenseNo || '-',
      issuedDate: data.issuedDate || '-',
      expiryDate: data.expiryDate || '-',
      url: data.url || '-',
      file: data.file || null,
      fileUrl: fileUrl,
      driveFileId: data.driveFileId || null,
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
   * Update a License for Client
   */
  static async updateLicense(id: string, licenseId: string, data: any): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    let updatedLicense: any = null;
    let oldLicense: any = null;

    client.licenses = (client.licenses || []).map((l: any) => {
      if (l.id === licenseId || l._id?.toString() === licenseId || l.licenseNo === licenseId) {
        oldLicense = { ...l };
        updatedLicense = {
          ...l,
          ...data,
          fileUrl: data.fileUrl !== undefined ? data.fileUrl : l.fileUrl,
          driveFileId: data.driveFileId !== undefined ? data.driveFileId : l.driveFileId,
          id: l.id || licenseId,
        };
        return updatedLicense;
      }
      return l;
    });

    if (!updatedLicense) {
      throw AppError.notFound('License record not found');
    }

    client.markModified('licenses');
    const saved = await client.save();

    if (saved.orgId && updatedLicense) {
      const isRenewed = Boolean(
        (data.expiryDate && data.expiryDate !== oldLicense?.expiryDate) ||
        (data.status && String(data.status).toLowerCase() === 'active' && String(oldLicense?.status).toLowerCase() !== 'active') ||
        data.isRenewal
      );

      if (isRenewed) {
        const prevExpiry = oldLicense?.expiryDate || 'none';
        const newExpiry = updatedLicense.expiryDate || 'none';
        void AgentExecutionService.dispatchLicenseEvent(
          String(saved.orgId),
          'License Renewed',
          {
            clientId: String(saved._id),
            clientName: saved.name,
            clientEmail: saved.email || '',
            clientMobile: saved.mobile || '',
            license: updatedLicense,
            previousExpiryDate: prevExpiry,
          },
          `lic-renewed:${String(saved._id)}:${updatedLicense.id || licenseId}:${prevExpiry}->${newExpiry}`
        ).catch(() => []);
      }
    }

    return saved;
  }

  /**
   * Delete a License from Client
   */
  static async deleteLicense(id: string, licenseId: string): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    const deletedLicense = (client.licenses || []).find((l: any) => l.id === licenseId || l._id?.toString() === licenseId || l.licenseNo === licenseId);
    client.licenses = (client.licenses || []).filter((l: any) => l.id !== licenseId && l._id?.toString() !== licenseId && l.licenseNo !== licenseId);
    client.markModified('licenses');
    const saved = await client.save();
    if (saved.orgId && deletedLicense) {
      void AgentExecutionService.dispatchLicenseEvent(
        String(saved.orgId),
        'License Deleted',
        {
          clientId: String(saved._id),
          clientName: saved.name,
          clientEmail: saved.email || '',
          clientMobile: saved.mobile || '',
          license: deletedLicense,
        },
        `lic-deleted:${String(saved._id)}:${deletedLicense.id || licenseId}`
      ).catch(() => []);
    }
    return saved;
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
   * Update a DSC for Client
   */
  static async updateDsc(id: string, dscId: string, data: any): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);

    let updatedDsc: any = null;
    let oldDsc: any = null;

    client.dscs = (client.dscs || []).map((d: any) => {
      if (d.id === dscId || d._id?.toString() === dscId || d.dscId === dscId) {
        oldDsc = { ...d };
        updatedDsc = {
          ...d,
          ...data,
          id: d.id || dscId,
        };
        return updatedDsc;
      }
      return d;
    });

    if (!updatedDsc) {
      throw AppError.notFound('DSC record not found');
    }

    client.markModified('dscs');
    const saved = await client.save();

    if (saved.orgId && updatedDsc) {
      const isRenewed = Boolean(
        (data.expiryDate && data.expiryDate !== oldDsc?.expiryDate) ||
        (data.status && String(data.status).toLowerCase() === 'active' && String(oldDsc?.status).toLowerCase() !== 'active') ||
        data.isRenewal
      );

      if (isRenewed) {
        const prevExpiry = oldDsc?.expiryDate || 'none';
        const newExpiry = updatedDsc.expiryDate || 'none';
        void AgentExecutionService.dispatchDscEvent(
          String(saved.orgId),
          'DSC Renewed',
          {
            clientId: String(saved._id),
            clientName: saved.name,
            clientEmail: saved.email || '',
            clientMobile: saved.mobile || '',
            dsc: updatedDsc,
            previousExpiryDate: prevExpiry,
          },
          `dsc-renewed:${String(saved._id)}:${updatedDsc.id || dscId}:${prevExpiry}->${newExpiry}`
        ).catch(() => []);
      }
    }

    return saved;
  }

  /**
   * Delete a DSC from Client
   */
  static async deleteDsc(id: string, dscId: string): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    const deletedDsc = (client.dscs || []).find((d: any) => d.id === dscId || d._id?.toString() === dscId || d.dscId === dscId);
    client.dscs = (client.dscs || []).filter((d: any) => d.id !== dscId && d._id?.toString() !== dscId && d.dscId !== dscId);
    client.markModified('dscs');
    const saved = await client.save();
    if (saved.orgId && deletedDsc) {
      void AgentExecutionService.dispatchDscEvent(
        String(saved.orgId),
        'DSC Deleted',
        {
          clientId: String(saved._id),
          clientName: saved.name,
          clientEmail: saved.email || '',
          clientMobile: saved.mobile || '',
          dsc: deletedDsc,
        },
        `dsc-deleted:${String(saved._id)}:${deletedDsc.id || dscId}`
      ).catch(() => []);
    }
    return saved;
  }

  /**
   * Fetch all global DSCs across all clients using an aggregation pipeline
   */
  static async getAllGlobalDscs(
    userCtx?: { userId: string | null; orgId?: string | null } | string | null
  ): Promise<any[]> {
    const orgId = typeof userCtx === 'object' ? userCtx?.orgId : undefined;
    const matchStage: Record<string, any> = {
      isDeleted: { $ne: true },
      dscs: { $exists: true, $not: { $size: 0 } },
    };

    if (orgId) {
      matchStage.$or = [{ orgId }, { orgId: String(orgId) }];
    }

    return await Client.aggregate([
      { $match: matchStage },
      { $unwind: '$dscs' },
      {
        $project: {
          _id: { $ifNull: ['$dscs._id', '$dscs.id'] },
          id: { $ifNull: ['$dscs.id', { $toString: '$dscs._id' }] },
          dscId: '$dscs.dscId',
          name: '$dscs.name',
          issuedDate: '$dscs.issuedDate',
          expiryDate: '$dscs.expiryDate',
          binNumber: '$dscs.binNumber',
          vendor: '$dscs.vendor',
          class: '$dscs.class',
          location: '$dscs.location',
          status: '$dscs.status',
          remarks: '$dscs.remarks',
          clientId: '$_id',
          clientName: { $ifNull: ['$name', '$companyName'] },
          clientFileNo: '$fileNo',
        },
      },
      {
        $sort: { expiryDate: 1, issuedDate: -1 },
      },
    ]);
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
   * Update a Document In - Out movement for Client
   */
  static async updateDocumentInOut(id: string, docId: string, data: any): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    client.documentsInOut = (client.documentsInOut || []).map((d: any) => {
      if (d.id === docId || d._id?.toString() === docId) {
        return {
          ...d,
          ...data,
          id: d.id || docId,
        };
      }
      return d;
    });
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
    const normalizedSettings = (settings || []).map((s: any) => {
      const active = s.isActive !== undefined ? Boolean(s.isActive) : Boolean(s.compliance);
      return {
        ...s,
        isActive: active,
        compliance: active,
        recTask: active ? (s.recTask === 'Disabled' ? 'Enabled' : s.recTask || 'Enabled') : 'Disabled',
      };
    });

    client.serviceSettings = normalizedSettings;

    // Keep client.services in sync with enabled services
    const activeNames = normalizedSettings
      .filter((s: any) => s.isActive || s.compliance)
      .map((s: any) => s.serviceName);
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

  /**
   * Add a Contact to Client
   */
  static async addContact(id: string, data: any): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    const newContact = {
      id: data.id || `cnt-${Date.now()}`,
      name: data.name || '',
      isPrimary: Boolean(data.isPrimary),
      designation: data.designation || 'Director',
      din: data.din || '',
      dinStatus: data.dinStatus || 'Active',
      mcaId: data.mcaId || data.din || '',
      mcaPassword: data.mcaPassword || '',
      appointmentDate: data.appointmentDate || '',
      dob: data.dob || '',
      email: data.email || '',
      mobile: data.mobile || '',
      pan: data.pan || '',
      aadhar: data.aadhar || '',
      passport: data.passport || '',
      fatherName: data.fatherName || '',
      address: data.address || '',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    client.contacts = client.contacts || [];
    // If marked as primary, unmark previous primaries
    if (newContact.isPrimary) {
      client.contacts.forEach((c: any) => (c.isPrimary = false));
    }
    client.contacts.unshift(newContact);
    client.markModified('contacts');

    // Also sync to customerFiles.promoter if matching
    if (client.customerFiles?.promoter) {
      const pIdx = client.customerFiles.promoter.findIndex(
        (p: any) =>
          (p.name && p.name.trim().toLowerCase() === newContact.name.trim().toLowerCase()) ||
          (newContact.pan && p.pan && p.pan.trim().toUpperCase() === newContact.pan.trim().toUpperCase())
      );
      if (pIdx >= 0) {
        if (newContact.mcaId) client.customerFiles.promoter[pIdx].mcaId = newContact.mcaId;
        if (newContact.mcaPassword) client.customerFiles.promoter[pIdx].mcaPassword = newContact.mcaPassword;
        client.markModified('customerFiles');
      }
    }
    return await client.save();
  }

  /**
   * Update a Contact on Client
   */
  static async updateContact(id: string, contactId: string, data: any): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    if (!client.contacts) {
      client.contacts = [];
    }

    const contacts = client.contacts;
    const idx = contacts.findIndex((c: any) => c.id === contactId || c._id?.toString() === contactId);
    if (idx === -1) {
      throw AppError.notFound('Contact not found');
    }

    if (data.isPrimary) {
      contacts.forEach((c: any) => (c.isPrimary = false));
    }

    contacts[idx] = {
      ...contacts[idx],
      ...data,
      mcaId: data.mcaId !== undefined ? data.mcaId : (contacts[idx].mcaId || contacts[idx].din || ''),
      mcaPassword: data.mcaPassword !== undefined ? data.mcaPassword : (contacts[idx].mcaPassword || ''),
      id: contacts[idx].id || contactId,
      updatedAt: new Date().toISOString(),
    };

    client.markModified('contacts');

    // Also sync to customerFiles.promoter if matching
    if (client.customerFiles?.promoter) {
      const pIdx = client.customerFiles.promoter.findIndex(
        (p: any) =>
          (p.name && p.name.trim().toLowerCase() === contacts[idx].name?.trim().toLowerCase()) ||
          (contacts[idx].pan && p.pan && p.pan.trim().toUpperCase() === contacts[idx].pan.trim().toUpperCase())
      );
      if (pIdx >= 0) {
        if (contacts[idx].mcaId) client.customerFiles.promoter[pIdx].mcaId = contacts[idx].mcaId;
        if (contacts[idx].mcaPassword) client.customerFiles.promoter[pIdx].mcaPassword = contacts[idx].mcaPassword;
        client.markModified('customerFiles');
      }
    }
    return await client.save();
  }

  /**
   * Delete a Contact from Client
   */
  static async deleteContact(id: string, contactId: string): Promise<IClientDocument> {
    const client = await Client.findById(id);
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    if (!client.contacts) {
      client.contacts = [];
    }

    client.contacts = client.contacts.filter(
      (c: any) => c.id !== contactId && c._id?.toString() !== contactId
    );

    client.markModified('contacts');
    return await client.save();
  }
}
