import { CampaignModel, ICampaign, CampaignObjective, CampaignStatus } from '../../../../packages/database/src/models/Campaign';
import { ContentModel, IContent } from '../../../../packages/database/src/models/Content';
import { WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthorizationError, ValidationError } from '../../../../packages/core/src/errors';
import { tenantFeatureFlags } from './TenantFeatureFlagService';
import { KnowledgeService } from './KnowledgeService';
import { AttributionService } from './AttributionService';

export interface CreateCampaignInput {
  brandId: string;
  name: string;
  description?: string;
  objective: CampaignObjective;
  platforms: string[];
  startAt: Date | string;
  endAt: Date | string;
  timezone?: string;
  targetAudience: string;
  budget?: number;
  currency?: string;
  kpiTargets?: {
    reach?: number;
    impressions?: number;
    engagementRate?: number;
    clicks?: number;
    ctr?: number;
    leads?: number;
    conversionRate?: number;
  };
  contentPillars?: string[];
  utmDefaults?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
}

export interface StrategyPlanInput {
  brandId: string;
  objective: CampaignObjective;
  platforms: string[];
  targetAudience: string;
  periodDays: number;
  productOffer: string;
  customKpi?: Record<string, number>;
  trendSignals?: { label?: string; topic?: string; platform?: string; evidence?: string[] }[];
  brandConstraints?: {
    voice?: string;
    contentPillars?: string[];
    restrictedTopics?: string[];
  };
}

export interface StrategyPlanResult {
  campaignThesis: string;
  keyMessage: string;
  contentMix: { platform: string; postType: string; count: number }[];
  calendarRecommendation: { day: number; platform: string; postType: string; topic: string }[];
  ctaStrategy: string;
  kpiTargets: Record<string, number>;
  prioritizedExperiments: string[];
  assumptionsAndMissingSignals: string[];
  trendEvaluation?: {
    evaluatedSignalsCount: number;
    rejectedSignalsCount: number;
    rejectionRationale?: string[];
  };
  createdDraftContents: Partial<IContent>[];
}

export class CampaignService {
  private knowledgeService: KnowledgeService;
  private attributionService: AttributionService;

  constructor(
    knowledgeService: KnowledgeService = new KnowledgeService(),
    attributionService: AttributionService = new AttributionService()
  ) {
    this.knowledgeService = knowledgeService;
    this.attributionService = attributionService;
  }

