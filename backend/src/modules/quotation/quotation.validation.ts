import { z } from 'zod';

export const quotationItemSchema = z.object({
  id: z.string().optional(),
  serviceId: z.string().optional().nullable(),
  serviceName: z.string().min(1, 'Service name is required'),
  hsnSac: z.string().optional().default(''),
  quantity: z.number().min(0.01).default(1),
  price: z.number().min(0).default(0),
  discountType: z.enum(['percentage', 'flat']).optional().default('percentage'),
  discountValue: z.number().min(0).optional().default(0),
  taxRate: z.number().min(0).max(100).optional().default(18),
  sgst: z.number().optional().default(0),
  cgst: z.number().optional().default(0),
  igst: z.number().optional().default(0),
  amount: z.number().optional().default(0),
  total: z.number().optional().default(0),
  description: z.string().max(300).optional().default(''),
  isReimbursement: z.boolean().optional().default(false),
});

export const createQuotationSchema = z.object({
  quotationNo: z.string().optional(),
  quotationDate: z.string().min(1, 'Quotation date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  status: z.enum(['Draft', 'Pending', 'Accepted', 'Rejected', 'Expired']).optional().default('Pending'),
  template: z.enum(['Aura', 'Classic', 'Modern']).optional().default('Aura'),
  billingOrg: z
    .object({
      orgId: z.string().optional().nullable(),
      name: z.string().default('Turia Associates Demo'),
      address: z.string().default('165, Cambridge Layout Bangalore - 560008 Karnataka'),
      priority: z.string().default('Primary'),
      gstin: z.string().default('29AARCS3638L2ZH'),
      pan: z.string().default('KKXPS8986J'),
      lutNumber: z.string().default('LUT28798'),
      lutDisabled: z.boolean().default(true),
      email: z.string().default('kavinraj@turia.in'),
      mobile: z.string().default('8722750204'),
      website: z.string().default('https://turia.in/'),
    })
    .optional(),
  quotationTo: z.object({
    leadId: z.string().optional().nullable(),
    clientId: z.string().optional().nullable(),
    businessName: z.string().optional().default(''),
    name: z.string().min(1, 'Client/Lead name is required'),
    addressLine1: z.string().optional().default(''),
    addressLine2: z.string().optional().default(''),
    city: z.string().optional().default(''),
    state: z.string().default('Karnataka'),
    stateCode: z.string().optional().default('29'),
    placeOfSupply: z.string().optional().default('Karnataka'),
    gstin: z.string().optional().default(''),
    pan: z.string().optional().default(''),
    email: z.string().optional().default(''),
    mobile: z.string().optional().default(''),
  }),
  bankDetails: z
    .object({
      paymentType: z.string().default('Bank'),
      bankName: z.string().default('HDFC'),
      accountName: z.string().default('Turia Books Technologies Private Limited'),
      accountNumber: z.string().default('8934784834990842'),
      ifsc: z.string().default('HDFC9003928'),
      accountType: z.string().default('Current'),
      bankBranch: z.string().default('Indira Nagar'),
      upi: z.string().default('6363693138@ybl'),
      currencyCode: z.string().default('INR'),
    })
    .optional(),
  items: z.array(quotationItemSchema).default([]),
  subtotal: z.number().optional().default(0),
  discountTotal: z.number().optional().default(0),
  taxTotal: z.number().optional().default(0),
  totalAmount: z.number().optional().default(0),
  notes: z.string().optional().default(''),
  terms: z.string().optional().default(''),
  leadId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
});

export const updateQuotationSchema = createQuotationSchema.partial();
