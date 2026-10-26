import { z } from 'zod';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const MOBILE_REGEX = /^[0-9+\s\-()]{7,16}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const leadIdParamSchema = z.object({
  id: z.string().regex(OBJECT_ID_REGEX, 'Invalid Lead ID format'),
});

export const createLeadSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().optional(),
  firstName: z.string().trim().min(1, 'First name is required').max(50),
  middleName: z.string().trim().max(50).nullable().optional().default(''),
  lastName: z.string().trim().min(1, 'Last name is required').max(50),
  abbreviation: z.string().trim().max(10).nullable().optional().default(''),
  dob: z.string().nullable().optional().default(''),
  aadhaarMobile: z.string().nullable().optional().default(''),
  mobile: z
    .string()
    .trim()
    .min(7, 'Valid mobile number is required')
    .regex(MOBILE_REGEX, 'Invalid mobile number format'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((val) => !val || val === '' || z.string().email().safeParse(val).success, {
      message: 'Invalid email address',
    })
    .nullable()
    .optional()
    .default(''),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .refine((val) => !val || val === '' || PAN_REGEX.test(val), {
      message: 'Invalid Indian PAN format (e.g. ABCDE1234F)',
    })
    .nullable()
    .optional()
    .default(''),
  panAttachment: z.string().nullable().optional(),
  aadhaar: z
    .string()
    .trim()
    .transform((val) => (val ? val.replace(/\s+/g, '') : ''))
    .refine((val) => !val || val === '' || AADHAAR_REGEX.test(val), {
      message: 'Aadhaar must be a 12-digit number',
    })
    .nullable()
    .optional()
    .default(''),
  aadhaarAttachment: z.string().nullable().optional(),
  gender: z.enum(['Male', 'Female', 'Others', 'Transgender', '']).nullable().optional().default('Male'),
  address: z.string().max(250).nullable().optional().default(''),
  country: z.string().max(60).nullable().optional().default('India'),
  state: z.string().max(60).nullable().optional().default(''),
  pincode: z.string().max(10).nullable().optional().default(''),
  nationality: z.string().max(50).nullable().optional().default('Indian'),
  policeStation: z.string().max(100).nullable().optional().default(''),
  postOffice: z.string().max(100).nullable().optional().default(''),
  din: z.string().max(20).nullable().optional().default(''),
  dinAttachment: z.string().nullable().optional(),
  mcaId: z.string().max(50).nullable().optional().default(''),
  mcaPassword: z.string().max(100).nullable().optional().default(''),
  referredBy: z.string().max(100).nullable().optional().default(''),
  photo: z.string().nullable().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'dropped']).optional().default('new'),
  notes: z.string().max(1000).nullable().optional().default(''),
  pipelineStage: z.string().optional().default('new_lead'),
  leadScore: z
    .object({
      score: z.number().nullable().optional(),
      businessSize: z.number().nullable().optional(),
      responseTime: z.number().nullable().optional(),
      engagement: z.number().nullable().optional(),
      sourceQuality: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  dealValue: z.number().optional().default(0),
  daysInStage: z.number().optional().default(0),
  businessName: z.string().optional().default(''),
  businessType: z.string().optional().default('Individual'),
  servicesInterested: z.array(z.string()).optional().default([]),
  gstin: z.string().optional().default(''),
  detailNotes: z
    .array(
      z.object({
        id: z.string(),
        note: z.string(),
        author: z.string().optional().default('Staff'),
        createdAt: z.coerce.date().optional(),
      })
    )
    .optional(),
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
