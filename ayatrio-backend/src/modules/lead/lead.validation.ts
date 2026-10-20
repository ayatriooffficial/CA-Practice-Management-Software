import { z } from 'zod';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const MOBILE_REGEX = /^[0-9+\s\-()]{7,16}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const leadIdParamSchema = z.object({
  id: z.string().regex(OBJECT_ID_REGEX, 'Invalid Lead ID format'),
});

export const createLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  middleName: z.string().max(50).optional().default(''),
  lastName: z.string().min(1, 'Last name is required').max(50),
  abbreviation: z.string().max(10).optional().default(''),
  dob: z.string().optional(),
  aadhaarMobile: z.string().optional(),
  mobile: z.string().min(7, 'Valid mobile number is required').regex(MOBILE_REGEX, 'Invalid mobile number format'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  pan: z
    .string()
    .toUpperCase()
    .regex(PAN_REGEX, 'Invalid Indian PAN format (e.g. ABCDE1234F)')
    .optional()
    .or(z.literal('')),
  panAttachment: z.string().nullable().optional(),
  aadhaar: z
    .string()
    .regex(AADHAAR_REGEX, 'Aadhaar must be a 12-digit number')
    .optional()
    .or(z.literal('')),
  aadhaarAttachment: z.string().nullable().optional(),
  gender: z.enum(['Male', 'Female', 'Others', 'Transgender', '']).optional().default(''),
  address: z.string().max(250).optional().default(''),
  country: z.string().max(60).optional().default('India'),
  state: z.string().max(60).optional().default(''),
  pincode: z.string().max(10).optional().default(''),
  nationality: z.string().max(50).optional().default('Indian'),
  policeStation: z.string().max(100).optional().default(''),
  postOffice: z.string().max(100).optional().default(''),
  din: z.string().max(20).optional().default(''),
  dinAttachment: z.string().nullable().optional(),
  mcaId: z.string().max(50).optional().default(''),
  mcaPassword: z.string().max(100).optional(),
  referredBy: z.string().max(100).optional().default(''),
  photo: z.string().nullable().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'dropped']).optional().default('new'),
  notes: z.string().max(1000).optional().default(''),
});

export const updateLeadSchema = createLeadSchema.partial();

export const queryLeadSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'dropped']).optional(),
  state: z.string().optional(),
  gender: z.string().optional(),
  includeDeleted: z.enum(['true', 'false']).optional(),
});

export const convertLeadSchema = z.object({
  type: z.string().min(1, 'Client constitution type is required'),
  group: z.string().min(1, 'Client practice group is required'),
  fileNo: z.string().optional(),
  active: z.boolean().optional().default(true),
  services: z.array(z.string()).optional().default([]),
  users: z.array(z.string()).optional().default([]),
});
