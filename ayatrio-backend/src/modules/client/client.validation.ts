import { z } from 'zod';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const MOBILE_REGEX = /^[0-9+\s\-()]{7,16}$/;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const clientIdParamSchema = z.object({
  id: z.string().regex(OBJECT_ID_REGEX, 'Invalid Client ID format'),
});

export const promoterItemSchema = z.object({
  key: z.number().optional(),
  name: z.string().min(1, 'Promoter name is required'),
  pan: z.string().toUpperCase().regex(PAN_REGEX, 'Invalid PAN').optional().or(z.literal('')),
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

export const createClientSchema = z.object({
  name: z.string().min(2, 'Client name must be at least 2 characters').max(150),
  fileNo: z.string().max(50).optional(), // Can be auto-generated if omitted
  type: z.string().min(1, 'Client constitution type is required'),
  mobile: z.string().min(7, 'Valid mobile number is required').regex(MOBILE_REGEX, 'Invalid mobile number format'),
  secondaryMobile: z.string().regex(MOBILE_REGEX, 'Invalid secondary mobile').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().max(250).optional().default(''),
  city: z.string().max(100).optional().default(''),
  state: z.string().max(100).optional().default(''),
  pincode: z.string().max(10).optional().default(''),
  group: z.string().min(1, 'Client practice group is required'),
  tags: z.array(z.string()).optional().default([]),
  active: z.boolean().optional().default(true),
  services: z.array(z.string()).optional().default([]),
  users: z.array(z.string()).optional().default([]),
  pan: z
    .string()
    .toUpperCase()
    .regex(PAN_REGEX, 'Invalid PAN format')
    .optional()
    .or(z.literal('')),
  dob: z.string().optional().default(''),
  referredBy: z.string().max(100).optional().default(''),
  photo: z.string().nullable().optional(),
  leadId: z.string().regex(OBJECT_ID_REGEX, 'Invalid Lead ID').optional(),
  customerFiles: z
    .object({
      promoter: z.array(promoterItemSchema).optional().default([]),
      statutory: z.array(statutoryItemSchema).optional().default([]),
      recurring: z.array(recurringItemSchema).optional().default([]),
    })
    .optional()
    .default({ promoter: [], statutory: [], recurring: [] }),
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
