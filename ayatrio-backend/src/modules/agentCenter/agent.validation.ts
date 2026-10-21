import { z } from 'zod';

const objectId = /^[0-9a-fA-F]{24}$/;
const moduleSchema = z.enum(['Task', 'DSC', 'License']);
const statusSchema = z.enum(['draft', 'published', 'disabled']);
const configSchema = z.record(z.unknown());

export const agentIdParamSchema = z.object({
  id: z.string().regex(objectId, 'Invalid Agent ID format'),
});

export const createAgentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
  module: moduleSchema,
  description: z.string().max(500).optional().default(''),
  config: configSchema.default({}),
  saveDraft: z.boolean().optional(),
  // Client cannot choose the initial lifecycle state; creation always starts as draft.
  status: statusSchema.optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  module: moduleSchema.optional(),
  description: z.string().max(500).optional(),
  config: configSchema.optional(),
  saveDraft: z.boolean().optional(),
  status: statusSchema.optional(),
}).strict();

export const queryAgentsSchema = z.object({
  module: moduleSchema.optional(),
  status: statusSchema.optional(),
  search: z.string().trim().max(200).optional(),
});

export const testRunSchema = z.object({
  failRecipient: z.string().optional(),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(250).optional().default(100),
});
