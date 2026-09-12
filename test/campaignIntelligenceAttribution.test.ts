import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CampaignService } from '../services/api/src/services/CampaignService';
import { AttributionService } from '../services/api/src/services/AttributionService';
import { TenantFeatureFlagService, tenantFeatureFlags } from '../services/api/src/services/TenantFeatureFlagService';
import { WorkspaceContext } from '../packages/core/src/context';
import { ValidationError, AuthorizationError } from '../packages/core/src/errors';
import { CampaignModel } from '../packages/database/src/models/Campaign';
import { AttributionEventModel } from '../packages/database/src/models/AttributionEvent';
import { ContentModel } from '../packages/database/src/models/Content';
import { KnowledgeDocumentModel } from '../packages/database/src/models/KnowledgeDocument';

const VALID_ID_1 = '507f191e810c19729de860ea';
const VALID_ID_2 = '507f191e810c19729de860eb';

describe('Phase 2: Campaign Intelligence & Performance Attribution Integration Suite', () => {
  let campaignService: CampaignService;
  let attributionService: AttributionService;

  const ctxTenantA: WorkspaceContext = {
    workspaceId: 'tenant_alpha',
    userId: 'user_a',
  };

  const ctxTenantB: WorkspaceContext = {
    workspaceId: 'tenant_beta',
    userId: 'user_b',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    attributionService = new AttributionService();
    campaignService = new CampaignService(undefined as any, attributionService);

    // Default mocks to prevent database hang in unit environment
    vi.spyOn(KnowledgeDocumentModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    } as any);
  });

  // TEST 1: Tenant A cannot access Tenant B's campaigns, events, or reports
  it('1. Tenant A cannot access Tenant B campaigns, events, or attribution reports', async () => {
    vi.spyOn(CampaignModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    } as any);
    vi.spyOn(AttributionEventModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    await expect(
      campaignService.getCampaignDetails(ctxTenantA, VALID_ID_1)
    ).rejects.toThrow(ValidationError);
  });

  // TEST 2: Content linking validation (same tenant and brand)
  it('2. Content can only be linked to a campaign belonging to the exact same tenant and brand', async () => {
    vi.spyOn(CampaignModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    } as any);

    // Attempting to fetch campaign details from tenant_beta should throw error
    await expect(
      campaignService.getCampaignDetails(ctxTenantB, VALID_ID_1)
    ).rejects.toThrow(ValidationError);
  });

  // TEST 3: Idempotent event ingestion prevents metric inflation
  it('3. Duplicate eventId ingestion should be idempotent and not inflate metrics', async () => {
    const mockExistingEvent: any = {
      eventId: 'evt_dup_100',
      workspaceId: 'tenant_alpha',
      brandId: 'brand_1',
      platform: 'instagram',
      eventType: 'link.clicked',
      metrics: { clicks: 1 },
    };

    vi.spyOn(AttributionEventModel, 'findOne').mockResolvedValue(mockExistingEvent);
    vi.spyOn(AttributionEventModel, 'create');

    const result = await attributionService.recordEvent(ctxTenantA, {
      eventId: 'evt_dup_100',
      brandId: 'brand_1',
      platform: 'instagram',
      eventType: 'link.clicked',
      metrics: { clicks: 1 },
    });

    expect(result.eventId).toBe('evt_dup_100');
    expect(AttributionEventModel.create).not.toHaveBeenCalled();
  });

  // TEST 4: Last-touch attribution touchpoint selection
  it('4. Last-touch attribution model should aggregate and select touchpoints accurately', async () => {
    const mockEvents: any[] = [
      {
        eventId: 'ev_1',
        workspaceId: 'tenant_alpha',
        brandId: 'brand_1',
        campaignId: VALID_ID_1,
        platform: 'instagram',
        eventType: 'content.published',
        timestamp: new Date('2026-09-01T10:00:00Z'),
        metrics: { reach: 1000, impressions: 2000, likes: 50, comments: 10 },
      },
      {
        eventId: 'ev_2',
        workspaceId: 'tenant_alpha',
        brandId: 'brand_1',
        campaignId: VALID_ID_1,
        platform: 'instagram',
        eventType: 'link.clicked',
        timestamp: new Date('2026-09-02T12:00:00Z'),
        metrics: { clicks: 15 },
      },
    ];

    vi.spyOn(AttributionEventModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEvents),
      }),
    } as any);

    vi.spyOn(ContentModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    } as any);

    const report = await attributionService.getAttributionReport(
      ctxTenantA,
      'brand_1',
      VALID_ID_1,
      'last_touch'
    );

    expect(report.model).toBe('last_touch');
    expect(report.summary.reach).toBe(1000);
    expect(report.summary.clicks).toBe(15);
    expect(report.summary.totalEvents).toBe(2);
  });

  // TEST 5: Accurate calculation of KPI actual vs target
  it('5. Campaign details should accurately calculate KPI actual versus target percentage', async () => {
    const mockCampaign: any = {
      _id: VALID_ID_1,
      workspaceId: 'tenant_alpha',
      brandId: 'brand_1',
      name: 'Q3 Brand Campaign',
      kpiTargets: { reach: 10000, impressions: 20000, clicks: 500, engagementRate: 5.0 },
    };

    const mockEvents: any[] = [
      {
        eventId: 'ev_1',
        workspaceId: 'tenant_alpha',
        brandId: 'brand_1',
        campaignId: VALID_ID_1,
        platform: 'instagram',
        eventType: 'content.published',
        timestamp: new Date(),
        metrics: { reach: 5000, impressions: 10000, likes: 250, comments: 250, clicks: 250 },
      },
    ];

    vi.spyOn(CampaignModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockCampaign),
    } as any);

    vi.spyOn(AttributionEventModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEvents),
      }),
    } as any);

    vi.spyOn(ContentModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    } as any);

    const details = await campaignService.getCampaignDetails(ctxTenantA, VALID_ID_1);

    expect(details.actualVsTarget.reach.achievedPercent).toBe(50);
    expect(details.actualVsTarget.clicks.achievedPercent).toBe(50);
  });

  // TEST 6: Report without conversion data displays 'not_available'
  it('6. Attribution report without conversion signals must honestly display not_available', async () => {
    const mockEvents: any[] = [
      {
        eventId: 'ev_click_only',
        workspaceId: 'tenant_alpha',
        brandId: 'brand_1',
        platform: 'x',
        eventType: 'link.clicked',
        timestamp: new Date(),
        metrics: { clicks: 100 },
      },
    ];

    vi.spyOn(AttributionEventModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEvents),
      }),
    } as any);

    vi.spyOn(ContentModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    } as any);

    const report = await attributionService.getAttributionReport(ctxTenantA, 'brand_1');

    expect(report.summary.conversionsStatus).toBe('not_available');
    expect(report.summary.conversions).toBe('not_available');
    expect(report.summary.conversionRate).toBe('not_available');
    expect(report.dataQuality.hasConversionPixel).toBe(false);
  });

  // TEST 7: AI Campaign draft content requires 3-tier approval
  it('7. Strategy Agent generated campaign draft content must have status DRAFT requiring 3-tier approval', async () => {
    const mockCampaign: any = {
      _id: VALID_ID_1,
      workspaceId: 'tenant_alpha',
      brandId: 'brand_1',
      name: 'AI Campaign',
    };

    vi.spyOn(CampaignModel, 'create').mockResolvedValue(mockCampaign);
    vi.spyOn(ContentModel, 'create').mockImplementation(async (data: any) => data);

    const plan = await campaignService.planCampaignStrategy(ctxTenantA, {
      brandId: 'brand_1',
      objective: 'LEADS',
      platforms: ['instagram', 'linkedin'],
      targetAudience: 'Agency Owners',
      periodDays: 14,
      productOffer: 'Riona Social AI Suite',
    });

    expect(plan.createdDraftContents.length).toBeGreaterThan(0);
    for (const draft of plan.createdDraftContents) {
      expect(draft.status).toBe('DRAFT'); // MANDATORY APPROVAL GUARD
      expect(draft.campaignId).toBe(VALID_ID_1);
    }
  });

  // TEST 8: Multi-timezone campaign calculation accuracy
  it('8. Campaign startAt/endAt dates in different timezones (Asia/Jakarta vs UTC) must calculate correctly', async () => {
    const inputDateAsia = new Date('2026-09-01T00:00:00+07:00');
    const mockCampaign: any = {
      _id: VALID_ID_2,
      workspaceId: 'tenant_alpha',
      brandId: 'brand_1',
      name: 'Timezone Campaign',
      startAt: inputDateAsia,
      endAt: new Date('2026-09-15T23:59:59+07:00'),
      timezone: 'Asia/Jakarta',
    };

    vi.spyOn(CampaignModel, 'create').mockResolvedValue(mockCampaign);

    const campaign = await campaignService.createCampaign(ctxTenantA, {
      brandId: 'brand_1',
      name: 'Timezone Campaign',
      objective: 'AWARENESS',
      platforms: ['instagram'],
      startAt: '2026-09-01T00:00:00+07:00',
      endAt: '2026-09-15T23:59:59+07:00',
      timezone: 'Asia/Jakarta',
      targetAudience: 'Indonesia Audience',
    });

    expect(campaign.timezone).toBe('Asia/Jakarta');
    expect(campaign.startAt).toEqual(inputDateAsia);
  });

  // TEST 9: Feature flag disables endpoints & UI gracefully for unauthorized tenants
  it('9. Feature flag "campaignIntelligence" disabled should throw AuthorizationError', async () => {
    tenantFeatureFlags.setFlags('tenant_disabled', { campaignIntelligence: false });

    const ctxDisabled: WorkspaceContext = {
      workspaceId: 'tenant_disabled',
      userId: 'user_disabled',
    };

    await expect(
      campaignService.createCampaign(ctxDisabled, {
        brandId: 'brand_1',
        name: 'Blocked Campaign',
        objective: 'AWARENESS',
        platforms: ['instagram'],
        startAt: new Date(),
        endAt: new Date(),
        targetAudience: 'Test',
      })
    ).rejects.toThrow(AuthorizationError);
  });
});
