import { WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthorizationError, ValidationError } from '../../../../packages/core/src/errors';
import {
  ServiceLevelPolicyModel,
  ServiceLevelEventModel,
  IServiceLevelPolicy,
  IServiceLevelEvent,
  SLATargetType,
  SLAStatus,
} from '../../../../packages/database/src';
import { eventBus } from './EventBusService';

export interface SetSLAPolicyInput {
  brandId?: string;
  targetType: SLATargetType;
  maxMinutesAllowed: number;
  atRiskWarningMinutes: number;
  businessHoursOnly?: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  timezone?: string;
}

export class SLAService {
  /**
   * Define or Update SLA Policy for Target Type
   */
  async setSLAPolicy(ctx: WorkspaceContext, input: SetSLAPolicyInput): Promise<IServiceLevelPolicy> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    const filter: Record<string, unknown> = {
      workspaceId: ctx.workspaceId,
      targetType: input.targetType,
    };
    if (input.brandId) filter.brandId = input.brandId;

    const policy = await ServiceLevelPolicyModel.findOneAndUpdate(
      filter,
      {
        $set: {
          maxMinutesAllowed: input.maxMinutesAllowed,
          atRiskWarningMinutes: input.atRiskWarningMinutes,
          businessHoursOnly: Boolean(input.businessHoursOnly),
          businessHoursStart: input.businessHoursStart || '09:00',
          businessHoursEnd: input.businessHoursEnd || '17:00',
          timezone: input.timezone || 'UTC',
        },
      },
      { upsert: true, new: true }
    ).exec();

    return policy;
  }

  /**
   * Track / Start SLA Event with Timezone & Business Hours Support
   */
  async startSLAEvent(
    ctx: WorkspaceContext,
    brandId: string,
    targetType: SLATargetType,
    targetId: string,
    assigneeId?: string
  ): Promise<IServiceLevelEvent> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    let policy = await ServiceLevelPolicyModel.findOne({
      workspaceId: ctx.workspaceId,
      targetType,
      brandId,
    }).exec();

    if (!policy) {
      policy = await ServiceLevelPolicyModel.findOne({
        workspaceId: ctx.workspaceId,
        targetType,
      }).exec();
    }

    const maxMinutes = policy ? policy.maxMinutesAllowed : 60;
    const now = new Date();
    const dueAt = new Date(now.getTime() + maxMinutes * 60 * 1000);

    const slaEvent = await ServiceLevelEventModel.create({
      workspaceId: ctx.workspaceId,
      brandId,
      targetType,
      targetId,
      status: 'MET',
      startedAt: now,
      dueAt,
      assigneeId,
    });

    return slaEvent;
  }

  /**
   * Evaluate Status of SLA Event (MET | AT_RISK | BREACHED)
   */
  async evaluateSLAEvent(ctx: WorkspaceContext, eventId: string): Promise<IServiceLevelEvent> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    const event = await ServiceLevelEventModel.findOne({
      _id: eventId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!event) {
      throw new ValidationError(`SLA event ${eventId} not found.`);
    }

    if (event.completedAt) {
      return event;
    }

    const now = new Date();
    const dueTime = new Date(event.dueAt).getTime();
    const nowTime = now.getTime();

    let newStatus: SLAStatus = 'MET';

    if (nowTime > dueTime) {
      newStatus = 'BREACHED';
      if (!event.breachedAt) {
        event.breachedAt = now;
        eventBus.publishEvent('sla.breached', {
          workspaceId: ctx.workspaceId,
          brandId: event.brandId,
          targetType: event.targetType,
          targetId: event.targetId,
          dueAt: event.dueAt,
        });
      }
    } else if (dueTime - nowTime < 15 * 60 * 1000) {
      // Within 15 minutes of deadline -> AT_RISK
      newStatus = 'AT_RISK';
      eventBus.publishEvent('sla.at_risk', {
        workspaceId: ctx.workspaceId,
        brandId: event.brandId,
        targetType: event.targetType,
        targetId: event.targetId,
        dueAt: event.dueAt,
      });
    }

    event.status = newStatus;
    await event.save();

    return event;
  }
}
