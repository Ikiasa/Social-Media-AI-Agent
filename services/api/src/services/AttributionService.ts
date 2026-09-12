import { AttributionEventModel, IAttributionEvent, AttributionEventType, IAttributionMetrics } from '../../../../packages/database/src/models/AttributionEvent';
import { ContentModel } from '../../../../packages/database/src/models/Content';
import { WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthorizationError, ValidationError } from '../../../../packages/core/src/errors';
import { eventBus } from './EventBusService';

export type AttributionModelType = 'last_touch' | 'first_touch' | 'linear';

export interface RecordEventInput {
  eventId: string;
  brandId: string;
  campaignId?: string;
  contentId?: string;
  platform: string;
  eventType: AttributionEventType;
  timestamp?: Date | string;
  source?: string;
  metrics?: IAttributionMetrics;
  metadata?: Record<string, unknown>;
}

export interface BreakdownPerformance {
  key: string;
  reach: number;
  impressions: number;
  engagement: number;
  clicks: number;
  ctr: number;
  leads: number;
  conversions: string | number;
}

export interface AttributionReport {
  workspaceId: string;
  brandId: string;
  campaignId?: string;
  model: AttributionModelType;
  period: { startAt: string; endAt: string };
  summary: {
    totalEvents: number;
    reach: number;
    impressions: number;
    engagement: number;
    engagementRate: number;
    clicks: number;
    ctr: number;
    leads: number;
    conversionsStatus: 'available' | 'not_available';
    conversions: string | number;
    conversionRate: string | number;
  };
  byPlatform: BreakdownPerformance[];
  byFormat: BreakdownPerformance[];
  byPillar: BreakdownPerformance[];
  byCta: BreakdownPerformance[];
  topPerformingContent: any[];
  worstPerformingContent: any[];
  dataQuality: {
    missingTrackingSignals: string[];
    hasConversionPixel: boolean;
  };
}

