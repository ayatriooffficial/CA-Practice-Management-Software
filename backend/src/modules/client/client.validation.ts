import { z } from 'zod';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const MOBILE_REGEX = /^[0-9+\s\-()]{7,16}$/;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const clientIdParamSchema = z.object({
  id: z.string().min(1, 'Client ID is required'),
});

export const promoterItemSchema = z.object({
  key: z.number().optional(),
  name: z.string().min(1, 'Promoter name is required'),
  pan: z.string().toUpperCase().regex(PAN_REGEX, 'Invalid PAN format').optional().or(z.literal('')).nullable(),
  share: z.string().optional().default(''),
  designation: z.string().optional().default(''),
  mcaId: z.string().optional().default(''),
  mcaPassword: z.string().optional(),
});

export const statutoryItemSchema = z.object({
  key: z.number().optional(),
  type: z.string().min(1, 'Statutory type is required'),
  idNo: z.string().min(1, 'ID number is required'),
  userId: z.string().optional().default(''),
  password: z.string().optional(),
  attachment: z.string().nullable().optional(),
});

export const recurringItemSchema = z.object({
  key: z.number().optional(),
  category: z.string().min(1, 'Service category is required'),
  service: z.string().min(1, 'Service name is required'),
  tariff: z.string().optional().default('0.00'),
});

export const licenseItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'License name is required'),
  licenseNo: z.string().optional().default(''),
  issuedDate: z.string().optional().default(''),
  expiryDate: z.string().optional().default(''),
  url: z.string().optional().default(''),
  file: z.string().nullable().optional(),
  fileUrl: z.string().nullable().optional(),
  driveFileId: z.string().nullable().optional(),
  remarks: z.string().optional().default(''),
});

export const dscItemSchema = z.object({
  id: z.string().optional(),
  dscId: z.string().optional(),
  name: z.string().min(1, 'Signatory name is required'),
  issuedDate: z.string().optional().default(''),
  expiryDate: z.string().optional().default(''),
  binNumber: z.string().optional().default(''),
  vendor: z.string().optional().default(''),
  class: z.string().optional().default(''),
  location: z.string().optional().default('CA Office'),
  status: z.string().optional().default('Active'),
  remarks: z.string().optional().default(''),
});

export const documentInOutItemSchema = z.object({
  id: z.string().optional(),
  documentName: z.string().min(1, 'Document name is required'),
  personName: z.string().min(1, 'Person name is required'),
  date: z.string().optional().default(''),
  status: z.string().optional().default('In'),
  returnable: z.union([z.boolean(), z.string()]).optional().default(false),
  returnDate: z.string().optional().default(''),
  remarks: z.string().optional().default(''),
  file: z.string().nullable().optional(),
});

export const clientRecurringTaskConfigSchema = z.object({
  taskName: z.string().optional(),
  frequency: z.string().optional(),
  priority: z.string().optional().default('Low'),
  startDay: z.union([z.number(), z.string()]).optional().default('Day 1'),
  startDate: z.string().optional().default(''),
  targetDay: z.union([z.number(), z.string()]).optional().default('Day 15'),
  targetDate: z.string().optional().default(''),
  endDay: z.union([z.number(), z.string()]).optional().default('Day 20'),
  endDate: z.string().optional().default(''),
  assignee: z.string().optional().default(''),
  reviewer: z.string().optional().default(''),
});

export const serviceSettingItemSchema = z.object({
  id: z.string().optional(),
  serviceId: z.string().optional(),
  serviceName: z.string().min(1, 'Service name is required'),
  category: z.string().optional().default('General'),
  compliance: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(false),
  recTask: z.string().optional().default('Disabled'),
  recInvoice: z.string().optional().default('Disabled'),
  frequency: z.string().optional().default('Monthly'),
  start: z.string().optional().default('Day 1'),
  target: z.string().optional().default('Day 15'),
  end: z.string().optional().default('Day 20'),
  invFreq: z.string().optional().default('Monthly'),
  invDay: z.union([z.number(), z.string()]).optional().default(1),
  amount: z.coerce.number().optional().default(0),
  // Recurring Task Fields
  taskName: z.string().optional(),
  priority: z.string().optional(),
  assignee: z.string().optional(),
  reviewer: z.string().optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  endDate: z.string().optional(),
  recurringTask: clientRecurringTaskConfigSchema.optional(),
}).passthrough();

export const createClientSchema = z.object({
  name: z.string().min(2, 'Client name must be at least 2 characters').max(150),
  fileNo: z.string().max(50).optional(), // Can be auto-generated if omitted
  type: z.string().min(1, 'Client constitution type is required'),
  mobile: z.string().min(7, 'Valid mobile number is required').regex(MOBILE_REGEX, 'Invalid mobile number format'),
  secondaryMobile: z.string().regex(MOBILE_REGEX, 'Invalid secondary mobile').optional().or(z.literal('')).nullable(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')).nullable(),
  address: z.string().max(250).optional().default(''),
  city: z.string().max(100).optional().default(''),
  state: z.string().max(100).optional().default(''),
  pincode: z.string().max(10).optional().default(''),
  addressDetails: z
    .object({
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      stateCode: z.string().optional(),
      pincode: z.string().optional(),
      country: z.string().optional(),
      landmark: z.string().optional(),
    })
    .optional(),
  paymentDetails: z
    .object({
      bankDetails: z
        .object({
          bankName: z.string().optional(),
          accountNumber: z.string().optional(),
          accountHolderName: z.string().optional(),
          ifscCode: z.string().optional(),
          branchName: z.string().optional(),
          accountType: z.string().optional(),
          upiId: z.string().optional(),
          qrCodeUrl: z.string().optional(),
        })
        .optional(),
      paymentMode: z.string().optional(),
      currency: z.string().optional(),
      terms: z.string().optional(),
      isDefault: z.boolean().optional(),
    })
    .optional(),
  group: z.string().min(1, 'Client practice group is required'),
  tags: z.array(z.string()).optional().default([]),
  active: z.boolean().optional().default(true),
  status: z.string().optional().default('Active'),
  legalName: z.string().optional().default(''),
  services: z.array(z.string()).optional().default([]),
  users: z.array(z.string()).optional().default([]),
  pan: z
    .string()
    .toUpperCase()
    .regex(PAN_REGEX, 'Invalid PAN format')
    .optional()
    .or(z.literal(''))
    .nullable(),
  dob: z.string().optional().default(''),
  referredBy: z.string().max(100).optional().default(''),
  photo: z.string().nullable().optional(),
  leadId: z.string().regex(OBJECT_ID_REGEX, 'Invalid Lead ID').optional().or(z.literal('')).nullable(),
  customerFiles: z
    .object({
      promoter: z.array(promoterItemSchema).optional().default([]),
      statutory: z.array(statutoryItemSchema).optional().default([]),
      recurring: z.array(recurringItemSchema).optional().default([]),
    })
    .optional()
    .default({ promoter: [], statutory: [], recurring: [] }),
  licenses: z.array(licenseItemSchema).optional().default([]),
  dscs: z.array(dscItemSchema).optional().default([]),
  documentsInOut: z.array(documentInOutItemSchema).optional().default([]),
  serviceSettings: z.array(serviceSettingItemSchema).optional().default([]),
  passwords: z.array(z.any()).optional().default([]),
  notes: z.array(z.any()).optional().default([]),
});

export const updateClientSchema = createClientSchema.partial();

export const queryClientSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  type: z.string().optional(),
  group: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  tag: z.string().optional(),
  includeDeleted: z.enum(['true', 'false']).optional(),
});
