import { ToolRegistry, createDefaultToolRegistry } from '../../packages/ai/src/tools';
import { WorkspaceContext } from '../../packages/core/src/context';
import { AgentStepPlan, ExecutionStepTrace, AgentGuardrails, ExecutionStatus } from './types/agent';
import { AgentExecutionModel } from '../../packages/database/src/models/AgentExecution';
import { defaultLogger, Logger } from '../../packages/core/src/logger';
import { AppError } from '../../packages/core/src/errors';

export interface ExecutionEngineOptions {
  registry?: ToolRegistry;
  guardrails?: Partial<AgentGuardrails>;
  logger?: Logger;
}

export class ExecutionEngine {
  private registry: ToolRegistry;
  private guardrails: AgentGuardrails;
  private logger: Logger;

  constructor(options: ExecutionEngineOptions = {}) {
    this.registry = options.registry || createDefaultToolRegistry();
    this.guardrails = {
      maxSteps: options.guardrails?.maxSteps || 10,
      maxToolCalls: options.guardrails?.maxToolCalls || 15,
      maxExecutionTimeMs: options.guardrails?.maxExecutionTimeMs || 30000,
    };
    this.logger = options.logger || defaultLogger;
  }

  async executePlan(
    context: WorkspaceContext,
    _executionId: string,
    plans: AgentStepPlan[]
  ): Promise<{
    status: ExecutionStatus;
    traces: ExecutionStepTrace[];
    outputs: Record<string, unknown>;
    pendingToolCall?: string;
    error?: string;
  }> {
    const traces: ExecutionStepTrace[] = [];
    const outputs: Record<string, unknown> = {};
    const startTime = Date.now();
    let toolCallCount = 0;

    for (let i = 0; i < plans.length; i++) {
      const step = plans[i];

      if (i >= this.guardrails.maxSteps) {
        this.logger.warn(`Execution limit reached: maxSteps (${this.guardrails.maxSteps}) exceeded.`);
        return { status: 'LIMIT_REACHED', traces, outputs, error: 'Max steps limit exceeded' };
      }

      if (Date.now() - startTime > this.guardrails.maxExecutionTimeMs) {
        this.logger.warn(`Execution timeout: maxExecutionTimeMs (${this.guardrails.maxExecutionTimeMs}ms) exceeded.`);
        return { status: 'LIMIT_REACHED', traces, outputs, error: 'Execution timeout' };
      }

      const tool = this.registry.get(step.toolName);
      if (!tool) {
        const stepTrace: ExecutionStepTrace = {
          stepIndex: step.stepIndex,
          toolName: step.toolName,
          status: 'FAILED',
          error: `TOOL_NOT_FOUND: Tool '${step.toolName}' is not registered on the agent allowlist.`,
          startedAt: new Date(),
          completedAt: new Date(),
        };
        traces.push(stepTrace);
        return { status: 'FAILED', traces, outputs, error: stepTrace.error };
      }

      // Check Human Approval Boundary
      if (tool.requiresApproval) {
        this.logger.info(`Tool '${tool.name}' requires human approval. Halting execution.`);
        const stepTrace: ExecutionStepTrace = {
          stepIndex: step.stepIndex,
          toolName: step.toolName,
          status: 'WAITING_APPROVAL',
          inputSummary: step.input,
          startedAt: new Date(),
        };
        traces.push(stepTrace);
        return {
          status: 'WAITING_APPROVAL',
          traces,
          outputs,
          pendingToolCall: tool.name,
        };
      }

      toolCallCount++;
      if (toolCallCount > this.guardrails.maxToolCalls) {
        this.logger.warn(`Execution limit reached: maxToolCalls (${this.guardrails.maxToolCalls}) exceeded.`);
        return { status: 'LIMIT_REACHED', traces, outputs, error: 'Max tool calls limit exceeded' };
      }

      const stepStart = new Date();
      try {
        const result = await tool.execute(context, step.input);
        const stepTrace: ExecutionStepTrace = {
          stepIndex: step.stepIndex,
          toolName: step.toolName,
          status: 'SUCCESS',
          inputSummary: step.input,
          outputSummary: typeof result === 'object' && result !== null ? (result as Record<string, unknown>) : { result },
          startedAt: stepStart,
          completedAt: new Date(),
        };
        traces.push(stepTrace);
        outputs[step.toolName] = result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const stepTrace: ExecutionStepTrace = {
          stepIndex: step.stepIndex,
          toolName: step.toolName,
          status: 'FAILED',
          error: errorMsg,
          startedAt: stepStart,
          completedAt: new Date(),
        };
        traces.push(stepTrace);

        // If error is AppError or unexpected, record trace failure
        return { status: 'FAILED', traces, outputs, error: errorMsg };
      }
    }

    return { status: 'COMPLETED', traces, outputs };
  }
}
