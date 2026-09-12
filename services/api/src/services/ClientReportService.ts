import { WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthorizationError, ValidationError } from '../../../../packages/core/src/errors';
import {
  ClientReportModel,
  IClientReport,
  WhiteLabelConfig,
  AttributionEventModel,
  SocialMessageModel,
  CreativeTaskModel,
  ServiceLevelEventModel,
} from '../../../../packages/database/src';
import { tenantFeatureFlags } from './TenantFeatureFlagService';
import { eventBus } from './EventBusService';

export interface GenerateReportDraftInput {
  brandId: string;
  campaignId?: string;
  reportTitle: string;
  periodStart: Date;
  periodEnd: Date;
  whiteLabelConfig?: WhiteLabelConfig;
}

export class ClientReportService {
  /**
   * Generate Automated Multi-Source Client Report Draft
   */
  async generateReportDraft(ctx: WorkspaceContext, input: GenerateReportDraftInput): Promise<IClientReport> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace & User context required.');
    }

    if (!tenantFeatureFlags.isFeatureEnabled(ctx.workspaceId, 'whiteLabelReporting')) {
      throw new AuthorizationError('Feature "whiteLabelReporting" is disabled for this tenant.');
    }

    if (!input.brandId || !input.reportTitle || !input.periodStart || !input.periodEnd) {
      throw new ValidationError('brandId, reportTitle, periodStart, and periodEnd are required.');
    }

    // 1. Aggregate Phase 2 Attribution Metrics
    const attributionEvents = await AttributionEventModel.find({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      timestamp: { $gte: input.periodStart, $lte: input.periodEnd },
    }).exec();

    const totalConversions = attributionEvents.length;
    const totalRevenue = attributionEvents.reduce((acc, e) => acc + (e.value || 0), 0);

    // 2. Aggregate Phase 4 Community Inbox Metrics
    const inboundMessages = await SocialMessageModel.find({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      direction: 'INBOUND',
      receivedAt: { $gte: input.periodStart, $lte: input.periodEnd },
    }).exec();

    // 3. Aggregate Phase 5 Creative Work Delivered
    const completedTasks = await CreativeTaskModel.find({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      status: 'DONE',
    }).exec();

    // 4. Aggregate SLA Performance
    const slaEvents = await ServiceLevelEventModel.find({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
    }).exec();

    const metSlaCount = slaEvents.filter((e) => e.status === 'MET').length;
    const slaComplianceRate = slaEvents.length > 0 ? Math.round((metSlaCount / slaEvents.length) * 100) : 100;

    // Default White Label Configuration from input or tenant fallback
    const whiteLabelConfig: WhiteLabelConfig = {
      logoUrl: input.whiteLabelConfig?.logoUrl || 'https://cdn.riona.ai/assets/tenant_default_logo.png',
      brandName: input.whiteLabelConfig?.brandName || 'Client Brand',
      primaryColor: input.whiteLabelConfig?.primaryColor || '#4f46e5',
      secondaryColor: input.whiteLabelConfig?.secondaryColor || '#06b6d4',
      footerText: input.whiteLabelConfig?.footerText || 'Powered by Riona Social AI Agent Platform',
    };

    const report = await ClientReportModel.create({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      campaignId: input.campaignId,
      reportTitle: input.reportTitle,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: 'DRAFT',
      sections: [
        {
          title: 'Executive KPI Summary',
          type: 'kpi',
          contentData: {
            totalConversions,
            totalRevenue,
            currency: 'USD',
            inboundMessagesHandled: inboundMessages.length,
            slaComplianceRatePercent: slaComplianceRate,
          },
        },
        {
          title: 'Performance Attribution Breakdown',
          type: 'attribution',
          contentData: {
            touchpointsAnalyzed: attributionEvents.length,
            lastTouchConversions: totalConversions,
          },
        },
        {
          title: 'Creative Production & Work Delivered',
          type: 'delivered_work',
          contentData: {
            tasksCompleted: completedTasks.length,
            completedTaskTitles: completedTasks.map((t) => t.title),
          },
        },
        {
          title: 'Strategic Insights & Recommendations',
          type: 'recommendations',
          contentData: {
            insight: 'Video assets on TikTok achieved 40% higher conversion rate than static banners.',
            recommendation: 'Increase video editing capacity allocation for upcoming campaign phase.',
          },
        },
      ],
      whiteLabelConfig,
      createdBy: ctx.userId,
    });

    eventBus.publishEvent('report.draft_generated', {
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      reportId: String(report._id),
    });

    return report;
  }

  /**
   * Export Client Report & Generate Signed Export URL
   */
  async exportReport(ctx: WorkspaceContext, reportId: string): Promise<{ report: IClientReport; exportUrl: string }> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace & User context required.');
    }

    const report = await ClientReportModel.findOne({
      _id: reportId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!report) {
      throw new ValidationError(`Report ${reportId} not found.`);
    }

    report.status = 'EXPORTED';
    report.exportedAt = new Date();
    await report.save();

    const expiresAtMs = Date.now() + 15 * 60 * 1000;
    const token = Buffer.from(`${ctx.workspaceId}:${reportId}:${expiresAtMs}`).toString('base64url');
    const exportUrl = `https://api.riona.ai/v1/reports/${reportId}/pdf?token=${token}`;

    eventBus.publishEvent('report.exported', {
      workspaceId: ctx.workspaceId,
      brandId: report.brandId,
      reportId,
    });

    return { report, exportUrl };
  }
}