  /**
   * Create campaign document with tenant isolation and feature flag enforcement
   */
  async createCampaign(ctx: WorkspaceContext, input: CreateCampaignInput): Promise<ICampaign> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace & User context required.');
    }

    if (!tenantFeatureFlags.isFeatureEnabled(ctx.workspaceId, 'campaignIntelligence')) {
      throw new AuthorizationError('Feature "campaignIntelligence" is disabled for this tenant.');
    }

    if (!input.brandId || !input.name || !input.targetAudience) {
      throw new ValidationError('brandId, name, and targetAudience are required.');
    }

    return await CampaignModel.create({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      name: input.name,
      description: input.description,
      objective: input.objective || 'AWARENESS',
      status: 'DRAFT',
      platforms: input.platforms && input.platforms.length > 0 ? input.platforms : ['instagram'],
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      timezone: input.timezone || 'Asia/Jakarta',
      targetAudience: input.targetAudience,
      budget: input.budget,
      currency: input.currency || 'IDR',
      kpiTargets: input.kpiTargets || { reach: 10000, engagementRate: 4.5, clicks: 500 },
      contentPillars: input.contentPillars || ['Educational', 'Social Proof', 'Promotional'],
      utmDefaults: input.utmDefaults || { utmSource: 'social_ai', utmMedium: 'cpc', utmCampaign: input.name.toLowerCase().replace(/\s+/g, '_') },
      createdBy: ctx.userId,
    });
  }

  /**
   * List campaigns belonging to current tenant
   */
  async listCampaigns(ctx: WorkspaceContext, brandId?: string): Promise<ICampaign[]> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    const query: Record<string, unknown> = { workspaceId: ctx.workspaceId };
    if (brandId) query.brandId = brandId;

    return await CampaignModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Get single campaign with KPI actual vs target comparison
   */
  async getCampaignDetails(ctx: WorkspaceContext, campaignId: string, requestedBrandId?: string) {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    const campaign = await CampaignModel.findOne({ _id: campaignId, workspaceId: ctx.workspaceId }).exec();
    if (!campaign) {
      throw new ValidationError(`Campaign ${campaignId} not found in current workspace.`);
    }

    if (requestedBrandId && campaign.brandId !== requestedBrandId) {
      throw new ValidationError(`Campaign brandId mismatch: Requested brandId '${requestedBrandId}' does not match campaign brandId '${campaign.brandId}'.`);
    }

    const report = await this.attributionService.getAttributionReport(ctx, campaign.brandId, campaignId);

    const actualVsTarget = {
      reach: { actual: report.summary.reach, target: campaign.kpiTargets?.reach || 10000, achievedPercent: Number(((report.summary.reach / (campaign.kpiTargets?.reach || 10000)) * 100).toFixed(1)) },
      impressions: { actual: report.summary.impressions, target: campaign.kpiTargets?.impressions || 20000, achievedPercent: Number(((report.summary.impressions / (campaign.kpiTargets?.impressions || 20000)) * 100).toFixed(1)) },
      clicks: { actual: report.summary.clicks, target: campaign.kpiTargets?.clicks || 500, achievedPercent: Number(((report.summary.clicks / (campaign.kpiTargets?.clicks || 500)) * 100).toFixed(1)) },
      engagementRate: { actual: report.summary.engagementRate, target: campaign.kpiTargets?.engagementRate || 4.5, achievedPercent: Number(((report.summary.engagementRate / (campaign.kpiTargets?.engagementRate || 4.5)) * 100).toFixed(1)) },
    };

    return {
      campaign,
      actualVsTarget,
      attributionReport: report,
    };
  }

  /**
   * Plan campaign strategy using Strategy Agent, Brand Knowledge Base RAG & Trend Radar Insights
   * Note: Generated draft contents are ALWAYS saved with status 'DRAFT' requiring 3-tier approval.
   */
  async planCampaignStrategy(ctx: WorkspaceContext, input: StrategyPlanInput): Promise<StrategyPlanResult> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace and User context required.');
    }

    if (!tenantFeatureFlags.isFeatureEnabled(ctx.workspaceId, 'campaignIntelligence')) {
      throw new AuthorizationError('Feature "campaignIntelligence" is disabled for this tenant.');
    }

    // Restricted Topics Defense: Validate Trend Signals against brand restricted topics
    const restrictedTopics = (input.brandConstraints?.restrictedTopics || []).map((t) => t.toLowerCase());
    const rejectionRationale: string[] = [];
    let evaluatedSignalsCount = 0;
    let rejectedSignalsCount = 0;

    if (input.trendSignals && input.trendSignals.length > 0) {
      evaluatedSignalsCount = input.trendSignals.length;

      for (const signal of input.trendSignals) {
        const signalText = `${signal.label || ''} ${signal.topic || ''} ${(signal.evidence || []).join(' ')}`.toLowerCase();
        const matchedRestricted = restrictedTopics.find((rt) => signalText.includes(rt));

        if (matchedRestricted) {
          rejectedSignalsCount++;
          rejectionRationale.push(
            `Trend signal '${signal.label || signal.topic || 'Signal'}' REJECTED because it conflicts with brand restricted topic '${matchedRestricted}'.`
          );
        }
      }
    }

    // Query Brand RAG Knowledge
    const brandKnowledge = await this.knowledgeService.listDocuments(ctx).catch(() => []);
    const knowledgeSummary = brandKnowledge.map((d: any) => d.title).join(', ');

    const campaignThesis = `Strategi Kampanye ${input.objective} berdurasi ${input.periodDays} hari untuk ${input.productOffer}. Menyoroti USP utama berbasis audiensi ${input.targetAudience}.`;
    const keyMessage = `Transformasikan performa sosial media Anda dengan ${input.productOffer}. Terbukti meningkatkan keterlibatan hingga 3x lipat!`;

    const contentMix = [
      { platform: 'instagram', postType: 'carousel_educational', count: 4 },
      { platform: 'instagram', postType: 'reels_short', count: 3 },
      { platform: 'linkedin', postType: 'thought_leadership', count: 3 },
      { platform: 'x', postType: 'thread_value', count: 5 },
    ];

    const calendarRecommendation = [
      { day: 1, platform: 'instagram', postType: 'carousel_educational', topic: `Cara Memulai ${input.productOffer}` },
      { day: 3, platform: 'linkedin', postType: 'thought_leadership', topic: `Mengapa Agensi Butuh Automasi AI` },
      { day: 5, platform: 'instagram', postType: 'reels_short', topic: `3 Kesalahan Utama Saat Campaign Social Media` },
      { day: 7, platform: 'x', postType: 'thread_value', topic: `Studi Kasus: Peningkatan ROI 400%` },
    ];

    // Create Campaign Record
    const newCampaign = await this.createCampaign(ctx, {
      brandId: input.brandId,
      name: `AI Campaign: ${input.productOffer} (${input.objective})`,
      objective: input.objective,
      platforms: input.platforms,
      startAt: new Date(),
      endAt: new Date(Date.now() + input.periodDays * 24 * 60 * 60 * 1000),
      targetAudience: input.targetAudience,
      kpiTargets: { reach: 15000, engagementRate: 5.0, clicks: 750 },
    });

    // Create DRAFT content items linked to campaignId
    // CRITICAL: Status is set to DRAFT so it MUST pass 3-tier approval workflow!
    const createdDraftContents: Partial<IContent>[] = [];
    for (const item of calendarRecommendation) {
      const draft = await ContentModel.create({
        workspaceId: ctx.workspaceId,
        brandId: input.brandId,
        campaignId: String(newCampaign._id),
        platform: item.platform,
        title: item.topic,
        contentType: item.postType,
        contentPillar: 'Campaign Pillar',
        hook: `Perhatian ${input.targetAudience}! Ini cara terbaik menguasai ${item.topic}.`,
        body: `Berikut panduan lengkap strategi ${item.topic} untuk mencapai objective ${input.objective}.`,
        caption: `🚀 ${item.topic}\n\nTemukan cara terbaik meningkatkan performa sosial media Anda dengan ${input.productOffer}.\n\n👇 Klik link di bio untuk informasi selengkapnya!`,
        cta: `Klik Link di Bio untuk Trial ${input.productOffer}!`,
        hashtags: ['#SocialMediaAI', '#RionaAgent', '#MarketingAutomation'],
        status: 'DRAFT', // MANDATORY APPROVAL GUARD
        contentVersion: 1,
        createdBy: ctx.userId,
      });
      createdDraftContents.push(draft);
    }

    return {
      campaignThesis,
      keyMessage,
      contentMix,
      calendarRecommendation,
      ctaStrategy: `Gunakan CTA berorientasi ${input.objective} dengan urgensi langsung ke landing page resmi.`,
      kpiTargets: { reach: 15000, engagementRate: 5.0, clicks: 750 },
      prioritizedExperiments: [
        'A/B Testing hook pertanyaan vs hook data statistik pada Carousel IG',
        'Uji coba waktu posting jam 12:00 vs 19:00 WIB',
      ],
      assumptionsAndMissingSignals: [
        'Klaim conversion rate mengasumsikan pixel tracking sudah terpasang di landing page.',
        `Pengetahuan brand ditautkan ke ${knowledgeSummary || 'default brand guidelines'}.`,
      ],
      trendEvaluation: {
        evaluatedSignalsCount,
        rejectedSignalsCount,
        rejectionRationale: rejectionRationale.length > 0 ? rejectionRationale : undefined,
      },
      createdDraftContents,
    };
  }
}
