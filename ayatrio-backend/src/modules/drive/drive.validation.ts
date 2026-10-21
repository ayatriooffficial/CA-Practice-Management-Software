import { z } from 'zod';
import { DocumentCategory } from './drive.interface';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const uploadDocumentBodySchema = z.object({
  category: z.nativeEnum(DocumentCategory, {
    errorMap: () => ({
      message: `Category must be one of: ${Object.values(DocumentCategory).join(', ')}`,
    }),
  }),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  clientId: z
    .string()
    .regex(objectIdRegex, 'Invalid Client ID format')
    .optional()
    .or(z.literal('')),
  clientName: z.string().max(100).optional(),
  leadId: z
    .string()
    .regex(objectIdRegex, 'Invalid Lead ID format')
    .optional()
    .or(z.literal('')),
  tags: z
    .union([
      z.string().transform((val) =>
        val
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      ),
      z.array(z.string()),
    ])
    .optional()
    .default([]),
  uploadedBy: z.string().max(100).optional(),
});

export const queryDocumentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.nativeEnum(DocumentCategory).optional(),
  search: z.string().trim().optional(),
  clientId: z.string().regex(objectIdRegex, 'Invalid Client ID').optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const documentIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid Document ID format'),
});
