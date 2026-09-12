import crypto from 'crypto';
import { WorkspaceContext } from '../../packages/core/src/context';
import { AgentRequest, AgentResult, AgentIntent } from './types/agent';
import { IntentRouter } from './IntentRouter';
import { PlanBuilder } from './PlanBuilder';
import { ExecutionEngine } from './ExecutionEngine';
import { AgentExecutionModel } from '../../packages/database/src/models/AgentExecution';
import { AuthorizationError, ValidationError } from '../../packages/core/src/errors';
import { defaultLogger, Logger } from '../../packages/core/src/logger';

export class AgentOrchestrator {
  private router: IntentRouter;
  private planBuilder: PlanBuilder;
  private executionEngine: ExecutionEngine;
  private logger: Logger;

  constructor(
    router: IntentRouter = new IntentRouter(),
    planBuilder: PlanBuilder = new PlanBuilder(),
    executionEngine: ExecutionEngine = new ExecutionEngine(),
    logger: Logger = defaultLogger
  ) {
    this.router = router;
    this.planBuilder = planBuilder;
    this.executionEngine = executionEngine;
    this.logger = logger;
  }

  async execute(context: WorkspaceContext, request: AgentRequest): Promise<AgentResult> {
    if (!context.workspaceId || !context.userId) {
      throw new AuthorizationError('Authoritative WorkspaceContext required for agent execution.');
    }
    if (!request.message || !request.message.trim()) {
      throw new ValidationError('Agent request message is required.');
    }

    const executionId = `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const startTime = Date.now();

    this.logger.info(`Starting Agent Orchestrator execution [ID: ${executionId}]`, {
      workspaceId: context.workspaceId,
      userId: context.userId,
      message: request.message,
    });

    // 1. Intent Routing
    const { intent } = this.router.route(request.message);

    // 2. Execution Plan Construction
    const plans = this.planBuilder.buildPlan(intent, request.message, request.brandId || context.brandId);

    // 3. Execution Engine Processing
    const execution = await this.executionEngine.executePlan(context, executionId, plans);

    // 4. Response & Output Formatting
    let responseText = '';
    let contentId: string | undefined = undefined;
    let sources: Array<{ documentId: string; title?: string }> = [];

    if (execution.status === 'COMPLETED') {
      if (execution.outputs['create_content']) {
        const draft: any = execution.outputs['create_content'];
        contentId = draft._id ? String(draft._id) : draft.id;
        responseText = `Draft content created successfully: "${draft.title}". Status set to ${draft.status}.`;
      } else if (execution.outputs['search_knowledge']) {
        const searchRes: any = execution.outputs['search_knowledge'];
        sources = searchRes.map((r: any) => ({
          documentId: r.documentId,
          title: r.metadata?.documentTitle || r.documentId,
        }));
        responseText = `Retrieved ${searchRes.length} relevant knowledge entries for prompt.`;
      } else {
        responseText = `Agent request processed successfully for intent ${intent}.`;
      }
    } else if (execution.status === 'WAITING_APPROVAL') {
      responseText = `Execution requires human approval for step: ${execution.pendingToolCall}. Action set to WAITING_APPROVAL.`;
    } else {
      responseText = `Agent execution halted with status ${execution.status}: ${execution.error || 'Unknown failure'}`;
    }

    const durationMs = Date.now() - startTime;

    const result: AgentResult = {
      executionId,
      workspaceId: context.workspaceId,
      userId: context.userId,
      status: execution.status,
      intent,
      response: responseText,
      sources,
      contentId,
      requiresApproval: execution.status === 'WAITING_APPROVAL',
      pendingToolCall: execution.pendingToolCall,
      trace: execution.traces,
    };

    // 5. Persist Execution Trace to Database
    try {
      await AgentExecutionModel.create({
        executionId,
        workspaceId: context.workspaceId,
        agentName: 'SingleAgentOrchestrator',
        input: { message: request.message, brandId: request.brandId },
        plan: JSON.stringify(plans),
        toolsUsed: execution.traces.map((t) => t.toolName),
        status: execution.status === 'COMPLETED' ? 'SUCCESS' : execution.status === 'FAILED' ? 'FAILED' : 'RUNNING',
        durationMs,
        result: {
          response: responseText,
          intent,
          requiresApproval: result.requiresApproval,
        },
        error: execution.error,
      });
    } catch (dbErr) {
      this.logger.warn(`Failed to persist AgentExecution record: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`);
    }

    return result;
  }
}
