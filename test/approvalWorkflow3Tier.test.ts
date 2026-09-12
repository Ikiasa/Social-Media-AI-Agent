import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApprovalWorkflowService } from '../services/api/src/services/ApprovalWorkflowService';
import { TenantFeatureFlagService } from '../services/api/src/services/TenantFeatureFlagService';
import { BrandMemoryService } from '../services/api/src/services/BrandMemoryService';
import { CostObservabilityService } from '../services/api/src/services/CostObservabilityService';
import { WorkspaceContext } from '../packages/core/src/context';

describe('3-Tier Client Approval Portal & Core Architecture Services', () => {
  const mockRepo = {
    findById: vi.fn(),
    update: vi.fn(),
  };

  let approvalService: ApprovalWorkflowService;
  const ctx: WorkspaceContext = {
    workspaceId: 'ws_agency_123',
    userId: 'user_writer_1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    approvalService = new ApprovalWorkflowService(mockRepo as any);
  });

  it('1. Writer should submit draft for strategist review', async () => {
    const draftContent = {
      _id: 'c_1',
      title: 'Carousel Edukasi Produktivitas',
      status: 'DRAFT',
      metadata: {},
    };

    mockRepo.findById.mockResolvedValue(draftContent);
    mockRepo.update.mockImplementation(async (_id, _wsId, updates) => ({
      ...draftContent,
      ...updates,
    }));

    const res = await approvalService.submitForStrategistReview(ctx, 'c_1', 'Rekomendasi tayang jam 7 malam');

    expect(res.status).toBe('PENDING_STRATEGIST_REVIEW');
    expect(mockRepo.update).toHaveBeenCalledWith('c_1', 'ws_agency_123', expect.objectContaining({
      status: 'PENDING_STRATEGIST_REVIEW',
    }));
  });

  it('2. Strategist should pass content to client review', async () => {
    const pendingContent = {
      _id: 'c_1',
      title: 'Carousel Edukasi Produktivitas',
      status: 'PENDING_STRATEGIST_REVIEW',
      metadata: {},
    };

    mockRepo.findById.mockResolvedValue(pendingContent);
    mockRepo.update.mockImplementation(async (_id, _wsId, updates) => ({
      ...pendingContent,
      ...updates,
    }));

    const res = await approvalService.strategistReview(
      { ...ctx, userId: 'user_strategist_1' },
      'c_1',
      'approve',
      'Konten sudah sesuai brand guideline'
    );

    expect(res.status).toBe('PENDING_CLIENT_REVIEW');
  });

  it('3. Client should approve content and generate valid signature', async () => {
    const clientPendingContent = {
      _id: 'c_1',
      title: 'Carousel Edukasi Produktivitas',
      caption: 'Ini caption edukasi produktivitas',
      status: 'PENDING_CLIENT_REVIEW',
      metadata: {},
    };

    mockRepo.findById.mockResolvedValue(clientPendingContent);
    mockRepo.update.mockImplementation(async (_id, _wsId, updates) => ({
      ...clientPendingContent,
      ...updates,
    }));

    const res = await approvalService.clientDecision(
      ctx,
      'c_1',
      'approve',
      'Klien PT Indah Jaya',
      'Setuju disiarkan'
    );

    expect(res.status).toBe('APPROVED');
    expect(res.approvalSignature || res.metadata?.approvalSignature).toBeDefined();
  });

  it('4. TenantFeatureFlagService should return default tenant feature flags', () => {
    const flagService = new TenantFeatureFlagService();
    const flags = flagService.getFlags('ws_agency_123');

    expect(flags.clientApprovalPortal).toBe(true);
    expect(flags.whiteLabeling).toBe(true);
    expect(flags.campaignIntelligence).toBe(true);
  });

  it('5. BrandMemoryService should maintain strict multi-tenant isolation', async () => {
    const memoryService = new BrandMemoryService();
    await memoryService.addMemory('ws_tenant_A', 'brand_1', 'reels_format', 'Format 15 detik memiliki HRR 45% lebih tinggi');
    await memoryService.addMemory('ws_tenant_B', 'brand_2', 'reels_format', 'Format 30 detik lebih baik untuk B2B');

    const tenantAMemories = await memoryService.queryBrandMemories('ws_tenant_A', 'brand_1');
    expect(tenantAMemories).toHaveLength(1);
    expect(tenantAMemories[0].insight).toContain('15 detik');

    const tenantBMemories = await memoryService.queryBrandMemories('ws_tenant_B', 'brand_2');
    expect(tenantBMemories).toHaveLength(1);
    expect(tenantBMemories[0].insight).toContain('30 detik');
  });

  it('6. CostObservabilityService should calculate estimated LLM token costs', () => {
    const costService = new CostObservabilityService();
    costService.recordUsage('ws_agency_123', 'Content Agent', 1000, 2000, 'brand_1');

    const metrics = costService.getWorkspaceMetrics('ws_agency_123', 'brand_1');
    expect(metrics.totalRequests).toBe(1);
    expect(metrics.totalPromptTokens).toBe(1000);
    expect(metrics.totalCompletionTokens).toBe(2000);
    expect(metrics.totalCostUsd).toBeGreaterThan(0);
  });
});
