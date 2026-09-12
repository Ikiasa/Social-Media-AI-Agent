import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AgentOrchestrator } from '../../../../services/agent/AgentOrchestrator';
import { AgentExecutionModel } from '../../../../packages/database/src/models/AgentExecution';
import { ValidationError } from '../../../../packages/core/src/errors';

const orchestrator = new AgentOrchestrator();

export async function runAgent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { message, brandId, conversationId } = req.body;
    const result = await orchestrator.execute(req.context!, {
      message,
      brandId,
      conversationId,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function listExecutions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.context!.workspaceId;
    const executions = await AgentExecutionModel.find({ workspaceId }).sort({ createdAt: -1 }).limit(50).exec();
    res.status(200).json({ data: executions });
  } catch (err) {
    next(err);
  }
}

export async function getExecutionTrace(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const execution = await AgentExecutionModel.findOne({
      executionId: id,
      workspaceId: req.context!.workspaceId,
    });

    if (!execution) {
      throw new ValidationError(`Agent execution trace not found with ID: ${id}`);
    }

    res.status(200).json({ data: execution });
  } catch (err) {
    next(err);
  }
}

export async function approveExecution(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const execution = await AgentExecutionModel.findOne({
      executionId: id,
      workspaceId: req.context!.workspaceId,
    });

    if (!execution) {
      throw new ValidationError(`Agent execution trace not found with ID: ${id}`);
    }

    execution.status = 'SUCCESS';
    execution.result = {
      ...execution.result,
      approvedAt: new Date(),
      approvedBy: req.context!.userId,
    };
    await execution.save();

    res.status(200).json({ data: { executionId: id, status: 'APPROVED' } });
  } catch (err) {
    next(err);
  }
}
