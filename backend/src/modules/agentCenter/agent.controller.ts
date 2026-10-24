import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/utils/apiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { AgentCenterService } from './agent.service';
import { AgentExecutionService } from './execution.service';
import { getPublicDefinitions } from './definitions';
import { AppError } from '../../shared/utils/apiError';

function organizationId(req: Request): string {
  if (!req.user?.orgId) throw AppError.unauthorized('Organization context is required.');
  return String(req.user.orgId);
}

export class AgentCenterController {
  static definitions = asyncHandler(async (_req: Request, res: Response) => {
    return ApiResponse.success(res, getPublicDefinitions(), 'Agent definitions fetched successfully');
  });

  static list = asyncHandler(async (req: Request, res: Response) => {
    const items = await AgentCenterService.list(organizationId(req), {
      module: typeof req.query.module === 'string' ? req.query.module as 'Task' | 'DSC' | 'License' : undefined,
      status: typeof req.query.status === 'string' ? req.query.status as 'draft' | 'published' | 'disabled' : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    return ApiResponse.success(res, items, 'Agents fetched successfully');
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const agent = await AgentCenterService.create(req.body as Record<string, unknown>, organizationId(req));
    return ApiResponse.created(res, agent, 'Agent saved as draft');
  });

  static get = asyncHandler(async (req: Request, res: Response) => {
    const agent = await AgentCenterService.get(req.params.id as string, organizationId(req));
    return ApiResponse.success(res, agent, 'Agent details retrieved successfully');
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const agent = await AgentCenterService.update(req.params.id as string, req.body as Record<string, unknown>, organizationId(req));
    return ApiResponse.success(res, agent, 'Draft agent updated successfully');
  });

  static publish = asyncHandler(async (req: Request, res: Response) => {
    const agent = await AgentCenterService.publish(req.params.id as string, organizationId(req));
    return ApiResponse.success(res, agent, 'Agent published successfully');
  });

  static disable = asyncHandler(async (req: Request, res: Response) => {
    const agent = await AgentCenterService.disable(req.params.id as string, organizationId(req));
    return ApiResponse.success(res, agent, 'Agent disabled successfully');
  });

  static deleteDraft = asyncHandler(async (req: Request, res: Response) => {
    const result = await AgentCenterService.deleteDraft(req.params.id as string, organizationId(req));
    return ApiResponse.success(res, result, 'Draft agent deleted successfully');
  });

  static testRun = asyncHandler(async (req: Request, res: Response) => {
    const idempotencyKey = req.get('Idempotency-Key') || undefined;
    const run = await AgentExecutionService.run(req.params.id as string, {
      idempotencyKey,
      failRecipient: typeof req.body?.failRecipient === 'string' ? req.body.failRecipient : undefined,
      orgId: organizationId(req),
    });
    return ApiResponse.created(res, run, 'Simulated test run recorded. No real notification was sent.');
  });

  static agentHistory = asyncHandler(async (req: Request, res: Response) => {
    // A read through get() ensures an unknown agent consistently returns 404.
    await AgentCenterService.get(req.params.id as string, organizationId(req));
    const runs = await AgentExecutionService.forAgent(req.params.id as string, organizationId(req));
    return ApiResponse.success(res, runs, 'Agent execution history retrieved successfully');
  });

  static globalHistory = asyncHandler(async (req: Request, res: Response) => {
    const limit = typeof req.query.limit === 'number' ? req.query.limit : typeof req.query.limit === 'string' ? Number(req.query.limit) : 100;
    const history = await AgentExecutionService.list(organizationId(req), limit, true);
    return ApiResponse.success(res, history, 'Agent history retrieved successfully');
  });
}
