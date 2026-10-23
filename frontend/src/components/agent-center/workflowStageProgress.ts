export const WORKFLOW_STAGES = ['event', 'recipient', 'channel', 'action'] as const;

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];
export type WorkflowStageProgress = Partial<Record<WorkflowStage, boolean>>;
export type WorkflowStageValidity = Record<WorkflowStage, boolean>;
export type WorkflowStageStatus = 'locked' | 'active' | 'completed';

export function isWorkflowStageUnlocked(stage: WorkflowStage, progress: WorkflowStageProgress): boolean {
  const index = WORKFLOW_STAGES.indexOf(stage);
  return WORKFLOW_STAGES.slice(0, index).every((previous) => progress[previous] === true);
}

export function inferCompletedWorkflowStages(validity: WorkflowStageValidity): WorkflowStageProgress {
  const progress: WorkflowStageProgress = {};
  for (const stage of WORKFLOW_STAGES) {
    if (!validity[stage]) break;
    progress[stage] = true;
  }
  return progress;
}

export function restoreWorkflowStageProgress(
  validity: WorkflowStageValidity,
  savedProgress?: unknown,
): WorkflowStageProgress {
  if (!savedProgress || typeof savedProgress !== 'object' || Array.isArray(savedProgress)) {
    return inferCompletedWorkflowStages(validity);
  }
  const saved = savedProgress as Partial<Record<WorkflowStage, unknown>>;
  return inferCompletedWorkflowStages(Object.fromEntries(
    WORKFLOW_STAGES.map((stage) => [stage, validity[stage] && saved[stage] === true]),
  ) as WorkflowStageValidity);
}

export function invalidateWorkflowStagesFrom(progress: WorkflowStageProgress, stage: WorkflowStage): WorkflowStageProgress {
  const firstAffected = WORKFLOW_STAGES.indexOf(stage);
  return Object.fromEntries(
    Object.entries(progress).filter(([key, value]) => WORKFLOW_STAGES.indexOf(key as WorkflowStage) < firstAffected && value === true),
  ) as WorkflowStageProgress;
}

export type WorkflowStageCommitResult =
  | { ok: true; progress: WorkflowStageProgress; nextStage?: WorkflowStage }
  | { ok: false; reason: 'locked' | 'invalid' | 'save-failed'; message: string };

export async function commitWorkflowStage(
  stage: WorkflowStage,
  progress: WorkflowStageProgress,
  validate: () => string | undefined,
  save: () => Promise<void>,
): Promise<WorkflowStageCommitResult> {
  if (!isWorkflowStageUnlocked(stage, progress)) {
    return { ok: false, reason: 'locked', message: 'Complete the previous stage first.' };
  }
  const validationMessage = validate();
  if (validationMessage) return { ok: false, reason: 'invalid', message: validationMessage };
  try {
    await save();
  } catch (error) {
    return {
      ok: false,
      reason: 'save-failed',
      message: error instanceof Error ? error.message : 'The draft could not be saved. Please try again.',
    };
  }
  const updatedProgress = { ...progress, [stage]: true };
  const nextStage = WORKFLOW_STAGES[WORKFLOW_STAGES.indexOf(stage) + 1];
  return { ok: true, progress: updatedProgress, ...(nextStage ? { nextStage } : {}) };
}

export function createStageCommitGuard() {
  let inFlight = false;
  return async function runGuarded<T>(
    fn: () => Promise<T>,
  ): Promise<T | { ok: false; reason: 'busy'; message: string }> {
    if (inFlight) {
      return { ok: false, reason: 'busy', message: 'A stage save is already in progress.' };
    }
    inFlight = true;
    try {
      return await fn();
    } finally {
      inFlight = false;
    }
  };
}
