import { WorkspaceContext } from '../../../packages/core/src/context';

export type AgentIntent =
  | 'STRATEGY'
  | 'CONTENT_GENERATION'
  | 'CONTENT_REVISION'
  | 'KNOWLEDGE_SEARCH'
  | 'CONTENT_REVIEW'
  | 'CONTENT_MANAGEMENT'
  | 'ANALYTICS'
  | 'GENERAL';

export type ExecutionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'LIMIT_REACHED';

export interface AgentRequest {
  message: string;
  brandId?: string;
  conversationId?: string;
}

export interface AgentStepPlan {
  stepIndex: number;
  toolName: string;
  purpose: string;
  input: Record<string, unknown>;
}

export interface ExecutionStepTrace {
  stepIndex: number;
  toolName: string;
  status: 'SUCCESS' | 'FAILED' | 'WAITING_APPROVAL';
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface AgentResult {
  executionId: string;
  workspaceId: string;
  userId: string;
  status: ExecutionStatus;
  intent: AgentIntent;
  response: string;
  sources?: Array<{ documentId: string; title?: string }>;
  contentId?: string;
  requiresApproval: boolean;
  pendingToolCall?: string;
  trace: ExecutionStepTrace[];
}

export interface AgentGuardrails {
  maxSteps: number;
  maxToolCalls: number;
  maxExecutionTimeMs: number;
}
