import { WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthorizationError } from '../../../../packages/core/src/errors';
import { CreativeTaskModel, UserModel, ICreativeTask } from '../../../../packages/database/src';

export interface UserCapacityReport {
  userId: string;
  userName: string;
  weeklyCapacityMinutes: number;
  plannedMinutes: number;
  actualMinutes: number;
  utilizationPercent: number;
  isOverCapacity: boolean;
  assignedTasksCount: number;
  overdueTasksCount: number;
  blockedTasksCount: number;
}

export interface AgencyWorkloadSummary {
  workspaceId: string;
  totalTeamMembers: number;
  totalPlannedHours: number;
  averageUtilizationPercent: number;
  usersOverThreshold: string[];
  capacityWarning: boolean;
  userReports: UserCapacityReport[];
}

export class CapacityPlanningService {
  private readonly DEFAULT_WEEKLY_CAPACITY_MINUTES = 2400; // 40 hours / week
  private readonly CAPACITY_WARNING_THRESHOLD = 85.0; // 85% utilization threshold

  /**
   * Calculate Capacity & Workload Summary for Workspace
   */
  async getWorkspaceCapacitySummary(ctx: WorkspaceContext, brandId?: string): Promise<AgencyWorkloadSummary> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    // 1. Get all team users for workspace
    const users = await UserModel.find({ workspaceId: ctx.workspaceId }).exec();
    const userList = users.length > 0 ? users : [{ _id: ctx.userId || 'user-1', name: 'Current User' }];

    const userReports: UserCapacityReport[] = [];
    const usersOverThreshold: string[] = [];

    for (const u of userList) {
      const uId = String(u._id);
      const query: Record<string, unknown> = {
        workspaceId: ctx.workspaceId,
        assigneeId: uId,
        status: { $ne: 'CANCELLED' },
      };
      if (brandId) query.brandId = brandId;

      const tasks = await CreativeTaskModel.find(query).exec();

      let plannedMinutes = 0;
      let actualMinutes = 0;
      let overdueCount = 0;
      let blockedCount = 0;
      const now = new Date();

      for (const t of tasks) {
        plannedMinutes += t.estimatedMinutes || 60;
        actualMinutes += t.actualMinutes || 0;
        if (t.status === 'BLOCKED') blockedCount++;
        if (t.dueAt && new Date(t.dueAt) < now && t.status !== 'DONE') overdueCount++;
      }

      const weeklyCap = this.DEFAULT_WEEKLY_CAPACITY_MINUTES;
      const util = Math.round((plannedMinutes / weeklyCap) * 1000) / 10;
      const isOver = util >= this.CAPACITY_WARNING_THRESHOLD;

      if (isOver) {
        usersOverThreshold.push(uId);
      }

      userReports.push({
        userId: uId,
        userName: u.name || `User (${uId})`,
        weeklyCapacityMinutes: weeklyCap,
        plannedMinutes,
        actualMinutes,
        utilizationPercent: util,
        isOverCapacity: isOver,
        assignedTasksCount: tasks.length,
        overdueTasksCount: overdueCount,
        blockedTasksCount: blockedCount,
      });
    }

    const totalPlannedMins = userReports.reduce((acc, r) => acc + r.plannedMinutes, 0);
    const avgUtil =
      userReports.length > 0
        ? Math.round((userReports.reduce((acc, r) => acc + r.utilizationPercent, 0) / userReports.length) * 10) / 10
        : 0;

    return {
      workspaceId: ctx.workspaceId,
      totalTeamMembers: userReports.length,
      totalPlannedHours: Math.round((totalPlannedMins / 60) * 10) / 10,
      averageUtilizationPercent: avgUtil,
      usersOverThreshold,
      capacityWarning: usersOverThreshold.length > 0,
      userReports,
    };
  }
}
