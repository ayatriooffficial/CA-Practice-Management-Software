import { z } from 'zod';

const objectId = /^[0-9a-fA-F]{24}$/;
const moduleSchema = z.enum(['Task', 'DSC', 'License']);
const statusSchema = z.enum(['draft', 'published', 'disabled']);
const workflowGraphSchema = z.object({
  nodes: z.array(z.object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    type: z.enum(['action', 'condition']),
    name: z.string().trim().min(1).max(80),
    config: z.record(z.unknown()),
  }).strict()).max(12),
  edges: z.array(z.object({
    id: z.string().min(1).max(180),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.enum(['true', 'false', 'next']),
  }).strict()).max(32),
}).strict().superRefine((graph, ctx) => {
  const ids = new Set<string>();
  graph.nodes.forEach((node, index) => {
    if (ids.has(node.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nodes', index, 'id'], message: 'Node identifiers must be unique.' });
    ids.add(node.id);
  });
  const handles = new Set<string>();
  const edgeIds = new Set<string>();
  for (const [index, edge] of graph.edges.entries()) {
    if (!ids.has(edge.source) || (edge.target !== '__end__' && !ids.has(edge.target))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['edges', index], message: 'Connection references a missing node.' });
    }
    if (edgeIds.has(edge.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['edges', index, 'id'], message: 'Connection identifiers must be unique.' });
    edgeIds.add(edge.id);
    const handle = `${edge.source}:${edge.sourceHandle}`;
    if (handles.has(handle)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['edges', index], message: 'A node output can have only one connection.' });
    handles.add(handle);
  }
  for (const [index, node] of graph.nodes.entries()) {
    const outputs = graph.edges.filter((edge) => edge.source === node.id);
    if (node.type === 'condition' && (!handles.has(`${node.id}:true`) || !handles.has(`${node.id}:false`) || outputs.length !== 2 || outputs.some((edge) => !['true', 'false'].includes(edge.sourceHandle)))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nodes', index], message: 'Condition nodes need exactly true and false connections.' });
    }
    if (node.type === 'action' && (outputs.length > 1 || outputs.some((edge) => edge.sourceHandle !== 'next'))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nodes', index], message: 'Action nodes may have one next connection.' });
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id); visited.add(id);
    for (const edge of graph.edges.filter((item) => item.source === id && item.target !== '__end__')) if (!visit(edge.target)) return false;
    visiting.delete(id); return true;
  };
  if (graph.nodes.length && !visit(graph.nodes[0].id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['edges'], message: 'Workflow connections cannot contain cycles.' });
  if (visited.size !== graph.nodes.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nodes'], message: 'Every node must connect to the workflow entry.' });
});

const configSchema = z.record(z.unknown()).superRefine((config, ctx) => {
  if (config.workflowGraph === undefined) return;
  const parsed = workflowGraphSchema.safeParse(config.workflowGraph);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) ctx.addIssue({ ...issue, path: ['workflowGraph', ...issue.path] });
  }
});

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
