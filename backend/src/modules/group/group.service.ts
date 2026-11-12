import { Types } from 'mongoose';
import { Group } from './group.model';
import { IGroupDocument, IGroupListItem } from './group.interface';
import { Client } from '../client/client.model';
import { Task } from '../task/task.model';
import { FinancialInvoice } from '../financials/financial.model';
import { AppError } from '../../shared/utils/apiError';
const isRoleAdmin = (role?: string | null): boolean => {
  if (!role) return false;
  return ['admin', 'partner', 'owner', 'superadmin'].includes(role.trim().toLowerCase());
};

export interface GroupListFilter {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class GroupService {
  /**
   * List Groups with real-time aggregated stats & populated member entities
   */
  static async listGroups(
    filters: GroupListFilter,
    userCtx: { userId?: string; role?: string; orgId?: string }
  ): Promise<{ groups: IGroupListItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 25));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { isDeleted: false };
    const isAdmin = isRoleAdmin(userCtx?.role);

    // If employee, restrict to groups whose clients the employee has access to
    if (!isAdmin && userCtx?.userId) {
      const allowedClients = await Client.find({
        isDeleted: false,
        $or: [{ users: userCtx.userId }, { createdBy: userCtx.userId }],
      }).select('_id');
      const allowedClientIds = allowedClients.map((c) => c._id);
      query.$or = [
        { clientIds: { $in: allowedClientIds } },
        { createdBy: userCtx.userId },
      ];
    }

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      const regex = new RegExp(term, 'i');
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { name: regex },
            { groupId: regex },
            { description: regex },
          ],
        },
      ];
    }

    // Sort order
    const sortField = filters.sortBy || 'createdAt';
    const sortDir = filters.sortOrder === 'asc' ? 1 : -1;
    const sortObj: Record<string, any> = { [sortField]: sortDir };

    const [rawGroups, total] = await Promise.all([
      Group.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Group.countDocuments(query),
    ]);

    // Aggregate entity, task, and invoice stats for each group
    const groupsWithStats = await Promise.all(
      rawGroups.map(async (grp: any) => {
        const clientIds = (grp.clientIds || []) as Types.ObjectId[];
        const clientObjIds = clientIds.map((cid: any) => new Types.ObjectId(cid.toString()));

        // 1. Fetch populated member clients
        const clients = clientObjIds.length > 0
          ? await Client.find({ _id: { $in: clientObjIds }, isDeleted: false })
              .select('name fileNo type mobile email pan contacts status active createdAt customerFiles')
              .lean()
          : [];

        // 2. Resolve Group POC
        let pocName = 'No POC set';
        let pocMobile = '-';
        let pocEmail = '-';

        // Preferred POC is the selected pocClientId
        let pocClient = grp.pocClientId
          ? clients.find((c: any) => c._id.toString() === grp.pocClientId.toString())
          : null;

        // Fallback to first client if none selected
        if (!pocClient && clients.length > 0) {
          pocClient = clients[0];
        }

        if (pocClient) {
          const contacts = (pocClient as any).contacts || [];
          const primaryContact = contacts.find((c: any) => c.isPrimary) || contacts[0];
          if (primaryContact && primaryContact.name) {
            pocName = primaryContact.name;
            pocMobile = primaryContact.mobile || (pocClient as any).mobile || '-';
            pocEmail = primaryContact.email || (pocClient as any).email || '-';
          } else if ((pocClient as any).name) {
            pocName = (pocClient as any).name;
            pocMobile = (pocClient as any).mobile || '-';
            pocEmail = (pocClient as any).email || '-';
          }
        }

        // 3. Aggregate Task Stats for member clients
        let openTasksCount = 0;
        let readyToBillCount = 0;

        if (clientObjIds.length > 0) {
          const clientIdStrings = clientObjIds.map((id) => id.toString());
          const tasks = await Task.find({
            $or: [
              { clientId: { $in: clientIdStrings } },
              { clientId: { $in: clientObjIds } },
            ],
            isDeleted: false,
          })
            .select('status billingStatus')
            .lean();

          tasks.forEach((t: any) => {
            const st = (t.status || '').toLowerCase();
            if (st !== 'completed' && st !== 'cancelled' && st !== 'closed') {
              openTasksCount++;
            }
            const bst = (t.billingStatus || '').toLowerCase();
            if (bst === 'ready to bill' || bst === 'unbilled') {
              readyToBillCount++;
            }
          });
        }

        // 4. Aggregate Invoice & Financial Stats
        let invoicesCount = 0;
        let proformasCount = 0;
        let outstandingAmount = 0;

        if (clientObjIds.length > 0) {
          const clientIdStrings = clientObjIds.map((id) => id.toString());
          const invList = await FinancialInvoice.find({
            $or: [
              { 'details.clientId': { $in: clientIdStrings } },
              { 'details.clientId': { $in: clientObjIds } },
            ],
            state: { $ne: 'void' },
          })
            .select('kind state details.totalAmount details.balanceAmount details.isProforma')
            .lean();

          invList.forEach((inv: any) => {
            if (inv.details?.isProforma || inv.kind === 'proforma') {
              proformasCount++;
            } else {
              invoicesCount++;
              const bal = Number(inv.details?.balanceAmount) || 0;
              if (bal > 0) outstandingAmount += bal;
            }
          });
        }

        // Formatted sub-row entities
        const formattedEntities = clients.map((c: any) => {
          return {
            id: c._id.toString(),
            _id: c._id,
            name: c.name,
            fileNo: c.fileNo || '-',
            type: c.type || 'Individual',
            pan: c.pan || '-',
            mobile: c.mobile || '-',
            email: c.email || '-',
            status: c.status || (c.active ? 'Active' : 'Inactive'),
            active: !!c.active,
          };
        });

        const effectivePocClientId = grp.pocClientId
          ? (grp.pocClientId._id ? grp.pocClientId._id.toString() : grp.pocClientId.toString())
          : (pocClient ? pocClient._id.toString() : null);

        return {
          ...grp,
          id: grp._id.toString(),
          pocClientId: effectivePocClientId,
          stats: {
            entitiesCount: clients.length,
            openTasksCount,
            readyToBillCount,
            invoicesCount,
            proformasCount,
            outstandingAmount,
            pocName,
            pocMobile,
            pocEmail,
          },
          entities: formattedEntities,
        } as IGroupListItem;
      })
    );

    return {
      groups: groupsWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single Group details with full populated entities & POC
   */
  static async getGroupById(id: string): Promise<any> {
    const group = await Group.findOne({ _id: id, isDeleted: false })
      .populate({
        path: 'clientIds',
        select: 'name fileNo type mobile email pan contacts status active address city state pincode customerFiles createdAt',
      })
      .lean();

    if (!group) {
      throw AppError.notFound('Group not found');
    }

    const clients: any[] = (group.clientIds || []).filter(Boolean);
    const clientIds = clients.map((c: any) => c._id);
    const clientIdStrings = clientIds.map((c: any) => c.toString());

    // Resolve POC
    let pocContact: any = null;
    let pocClient: any = null;

    if (group.pocClientId) {
      pocClient = clients.find((c: any) => c._id.toString() === group.pocClientId?.toString());
    }
    if (!pocClient && clients.length > 0) {
      pocClient = clients[0];
    }

    if (pocClient) {
      const contacts = pocClient.contacts || [];
      pocContact = contacts.find((c: any) => c.isPrimary) || contacts[0] || null;
      if (!pocContact) {
        pocContact = {
          name: pocClient.name,
          mobile: pocClient.mobile,
          email: pocClient.email,
          isPrimary: true,
        };
      }
    }

    // Task counts
    let openTasksCount = 0;
    let readyToBillCount = 0;
    if (clientIdStrings.length > 0) {
      const tasks = await Task.find({
        $or: [{ clientId: { $in: clientIdStrings } }, { clientId: { $in: clientIds } }],
        isDeleted: false,
      }).select('status billingStatus').lean();

      tasks.forEach((t: any) => {
        const st = (t.status || '').toLowerCase();
        if (st !== 'completed' && st !== 'cancelled' && st !== 'closed') openTasksCount++;
        const bst = (t.billingStatus || '').toLowerCase();
        if (bst === 'ready to bill' || bst === 'unbilled') readyToBillCount++;
      });
    }

    // Invoice counts
    let invoicesCount = 0;
    let proformasCount = 0;
    let totalInvoiceAmount = 0;
    let outstandingAmount = 0;

    if (clientIdStrings.length > 0) {
      const invList = await FinancialInvoice.find({
        $or: [
          { 'details.clientId': { $in: clientIdStrings } },
          { 'details.clientId': { $in: clientIds } },
        ],
        state: { $ne: 'void' },
      }).select('kind state details.totalAmount details.balanceAmount details.isProforma').lean();

      invList.forEach((inv: any) => {
        if (inv.details?.isProforma || inv.kind === 'proforma') {
          proformasCount++;
        } else {
          invoicesCount++;
          const tot = Number(inv.details?.totalAmount) || 0;
          const bal = Number(inv.details?.balanceAmount) || 0;
          totalInvoiceAmount += tot;
          if (bal > 0) outstandingAmount += bal;
        }
      });
    }

    return {
      ...group,
      id: group._id.toString(),
      pocClientId: pocClient?._id?.toString() || (group.pocClientId ? (group.pocClientId._id ? group.pocClientId._id.toString() : group.pocClientId.toString()) : null),
      entities: clients.map((c: any) => ({
        ...c,
        id: c._id.toString(),
      })),
      poc: pocContact ? {
        name: pocContact.name,
        mobile: pocContact.mobile || pocClient?.mobile || '-',
        email: pocContact.email || pocClient?.email || '-',
        clientId: pocClient?._id?.toString(),
        clientName: pocClient?.name,
      } : null,
      stats: {
        entitiesCount: clients.length,
        openTasksCount,
        readyToBillCount,
        invoicesCount,
        proformasCount,
        totalInvoiceAmount,
        outstandingAmount,
      },
    };
  }

  /**
   * Create a new Group
   */
  static async createGroup(
    data: {
      name: string;
      groupId?: string;
      clientIds?: string[];
      pocClientId?: string;
      description?: string;
    },
    userCtx: { userId?: string; orgId?: string }
  ): Promise<IGroupDocument> {
    if (!data.name || !data.name.trim()) {
      throw AppError.badRequest('Group Name is required');
    }

    // Auto-generate sequential group ID if not provided
    let finalGroupId = data.groupId?.trim();
    if (!finalGroupId) {
      const count = await Group.countDocuments();
      finalGroupId = (count + 1).toString();
    }

    // Check duplicate name or groupId
    const existing = await Group.findOne({
      $or: [{ name: data.name.trim() }, { groupId: finalGroupId }],
      isDeleted: false,
    });
    if (existing) {
      if (existing.name.toLowerCase() === data.name.trim().toLowerCase()) {
        throw AppError.badRequest(`A Group with name "${data.name.trim()}" already exists`);
      }
      finalGroupId = `${finalGroupId}-${Date.now().toString().slice(-4)}`;
    }

    const clientObjIds = (data.clientIds || []).map((id) => new Types.ObjectId(id));

    // 1. Enforce one-group-per-client: remove these clients from any other groups
    if (clientObjIds.length > 0) {
      await Group.updateMany(
        { clientIds: { $in: clientObjIds } },
        { $pull: { clientIds: { $in: clientObjIds } } }
      );
    }

    const newGroup = await Group.create({
      name: data.name.trim(),
      groupId: finalGroupId,
      clientIds: clientObjIds,
      pocClientId: data.pocClientId ? new Types.ObjectId(data.pocClientId) : (clientObjIds[0] || null),
      description: data.description?.trim() || '',
      status: 'Active',
      orgId: userCtx?.orgId || null,
      createdBy: userCtx?.userId || null,
    });

    // 2. Sync client.group property on member clients
    if (clientObjIds.length > 0) {
      await Client.updateMany(
        { _id: { $in: clientObjIds } },
        { $set: { group: newGroup.name } }
      );
    }

    return newGroup;
  }

  /**
   * Update Group
   */
  static async updateGroup(
    id: string,
    data: {
      name?: string;
      groupId?: string;
      clientIds?: string[];
      pocClientId?: string;
      description?: string;
      status?: 'Active' | 'Inactive';
    }
  ): Promise<IGroupDocument> {
    const group = await Group.findOne({ _id: id, isDeleted: false });
    if (!group) throw AppError.notFound('Group not found');

    const oldName = group.name;

    if (data.name && data.name.trim()) {
      group.name = data.name.trim();
    }
    if (data.groupId !== undefined) {
      group.groupId = data.groupId.trim();
    }
    if (data.description !== undefined) {
      group.description = data.description.trim();
    }
    if (data.status !== undefined) {
      group.status = data.status;
    }

    if (data.clientIds !== undefined) {
      const newClientObjIds = data.clientIds.map((cid) => new Types.ObjectId(cid));

      // Remove reassigned clients from other groups
      await Group.updateMany(
        { _id: { $ne: group._id }, clientIds: { $in: newClientObjIds } },
        { $pull: { clientIds: { $in: newClientObjIds } } }
      );

      group.clientIds = newClientObjIds;

      // Update POC if previous POC entity was removed
      if (group.pocClientId && !newClientObjIds.some((cid) => cid.equals(group.pocClientId!))) {
        group.pocClientId = newClientObjIds[0] || null;
      }
    }

    if (data.pocClientId !== undefined) {
      group.pocClientId = data.pocClientId ? new Types.ObjectId(data.pocClientId) : null;
    }

    await group.save();

    // Sync client.group property
    if (data.clientIds !== undefined || group.name !== oldName) {
      await Client.updateMany(
        { _id: { $in: group.clientIds } },
        { $set: { group: group.name } }
      );
    }

    return group;
  }

  /**
   * Update POC entity selection
   */
  static async updateGroupPoc(id: string, pocClientId: string): Promise<IGroupDocument> {
    const group = await Group.findOne({ _id: id, isDeleted: false });
    if (!group) throw AppError.notFound('Group not found');

    group.pocClientId = new Types.ObjectId(pocClientId);
    await group.save();
    return group;
  }

  /**
   * Remove single client from group
   */
  static async removeClientFromGroup(groupId: string, clientId: string): Promise<IGroupDocument> {
    const group = await Group.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw AppError.notFound('Group not found');

    const clientObjId = new Types.ObjectId(clientId);
    group.clientIds = group.clientIds.filter((cid) => !cid.equals(clientObjId));

    if (group.pocClientId && group.pocClientId.equals(clientObjId)) {
      group.pocClientId = group.clientIds[0] || null;
    }

    await group.save();

    // Reset client group
    await Client.updateOne({ _id: clientObjId }, { $set: { group: 'Default Group' } });

    return group;
  }

  /**
   * Delete Group (soft delete)
   */
  static async deleteGroup(id: string): Promise<boolean> {
    const group = await Group.findOne({ _id: id, isDeleted: false });
    if (!group) throw AppError.notFound('Group not found');

    await (group as any).softDelete();

    // Reset group for member clients
    if (group.clientIds && group.clientIds.length > 0) {
      await Client.updateMany(
        { _id: { $in: group.clientIds } },
        { $set: { group: 'Default Group' } }
      );
    }

    return true;
  }

  /**
   * Get Aggregated Contacts for all clients in Group
   */
  static async getGroupContacts(groupId: string): Promise<any[]> {
    const group = await Group.findOne({ _id: groupId, isDeleted: false }).lean();
    if (!group) throw AppError.notFound('Group not found');

    const clientIds = (group.clientIds || []) as Types.ObjectId[];
    if (clientIds.length === 0) return [];

    const clients = await Client.find({ _id: { $in: clientIds }, isDeleted: false })
      .select('name fileNo contacts type mobile email pan address city state pincode aadhar passport dob fatherName')
      .lean();

    const groupPocClientId = group.pocClientId
      ? (group.pocClientId._id ? group.pocClientId._id.toString() : group.pocClientId.toString())
      : (clientIds[0] ? clientIds[0].toString() : null);

    const aggregated: any[] = [];

    clients.forEach((c: any) => {
      const isClientGroupPoc = Boolean(groupPocClientId && c._id.toString() === groupPocClientId);
      const contacts = c.contacts || [];

      if (contacts.length === 0) {
        // Fallback: If client entity has no separate sub-contacts, include the client itself as a primary contact
        aggregated.push({
          id: `${c._id}-client-contact`,
          name: c.name || '-',
          designation: isClientGroupPoc ? 'POC (Client Entity)' : (c.type || 'Client Entity'),
          clientName: c.name,
          clientId: c._id.toString(),
          email: c.email || '-',
          mobile: c.mobile || '-',
          pan: c.pan || '-',
          din: '-',
          dinStatus: 'Active',
          appointmentDate: '-',
          dob: c.dob || '-',
          aadhar: c.aadhar || '-',
          passport: c.passport || '-',
          fatherName: c.fatherName || '-',
          address: c.address || (c.city ? `${c.city}${c.state ? `, ${c.state}` : ''}` : '-'),
          isPrimary: true,
          isGroupPoc: isClientGroupPoc,
        });
      } else {
        contacts.forEach((contact: any, idx: number) => {
          const isContactPoc = isClientGroupPoc && (contact.isPrimary || idx === 0);
          aggregated.push({
            id: contact.id || contact._id?.toString() || `${c._id}-${contact.name || idx}`,
            name: contact.name || '-',
            designation: contact.designation || (isContactPoc ? 'Group POC' : '-'),
            clientName: c.name,
            clientId: c._id.toString(),
            email: contact.email || c.email || '-',
            mobile: contact.mobile || c.mobile || '-',
            pan: contact.pan || c.pan || '-',
            din: contact.din || contact.mcaId || '-',
            dinStatus: contact.dinStatus || 'Active',
            appointmentDate: contact.appointmentDate || '-',
            dob: contact.dob || '-',
            aadhar: contact.aadhar || '-',
            passport: contact.passport || '-',
            fatherName: contact.fatherName || '-',
            address: contact.address || contact.addressLine1 || c.address || '-',
            isPrimary: Boolean(contact.isPrimary),
            isGroupPoc: isContactPoc,
          });
        });
      }
    });

    // Sort so Group POC comes first, followed by primary contacts
    aggregated.sort((a, b) => {
      if (a.isGroupPoc && !b.isGroupPoc) return -1;
      if (!a.isGroupPoc && b.isGroupPoc) return 1;
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return 0;
    });

    return aggregated;
  }
}

