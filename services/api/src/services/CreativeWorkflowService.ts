import { WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthorizationError, ValidationError } from '../../../../packages/core/src/errors';
import {
  CreativeBriefModel,
  CreativeTaskModel,
  UserModel,
  ICreativeBrief,
  ICreativeTask,
  TaskType,
  TaskPriority,
  TaskStatus,
} from '../../../../packages/database/src';
import { tenantFeatureFlags } from './TenantFeatureFlagService';
import { eventBus } from './EventBusService';

export interface CreateBriefInput {
  brandId: string;
  campaignId?: string;
  contentId?: string;
  title: string;
  objective: string;
  targetAudience: string;
  platform: string;
  format: string;
  keyMessage: string;
  hookDirection?: string;
  cta?: string;
  brandVoice?: string;
  mandatoryElements?: string[];
  restrictedTopics?: string[];
  referenceAssetIds?: string[];
  acceptanceCriteria?: string[];
  deadline?: Date;
}

export interface CreateTaskInput {
  brandId: string;
  campaignId?: string;
  contentId?: string;
  briefId?: string;
  title: string;
  taskType: TaskType;
  priority?: TaskPriority;
  assigneeId?: string;
  dueAt?: Date;
  estimatedMinutes?: number;
  dependencies?: string[];
  attachedAssetId?: string;
  attachedAssetVersion?: number;
}

export class CreativeWorkflowService {
  /**
   * Create Creative Brief Draft
   */
  async createBrief(ctx: WorkspaceContext, input: CreateBriefInput): Promise<ICreativeBrief> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace & User context required.');
    }

    if (!tenantFeatureFlags.isFeatureEnabled(ctx.workspaceId, 'agencyOperations')) {
      throw new AuthorizationError('Feature "agencyOperations" is disabled for this tenant.');
    }

    if (!input.brandId || !input.title || !input.objective || !input.keyMessage) {
      throw new ValidationError('brandId, title, objective, and keyMessage are required.');
    }

    const brief = await CreativeBriefModel.create({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      campaignId: input.campaignId,
      contentId: input.contentId,
      title: input.title,
      objective: input.objective,
      targetAudience: input.targetAudience,
      platform: input.platform,
      format: input.format,
      keyMessage: input.keyMessage,
      hookDirection: input.hookDirection,
      cta: input.cta,
      brandVoice: input.brandVoice,
      mandatoryElements: input.mandatoryElements || [],
      restrictedTopics: input.restrictedTopics || [],
      referenceAssetIds: input.referenceAssetIds || [],
      acceptanceCriteria: input.acceptanceCriteria || [],
      deadline: input.deadline,
      status: 'DRAFT',
      createdBy: ctx.userId,
    });

    eventBus.publishEvent('creative_brief.created', {
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      briefId: String(brief._id),
    });

    return brief;
  }

  /**
   * Create Creative Task & Assign to Team Member with Cross-Tenant Security Guard
   */
  async createTask(ctx: WorkspaceContext, input: CreateTaskInput): Promise<ICreativeTask> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace & User context required.');
    }

    if (!input.brandId || !input.title || !input.taskType) {
      throw new ValidationError('brandId, title, and taskType are required.');
    }

    // CROSS-TENANT ASSIGNEE SECURITY GUARD
    if (input.assigneeId) {
      const assigneeUser = await UserModel.findOne({
        _id: input.assigneeId,
        workspaceId: ctx.workspaceId,
      }).exec();

      if (!assigneeUser) {
        throw new AuthorizationError(`Assignee user ${input.assigneeId} does not belong to workspace ${ctx.workspaceId}. Cross-tenant assignment blocked.`);
      }
    }

    const task = await CreativeTaskModel.create({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      campaignId: input.campaignId,
      contentId: input.contentId,
      briefId: input.briefId,
      title: input.title,
      taskType: input.taskType,
      status: 'TODO',
      priority: input.priority || 'NORMAL',
      assigneeId: input.assigneeId,
      dueAt: input.dueAt,
      estimatedMinutes: input.estimatedMinutes || 60,
      actualMinutes: 0,
      dependencies: input.dependencies || [],
      attachedAssetId: input.attachedAssetId,
      attachedAssetVersion: input.attachedAssetVersion,
    });

    if (input.assigneeId) {
      eventBus.publishEvent('creative_task.assigned', {
        workspaceId: ctx.workspaceId,
        brandId: input.brandId,
        taskId: String(task._id),
        assigneeId: input.assigneeId,
      });
    }

    return task;
  }

  /**
   * Update Task Status
   */
  async updateTaskStatus(
    ctx: WorkspaceContext,
    taskId: string,
    status: TaskStatus,
    actualMinutes?: number
  ): Promise<ICreativeTask> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    const task = await CreativeTaskModel.findOne({
      _id: taskId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!task) {
      throw new ValidationError(`Task ${taskId} not found in current workspace.`);
    }

    task.status = status;
    if (actualMinutes !== undefined) {
      task.actualMinutes = actualMinutes;
    }
    await task.save();

    eventBus.publishEvent('creative_task.status_changed', {
      workspaceId: ctx.workspaceId,
      brandId: task.brandId,
      taskId: String(task._id),
      status,
    });

    return task;
  }
}