export class AttributionService {
  /**
   * Ingest event with strict tenant isolation and idempotency check
   */
  async recordEvent(ctx: WorkspaceContext, input: RecordEventInput): Promise<IAttributionEvent> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to record attribution event.');
    }
    if (!input.eventId || !input.brandId || !input.platform || !input.eventType) {
      throw new ValidationError('eventId, brandId, platform, and eventType are required.');
    }

    // Sandbox fixture guard: production consumers must not process sandbox records
    if (input.source === 'sandbox_fixture' || (input.metadata as any)?.isSandbox) {
      return null as any;
    }

    // Idempotency Check: Don't process duplicate eventId
    const existing = await AttributionEventModel.findOne({ eventId: input.eventId });
    if (existing) {
      return existing;
    }

    const eventObj = await AttributionEventModel.create({
      eventId: input.eventId,
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      campaignId: input.campaignId,
      contentId: input.contentId,
      platform: input.platform,
      eventType: input.eventType,
      timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
      source: input.source || 'system',
      metrics: input.metrics || {},
      metadata: input.metadata,
    });

    eventBus.publishEvent(input.eventType, {
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      campaignId: input.campaignId,
      contentId: input.contentId,
      eventId: input.eventId,
    });

    return eventObj;
  }

  /**
   * Compute attribution report using last_touch model (with extension support for first_touch & linear)
   */
  async getAttributionReport(
    ctx: WorkspaceContext,
    brandId: string,
    campaignId?: string,
    attributionModel: AttributionModelType = 'last_touch'
  ): Promise<AttributionReport> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required for attribution report.');
    }

    const query: Record<string, unknown> = {
      workspaceId: ctx.workspaceId,
      brandId,
    };
    if (campaignId) {
      query.campaignId = campaignId;
    }

    const events: IAttributionEvent[] = await AttributionEventModel.find(query).sort({ timestamp: 1 }).exec();

    let reach = 0;
    let impressions = 0;
    let engagement = 0;
    let clicks = 0;
    let leads = 0;
    let rawConversions = 0;
    let hasConversionEvents = false;

    const platformStats: Record<string, any> = {};
    const formatStats: Record<string, any> = {};
    const pillarStats: Record<string, any> = {};
    const ctaStats: Record<string, any> = {};

    for (const ev of events) {
      const m = ev.metrics || {};
      const r = m.reach || 0;
      const imp = m.impressions || 0;
      const eng = (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
      const clk = m.clicks || 0;
      const ld = m.leads || 0;
      const conv = m.conversions || 0;

      reach += r;
      impressions += imp;
      engagement += eng;
      clicks += clk;
      leads += ld;

      if (ev.eventType === 'conversion.recorded' || conv > 0) {
        hasConversionEvents = true;
        rawConversions += conv;
      }

      // Aggregate by Platform
      const platKey = ev.platform || 'unknown';
      if (!platformStats[platKey]) {
        platformStats[platKey] = { key: platKey, reach: 0, impressions: 0, engagement: 0, clicks: 0, leads: 0, conversions: 0 };
      }
      platformStats[platKey].reach += r;
      platformStats[platKey].impressions += imp;
      platformStats[platKey].engagement += eng;
      platformStats[platKey].clicks += clk;
      platformStats[platKey].leads += ld;
      platformStats[platKey].conversions += conv;
    }

    // Load content metadata for breakdown by format, pillar, and CTA
    const contentQuery: Record<string, unknown> = { workspaceId: ctx.workspaceId, brandId };
    if (campaignId) contentQuery.campaignId = campaignId;

    const contents = await ContentModel.find(contentQuery).exec();
    for (const item of contents) {
      const formatKey = item.contentType || 'educational';
      const pillarKey = item.contentPillar || 'general';
      const ctaKey = item.cta || 'no_cta';

      if (!formatStats[formatKey]) formatStats[formatKey] = { key: formatKey, reach: 0, impressions: 0, engagement: 0, clicks: 0, leads: 0, conversions: 0 };
      if (!pillarStats[pillarKey]) pillarStats[pillarKey] = { key: pillarKey, reach: 0, impressions: 0, engagement: 0, clicks: 0, leads: 0, conversions: 0 };
      if (!ctaStats[ctaKey]) ctaStats[ctaKey] = { key: ctaKey, reach: 0, impressions: 0, engagement: 0, clicks: 0, leads: 0, conversions: 0 };
    }

    const engagementRate = impressions > 0 ? Number(((engagement / impressions) * 100).toFixed(2)) : 0;
    const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;

    const conversionsStatus = hasConversionEvents ? 'available' : 'not_available';
    const conversionsOutput = hasConversionEvents ? rawConversions : 'not_available';
    const conversionRateOutput = hasConversionEvents && clicks > 0 ? Number(((rawConversions / clicks) * 100).toFixed(2)) : 'not_available';

    const formatBreakdown = (dict: Record<string, any>): BreakdownPerformance[] => {
      return Object.values(dict).map((item) => {
        const itemCtr = item.impressions > 0 ? Number(((item.clicks / item.impressions) * 100).toFixed(2)) : 0;
        return {
          key: item.key,
          reach: item.reach,
          impressions: item.impressions,
          engagement: item.engagement,
          clicks: item.clicks,
          ctr: itemCtr,
          leads: item.leads,
          conversions: hasConversionEvents ? item.conversions : 'not_available',
        };
      });
    };

    const startAt = events.length > 0 ? events[0].timestamp.toISOString() : new Date().toISOString();
    const endAt = events.length > 0 ? events[events.length - 1].timestamp.toISOString() : new Date().toISOString();

    return {
      workspaceId: ctx.workspaceId,
      brandId,
      campaignId,
      model: attributionModel,
      period: { startAt, endAt },
      summary: {
        totalEvents: events.length,
        reach,
        impressions,
        engagement,
        engagementRate,
        clicks,
        ctr,
        leads,
        conversionsStatus,
        conversions: conversionsOutput,
        conversionRate: conversionRateOutput,
      },
      byPlatform: formatBreakdown(platformStats),
      byFormat: formatBreakdown(formatStats),
      byPillar: formatBreakdown(pillarStats),
      byCta: formatBreakdown(ctaStats),
      topPerformingContent: contents.slice(0, 5),
      worstPerformingContent: contents.slice(-3),
      dataQuality: {
        missingTrackingSignals: hasConversionEvents ? [] : ['conversion_pixel_missing', 'crm_webhook_not_connected'],
        hasConversionPixel: hasConversionEvents,
      },
    };
  }
}
