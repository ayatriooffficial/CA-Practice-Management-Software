import { Client } from './client.model';
import { ClientServiceSetting } from './clientServiceSetting.model';
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
      data.createdBy = userId;
    }

    // Consolidate Address into addressDetails
    if (!data.addressDetails) {
      data.addressDetails = {};
    }
    if (data.address && !data.addressDetails.addressLine1) {
      data.addressDetails.addressLine1 = data.address;
    }
    if (data.city && !data.addressDetails.city) {
      data.addressDetails.city = data.city;
    }
    if (data.state && !data.addressDetails.state) {
      data.addressDetails.state = data.state;
    }
    if (data.pincode && !data.addressDetails.pincode) {
      data.addressDetails.pincode = data.pincode;
    }
    if (!data.addressDetails.country) {
      data.addressDetails.country = 'India';
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

    // Enforce at least 1 director or promoter required to create a company
    const validPromoters = (data.customerFiles?.promoter || []).filter(
      (p: any) => p && typeof p.name === 'string' && p.name.trim().length > 0
    );
    if (validPromoters.length === 0) {
      throw AppError.badRequest('At least 1 director or promoter (lead) is required to create a company.');
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

    // Sync serviceSettings from customerFiles.recurring if present
    if (data.customerFiles?.recurring && Array.isArray(data.customerFiles.recurring)) {
      if (!data.serviceSettings) {
        data.serviceSettings = [];
      }
      for (const r of data.customerFiles.recurring) {
        const prof = Number(r.professionalFee) || 0;
        const govt = Number(r.governmentFee) || 0;
        const other = Number(r.otherCharges) || 0;
        const total = Number(r.totalServiceFee) || (prof + govt + other) || parseFloat(r.tariff) || 0;

        const existingIdx = data.serviceSettings.findIndex((s) => s.serviceName === r.service);
        if (existingIdx >= 0) {
          data.serviceSettings[existingIdx] = {
            ...data.serviceSettings[existingIdx],
            professionalFee: prof || data.serviceSettings[existingIdx].professionalFee || 0,
            governmentFee: govt || data.serviceSettings[existingIdx].governmentFee || 0,
            otherCharges: other || data.serviceSettings[existingIdx].otherCharges || 0,
            totalServiceFee: total || data.serviceSettings[existingIdx].totalServiceFee || 0,
            amount: total || data.serviceSettings[existingIdx].amount || 0,
          };
        } else {
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
            amount: total,
            professionalFee: prof,
            governmentFee: govt,
            otherCharges: other,
            totalServiceFee: total,
          });
        }
      }
    }

    const serviceSettingsToSave = data.serviceSettings ? [...data.serviceSettings] : [];
    delete (data as any).serviceSettings;
    delete (data as any).services;
    delete (data as any).users;
    delete (data as any).contacts;
    delete (data as any).userId;

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

    const savedClient = await client.save();

    // Persist service settings into dedicated collection
    if (serviceSettingsToSave.length > 0) {
      try {
        await ClientServiceSetting.insertMany(
          serviceSettingsToSave.map((s: any) => {
            const prof = Number(s.professionalFee) || 0;
            const govt = Number(s.governmentFee) || 0;
            const other = Number(s.otherCharges) || 0;
            const total = Number(s.totalServiceFee) || (prof + govt + other) || Number(s.amount) || 0;
            return {
              ...s,
              clientId: savedClient._id,
              orgId: savedClient.orgId || null,
              createdBy: userId || null,
              amount: total,
              professionalFee: prof,
              governmentFee: govt,
              otherCharges: other,
              totalServiceFee: total,
            };
          })
        );
      } catch (err) {
        console.error('Failed to save ClientServiceSetting:', err);
      }
    }
    (savedClient as any).serviceSettings = serviceSettingsToSave;

    // Link company to matching lead(s)
    try {
      const promoterPans = validPromoters
        .map((p: any) => (typeof p.pan === 'string' ? p.pan.trim().toUpperCase() : ''))
        .filter(Boolean);
      const promoterNames = validPromoters
        .map((p: any) => (typeof p.name === 'string' ? p.name.trim() : ''))
        .filter(Boolean);

      const leadConditions: any[] = [];
      if (data.leadId) leadConditions.push({ _id: data.leadId });
      if (promoterPans.length > 0) leadConditions.push({ pan: { $in: promoterPans } });
      if (promoterNames.length > 0) {
        leadConditions.push({ fullName: { $in: promoterNames } });
      }

      if (leadConditions.length > 0) {
        await Lead.updateMany(
          { $or: leadConditions, isDeleted: false },
          {
            $addToSet: { associatedClientIds: savedClient._id },
            $set: { status: 'converted' },
          }
        );
      }
    } catch {
      // Non-blocking sync
    }

    return savedClient;
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
    _userCtx?: { userId: string | null; orgId?: string | null; name?: string; email?: string; role?: string } | string | null
  ): Promise<{ items: IClientDocument[]; pagination: PaginationMeta }> {
    const searchableFields = ['name', 'fileNo', 'mobile', 'email', 'pan', 'addressDetails.city', 'tags'];
    const parsedQuery = QueryBuilder.parse<IClientDocument>(queryOptions, searchableFields);

    // Single organization practice: all clients are accessible across the practice
    // Lightweight table projection: only fetch fields required for table view.
    // Heavy sub-documents (serviceSettings, customerFiles, passwords, licenses, dscs, documentsInOut, notes)
    // are excluded to keep payload size tiny and table rendering instant.
    const defaultTableFields = [
      'name',
      'fileNo',
      'type',
      'mobile',
      'secondaryMobile',
      'email',
      'group',
      'tags',
      'active',
      'photo',
      'pan',
      'addressDetails',
      'orgId',
      'createdBy',
      'isDeleted',
      'deletedAt',
      'createdAt',
      'updatedAt',
    ].join(' ');

    if (!parsedQuery.projection) {
      parsedQuery.projection = defaultTableFields;
    } else if (parsedQuery.projection === 'all' || parsedQuery.projection === 'full') {
      parsedQuery.projection = undefined;
    }

    return await QueryBuilder.paginate<IClientDocument>(Client, parsedQuery);
  }

  /**
   * Retrieve client by ID
   */
  static async getClientById(
    id: string,
    includeDeleted: boolean = false,
    section?: string
  ): Promise<IClientDocument | any> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId
      ? Client.findById(id)
      : Client.findOne({ $or: [{ fileNo: id }, { name: id }] });
    if (includeDeleted) {
      query.setOptions({ includeDeleted: true });
    }

    if (section === 'master') {
      // Exclude heavy sub-sections not needed for Master view
      query.select('-documentsInOut -dscs -recurringTaskConfigs');
    } else if (section === 'service-settings' || section === 'services') {
      query.select('name fileNo recurringTaskConfigs');
    } else if (section === 'documents') {
      query.select('name fileNo documentsInOut');
    } else if (section === 'dsc' || section === 'dscs') {
      query.select('name fileNo dscs');
    }

    const client = await query.exec();
    if (!client) {
      throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);
    }

    // Populate serviceSettings from dedicated collection
    let serviceSettings = await ClientServiceSetting.find({
      clientId: client._id,
      isDeleted: false,
    }).lean();

    // Auto-migrate legacy embedded service settings if collection has none
    if (serviceSettings.length === 0 && Array.isArray((client as any)._doc?.serviceSettings) && (client as any)._doc.serviceSettings.length > 0) {
      try {
        const legacy = (client as any)._doc.serviceSettings.map((s: any) => ({
          ...s,
          clientId: client._id,
          orgId: client.orgId || null,
        }));
        await ClientServiceSetting.insertMany(legacy);
        serviceSettings = await ClientServiceSetting.find({ clientId: client._id, isDeleted: false }).lean();
      } catch {}
    }
    (client as any).serviceSettings = serviceSettings;

    // Contact/director resolution from associated leads & customerFiles.promoter
    try {
      const leads = await Lead.find({
        $or: [
          { convertedToClientId: client._id },
          { associatedClientIds: client._id },
          ...(client.name ? [{ businessName: client.name }] : []),
        ],
        isDeleted: false,
      }).lean();

      const seenContacts = new Set<string>();
      const synthesizedContacts: any[] = [];

      leads.forEach((l: any, i: number) => {
        const name = l.fullName || l.name;
        if (!name) return;
        const key = `${name.toLowerCase()}-${l.pan?.toLowerCase() || ''}`;
        if (seenContacts.has(key)) return;
        seenContacts.add(key);

        synthesizedContacts.push({
          id: l._id?.toString(),
          name,
          isPrimary: i === 0,
          designation: l.designation || 'Director',
          din: l.din || '',
          dinStatus: 'Active',
          mcaId: l.mcaId || l.din || '',
          mcaPassword: l.mcaPassword || '',
          appointmentDate: l.appointmentDate || '',
          dob: l.dob || '',
          email: l.email || '',
          mobile: l.mobile || '',
          pan: l.pan || '',
          aadhar: l.aadhaar || '',
          passport: l.passport || '',
          fatherName: l.fatherName || '',
          address: l.address || '',
          leadId: l._id?.toString(),
        });
      });

      if (client.customerFiles?.promoter && Array.isArray(client.customerFiles.promoter)) {
        client.customerFiles.promoter.forEach((p: any, i: number) => {
          if (!p.name) return;
          const key = `${p.name.toLowerCase()}-${p.pan?.toLowerCase() || ''}`;
          if (seenContacts.has(key)) return;
          seenContacts.add(key);

          synthesizedContacts.push({
            id: `promoter-${p.key || i + 1}`,
            name: p.name,
            isPrimary: synthesizedContacts.length === 0,
            designation: p.designation || 'Director',
            pan: p.pan || '',
            din: p.mcaId || '',
            mcaId: p.mcaId || '',
            mcaPassword: p.mcaPassword || '',
            dinStatus: 'Active',
            leadId: p.leadId || '',
          });
        });
      }

      (client as any).contacts = synthesizedContacts;
    } catch {
      (client as any).contacts = [];
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

    // Consolidate Address into addressDetails
    if (updateData.address || updateData.city || updateData.state || updateData.pincode) {
      if (!updateData.addressDetails) {
        updateData.addressDetails = client.addressDetails ? { ...client.addressDetails } : {};
      }
      if (updateData.address) updateData.addressDetails.addressLine1 = updateData.address;
      if (updateData.city) updateData.addressDetails.city = updateData.city;
      if (updateData.state) updateData.addressDetails.state = updateData.state;
      if (updateData.pincode) updateData.addressDetails.pincode = updateData.pincode;
      if (!updateData.addressDetails.country) updateData.addressDetails.country = 'India';
    }

    const serviceSettingsToSave = updateData.serviceSettings;
    delete (updateData as any).serviceSettings;
    delete (updateData as any).services;
    delete (updateData as any).users;
    delete (updateData as any).contacts;
    delete (updateData as any).userId;

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
          // Keep customerFiles.recurring in sync
        }
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
    if (serviceSettingsToSave) {
      const normalizedSettings = serviceSettingsToSave.map((s: any) => {
        const active = s.isActive !== undefined ? Boolean(s.isActive) : Boolean(s.compliance);
        const prof = Number(s.professionalFee) || 0;
        const govt = Number(s.governmentFee) || 0;
        const other = Number(s.otherCharges) || 0;
        const total = Number(s.totalServiceFee) || (prof + govt + other) || Number(s.amount) || 0;
        return {
          ...s,
          clientId: client._id,
          orgId: client.orgId || null,
          isActive: active,
          compliance: active,
          recTask: active ? (s.recTask === 'Disabled' ? 'Enabled' : s.recTask || 'Enabled') : 'Disabled',
          amount: total,
          professionalFee: prof,
          governmentFee: govt,
          otherCharges: other,
          totalServiceFee: total,
        };
      });
      await ClientServiceSetting.deleteMany({ clientId: client._id });
      if (normalizedSettings.length > 0) {
        await ClientServiceSetting.insertMany(normalizedSettings);
      }
      (client as any).serviceSettings = normalizedSettings;
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
    _userCtx?: { userId: string | null; orgId?: string | null; name?: string; email?: string; role?: string } | string | null
  ): Promise<Record<string, unknown>> {
    const baseMatch: Record<string, any> = { isDeleted: false };
    const deletedMatch: Record<string, any> = { isDeleted: true };

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
    _userCtx?: { userId: string | null; orgId?: string | null; role?: string } | string | null
  ): Promise<any[]> {
    const matchStage: Record<string, any> = {
      isDeleted: { $ne: true },
      dscs: { $exists: true, $not: { $size: 0 } },
    };

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
   * Get Service Settings for Client
   */
  static async getServiceSettings(id: string): Promise<any[]> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const client = isObjectId
      ? await Client.findById(id).lean()
      : await Client.findOne({ $or: [{ fileNo: id }, { name: id }] }).lean();
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);

    let settings = await ClientServiceSetting.find({
      clientId: client._id,
      isDeleted: false,
    }).lean();

    if (settings.length === 0 && Array.isArray((client as any).serviceSettings) && (client as any).serviceSettings.length > 0) {
      try {
        const legacy = (client as any).serviceSettings.map((s: any) => ({
          ...s,
          clientId: client._id,
          orgId: client.orgId || null,
        }));
        await ClientServiceSetting.insertMany(legacy);
        settings = await ClientServiceSetting.find({ clientId: client._id, isDeleted: false }).lean();
      } catch {}
    }
    return settings;
  }

  /**
   * Update Service Settings for Client
   */
  static async updateServiceSettings(id: string, settings: any[]): Promise<any> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const client = isObjectId
      ? await Client.findById(id)
      : await Client.findOne({ $or: [{ fileNo: id }, { name: id }] });
    if (!client) throw AppError.notFound(ResponseMessages.CLIENT_NOT_FOUND);

    const normalizedSettings = (settings || []).map((s: any) => {
      const active = s.isActive !== undefined ? Boolean(s.isActive) : Boolean(s.compliance);
      return {
        ...s,
        clientId: client._id,
        orgId: client.orgId || null,
        isActive: active,
        compliance: active,
        recTask: active ? (s.recTask === 'Disabled' ? 'Enabled' : s.recTask || 'Enabled') : 'Disabled',
      };
    });

    await ClientServiceSetting.deleteMany({ clientId: client._id });
    if (normalizedSettings.length > 0) {
      await ClientServiceSetting.insertMany(normalizedSettings);
    }

    const savedSettings = await ClientServiceSetting.find({
      clientId: client._id,
      isDeleted: false,
    }).lean();

    (client as any).serviceSettings = savedSettings;
    return client;
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
      leadId: data.leadId || '',
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
      leadId: data.leadId || '',
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

    if (data.leadId) {
      try {
        await Lead.findByIdAndUpdate(data.leadId, {
          $addToSet: { associatedClientIds: client._id },
        });
      } catch (err) {}
    } else if (newContact.pan) {
      try {
        await Lead.findOneAndUpdate(
          { pan: newContact.pan.toUpperCase(), isDeleted: { $ne: true } },
          { $addToSet: { associatedClientIds: client._id } }
        );
      } catch (err) {}
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
    let idx = contacts.findIndex((c: any) => c.id === contactId || c._id?.toString() === contactId);
    if (idx === -1) {
      // Resilient check: if contact was synthetic from customerFiles.promoter
      if (Array.isArray(client.customerFiles?.promoter)) {
        const pIdx = client.customerFiles.promoter.findIndex(
          (p: any, i: number) => `promoter-${p.key || i + 1}` === contactId || p.name?.trim().toLowerCase() === data.name?.trim().toLowerCase()
        );
        if (pIdx >= 0) {
          const p = client.customerFiles.promoter[pIdx];
          const newC: any = {
            id: contactId,
            name: p.name || data.name,
            designation: p.designation || data.designation || 'Director',
            pan: p.pan || data.pan || '',
            din: p.mcaId || data.din || '',
            mcaId: p.mcaId || data.mcaId || '',
            mcaPassword: p.mcaPassword || data.mcaPassword || '',
            dinStatus: 'Active',
            isPrimary: Boolean(data.isPrimary),
            createdAt: new Date().toISOString(),
          };
          contacts.push(newC);
          idx = contacts.length - 1;
        }
      }
    }
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
    const currentContact = contacts[idx];
    if (currentContact && client.customerFiles?.promoter) {
      const pIdx = client.customerFiles.promoter.findIndex(
        (p: any) =>
          (p.name && currentContact.name && p.name.trim().toLowerCase() === currentContact.name.trim().toLowerCase()) ||
          (currentContact.pan && p.pan && p.pan.trim().toUpperCase() === currentContact.pan.trim().toUpperCase())
      );
      if (pIdx >= 0) {
        if (currentContact.mcaId) client.customerFiles.promoter[pIdx].mcaId = currentContact.mcaId;
        if (currentContact.mcaPassword) client.customerFiles.promoter[pIdx].mcaPassword = currentContact.mcaPassword;
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

    // Also prune from customerFiles.promoter so synthetic contacts don't resurface
    if (Array.isArray(client.customerFiles?.promoter)) {
      client.customerFiles.promoter = client.customerFiles.promoter.filter(
        (p: any, i: number) => {
          const promoId = `promoter-${p.key || i + 1}`;
          return promoId !== contactId && p._id?.toString() !== contactId && p.id !== contactId;
        }
      );
      client.markModified('customerFiles');
    }

    client.markModified('contacts');
    return await client.save();
  }

  /**
   * Search existing contacts across leads for autocomplete
   */
  static async getExistingContactsDirectory(search?: string): Promise<any[]> {
    const searchLower = (search || '').trim();
    const leadFilter: any = { isDeleted: false };
    if (searchLower) {
      leadFilter.$or = [
        { fullName: { $regex: searchLower, $options: 'i' } },
        { email: { $regex: searchLower, $options: 'i' } },
        { mobile: { $regex: searchLower, $options: 'i' } },
        { pan: { $regex: searchLower, $options: 'i' } },
        { din: { $regex: searchLower, $options: 'i' } },
      ];
    }
    const leads = await Lead.find(leadFilter).limit(50).lean();
    return leads.map((l: any) => ({
      id: l._id?.toString(),
      name: l.fullName || l.name || '',
      firstName: (l.fullName || '').split(' ')[0] || '',
      middleName: (l.fullName || '').split(' ').length > 2 ? (l.fullName || '').split(' ')[1] : '',
      lastName: (l.fullName || '').split(' ').slice(1).join(' ') || '',
      designation: l.designation || 'Director',
      din: l.din || '',
      dinStatus: 'Active',
      appointmentDate: l.appointmentDate || '',
      dob: l.dob || '',
      email: l.email || '',
      mobile: l.mobile || '',
      countryCode: '+91',
      pan: l.pan || '',
      aadhar: l.aadhaar || '',
      passport: l.passport || '',
      passportExpiry: '',
      fatherName: l.fatherName || '',
      addressLine1: l.addressDetails?.addressLine1 || l.address || '',
      addressLine2: l.addressDetails?.addressLine2 || '',
      city: l.addressDetails?.city || l.city || '',
      state: l.addressDetails?.state || l.state || '',
      pincode: l.addressDetails?.pincode || l.pincode || '',
      clientName: l.businessName || '',
    }));
  }
}
