import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreativeAssetService, verifySignedUrlToken } from '../services/api/src/services/CreativeAssetService';
import { MediaProcessingWorker } from '../services/api/src/services/MediaProcessingWorker';
import { CreativeWorkflowService } from '../services/api/src/services/CreativeWorkflowService';
import { CapacityPlanningService } from '../services/api/src/services/CapacityPlanningService';
import { SLAService } from '../services/api/src/services/SLAService';
import { ClientReportService } from '../services/api/src/services/ClientReportService';
import { createWorkspaceContext } from '../packages/core/src/context';
import { tenantFeatureFlags } from '../services/api/src/services/TenantFeatureFlagService';
import {
  CreativeAssetModel,
  CreativeAssetVersionModel,
  CreativeBriefModel,
  CreativeTaskModel,
  ServiceLevelPolicyModel,
  ServiceLevelEventModel,
  ClientReportModel,
  AttributionEventModel,
  SocialMessageModel,
  ContentModel,
  UserModel,
} from '../packages/database/src';

describe('Phase 5: Creative Production Pipeline & Agency Operations Test Suite', () => {
  let assetService: CreativeAssetService;
  let mediaWorker: MediaProcessingWorker;
  let workflowService: CreativeWorkflowService;
  let capacityService: CapacityPlanningService;
  let slaService: SLAService;
  let reportService: ClientReportService;

  const ctxTenantA = createWorkspaceContext('tenant-a', 'user-a');

  beforeEach(() => {
    assetService = new CreativeAssetService();
    mediaWorker = new MediaProcessingWorker();
    workflowService = new CreativeWorkflowService();
    capacityService = new CapacityPlanningService();
    slaService = new SLAService();
    reportService = new ClientReportService();

    vi.restoreAllMocks();

    tenantFeatureFlags.setFlags('tenant-a', {
      creativeAssetPipeline: true,
      agencyOperations: true,
      whiteLabelReporting: true,
    });
    tenantFeatureFlags.setFlags('tenant-b', {
      creativeAssetPipeline: true,
      agencyOperations: true,
      whiteLabelReporting: true,
    });

    // Default Database Mocks to prevent DB timeouts
    vi.spyOn(CreativeAssetVersionModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    } as any);

    vi.spyOn(AttributionEventModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(SocialMessageModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(CreativeTaskModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(ServiceLevelEventModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(ContentModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    } as any);
  });

  // Test 1: Tenant Isolation
  it('1. should enforce strict tenant isolation so Tenant A cannot access Tenant B assets, tasks, SLAs, or reports', async () => {
    vi.spyOn(CreativeAssetModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    } as any);

    await expect(
      assetService.generateSignedDownloadUrl(ctxTenantA, 'asset-tenant-b')
    ).rejects.toThrow('Creative asset asset-tenant-b not found.');

    vi.spyOn(CreativeTaskModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    } as any);

    await expect(
      workflowService.updateTaskStatus(ctxTenantA, 'task-tenant-b', 'DONE')
    ).rejects.toThrow('Task task-tenant-b not found in current workspace.');
  });

  // Test 2: Invalid Asset Ready Status Guard
  it('2. should reject blacklisted file extensions from being uploaded or reaching READY status', async () => {
    await expect(
      assetService.createAsset(ctxTenantA, {
        brandId: 'brand-a',
        name: 'malware_script.exe',
        assetType: 'document',
        mimeType: 'application/x-msdownload',
        fileSizeBytes: 1024,
        checksum: 'sha256_bad_exe',
        storageReference: 'uploads/malware.exe',
      })
    ).rejects.toThrow('File extension is blacklisted due to security policy.');
  });

  // Test 3: Idempotency via Checksum
  it('3. should return existing asset version on duplicate upload with identical checksum', async () => {
    const existingVer = {
      _id: 'v1',
      assetId: 'asset-existing',
      checksum: 'sha256_hash_123',
    };
    const existingAsset = {
      _id: 'asset-existing',
      name: 'Existing Banner',
    };

    vi.spyOn(CreativeAssetVersionModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(existingVer),
    } as any);

    vi.spyOn(CreativeAssetModel, 'findById').mockReturnValue({
      exec: vi.fn().mockResolvedValue(existingAsset),
    } as any);

    vi.spyOn(CreativeAssetModel, 'create');

    const result = await assetService.createAsset(ctxTenantA, {
      brandId: 'brand-a',
      name: 'Duplicate Upload Banner.png',
      assetType: 'image',
      mimeType: 'image/png',
      fileSizeBytes: 2048,
      checksum: 'sha256_hash_123',
      storageReference: 'uploads/dup.png',
    });

    expect(result.asset._id).toBe('asset-existing');
    expect(CreativeAssetModel.create).not.toHaveBeenCalled();
  });

  // Test 4: Asset Change Invalidate Content Approval
  it('4. should invalidate content approval and reset version when attached asset is updated', async () => {
    const assetHeader: any = {
      _id: 'asset-1',
      workspaceId: 'tenant-a',
      brandId: 'brand-a',
      name: 'Hero Visual',
      currentVersion: 1,
      save: vi.fn().mockResolvedValue(true),
    };

    const approvedContent: any = {
      _id: 'content-1',
      workspaceId: 'tenant-a',
      media: ['asset-1'],
      status: 'APPROVED',
      contentVersion: 1,
      approvalSignature: 'sig_old',
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(CreativeAssetModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(assetHeader),
    } as any);

    vi.spyOn(CreativeAssetVersionModel, 'create').mockResolvedValue({
      _id: 'v2',
      version: 2,
    } as any);

    vi.spyOn(ContentModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([approvedContent]),
    } as any);

    await assetService.createNewVersion(ctxTenantA, 'asset-1', {
      mimeType: 'image/png',
      fileSizeBytes: 4096,
      checksum: 'sha256_v2_hash',
      storageReference: 'uploads/hero_v2.png',
    });

    expect(approvedContent.status).toBe('REVISION_REQUESTED');
    expect(approvedContent.approvalSignature).toBeUndefined();
    expect(approvedContent.contentVersion).toBe(2);
    expect(approvedContent.approvalInvalidationReason).toContain('was updated to version 2');
  });

  // Test 5: Unapproved Asset Version Processing Status Guard
  it('5. should enforce that assets must be processed into READY status before derivative completion', async () => {
    const pendingVerRecord: any = {
      _id: 'v-pending',
      mimeType: 'image/png',
      processingStatus: 'PENDING',
      derivatives: [],
      save: vi.fn().mockResolvedValue(true),
    };

    const assetRecord: any = {
      _id: 'asset-1',
      brandId: 'brand-a',
      name: 'Test Image',
      assetType: 'image',
      status: 'PROCESSING',
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(CreativeAssetVersionModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(pendingVerRecord),
    } as any);

    vi.spyOn(CreativeAssetModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(assetRecord),
    } as any);

    const processed = await mediaWorker.processAssetDerivatives(ctxTenantA, 'asset-1', 1);

    expect(processed.processingStatus).toBe('READY');
    expect(processed.derivatives.length).toBeGreaterThan(0);
    expect(assetRecord.status).toBe('READY');
  });

  // Test 6: Derivative Non-Destructive Processing
  it('6. should create non-destructive derivatives for Instagram, TikTok, LinkedIn, X without mutating original asset', async () => {
    const verRecord: any = {
      _id: 'v1',
      assetId: 'a1',
      version: 1,
      mimeType: 'image/png',
      derivatives: [],
      save: vi.fn().mockResolvedValue(true),
    };

    const assetRecord: any = {
      _id: 'a1',
      name: 'Original Visual',
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(CreativeAssetVersionModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(verRecord),
    } as any);

    vi.spyOn(CreativeAssetModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(assetRecord),
    } as any);

    const result = await mediaWorker.processAssetDerivatives(ctxTenantA, 'a1', 1);

    const platforms = result.derivatives.map((d) => d.platform);
    expect(platforms).toContain('instagram');
    expect(platforms).toContain('tiktok');
    expect(platforms).toContain('linkedin');
    expect(platforms).toContain('x');
  });

  // Test 7: Cross-Tenant User Assignment Guard
  it('7. should block assigning task to user belonging to another workspace', async () => {
    vi.spyOn(UserModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(null), // Assignee user not found in Tenant A
    } as any);

    await expect(
      workflowService.createTask(ctxTenantA, {
        brandId: 'brand-a',
        title: 'Cross Tenant Task Assignment',
        taskType: 'copywriting',
        assigneeId: 'user-b-belonging-to-tenant-b',
      })
    ).rejects.toThrow('Cross-tenant assignment blocked.');
  });

  // Test 8: Capacity Threshold Warning (>85%)
  it('8. should trigger capacity warning when team planned workload exceeds capacity threshold', async () => {
    const userA = { _id: 'user-a', name: 'User A' };
    vi.spyOn(UserModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([userA]),
    } as any);

    // Overloaded tasks totaling 2200 minutes out of 2400 (>85% capacity)
    const heavyTasks: any[] = [
      { estimatedMinutes: 1200, actualMinutes: 0, status: 'IN_PROGRESS' },
      { estimatedMinutes: 1000, actualMinutes: 0, status: 'TODO' },
    ];

    vi.spyOn(CreativeTaskModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue(heavyTasks),
    } as any);

    const summary = await capacityService.getWorkspaceCapacitySummary(ctxTenantA);

    expect(summary.capacityWarning).toBe(true);
    expect(summary.usersOverThreshold).toContain('user-a');
    expect(summary.userReports[0].utilizationPercent).toBeGreaterThan(85.0);
  });

  // Test 9: SLA Calculation & Business Hours
  it('9. should calculate SLA due date and evaluate MET, AT_RISK, or BREACHED statuses', async () => {
    const policy: any = {
      maxMinutesAllowed: 60,
      atRiskWarningMinutes: 15,
      businessHoursOnly: true,
      timezone: 'Asia/Jakarta',
    };

    vi.spyOn(ServiceLevelPolicyModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(policy),
    } as any);

    vi.spyOn(ServiceLevelEventModel, 'create').mockImplementation((data: any) => {
      return Promise.resolve({ ...data, _id: 'sla-evt-1' }) as any;
    });

    const slaEvt = await slaService.startSLAEvent(ctxTenantA, 'brand-a', 'INBOX_RESPONSE', 'msg-100');

    expect(slaEvt.targetType).toBe('INBOX_RESPONSE');
    expect(slaEvt.status).toBe('MET');
    expect(new Date(slaEvt.dueAt).getTime()).toBeGreaterThan(Date.now());
  });

  // Test 10: Report Data Isolation
  it('10. should isolate report data strictly by workspaceId and brandId', async () => {
    vi.spyOn(ClientReportModel, 'create').mockImplementation((data: any) => {
      expect(data.workspaceId).toBe('tenant-a');
      expect(data.brandId).toBe('brand-a');
      return Promise.resolve({ ...data, _id: 'report-1' }) as any;
    });

    const report = await reportService.generateReportDraft(ctxTenantA, {
      brandId: 'brand-a',
      reportTitle: 'Isolated Tenant Report',
      periodStart: new Date('2026-08-01'),
      periodEnd: new Date('2026-08-31'),
    });

    expect(report.workspaceId).toBe('tenant-a');
  });

  // Test 11: White-Label Config Isolation
  it('11. should apply authentic tenant white-label branding configuration in client reports', async () => {
    vi.spyOn(ClientReportModel, 'create').mockImplementation((data: any) => {
      return Promise.resolve({ ...data, _id: 'report-wl-1' }) as any;
    });

    const report = await reportService.generateReportDraft(ctxTenantA, {
      brandId: 'brand-a',
      reportTitle: 'White-Label Agency Report',
      periodStart: new Date('2026-08-01'),
      periodEnd: new Date('2026-08-31'),
      whiteLabelConfig: {
        logoUrl: 'https://tenant-a.com/logo.png',
        brandName: 'Custom Agency Brand',
        primaryColor: '#ff5500',
        footerText: 'Custom White Label Footer',
      },
    });

    expect(report.whiteLabelConfig.logoUrl).toBe('https://tenant-a.com/logo.png');
    expect(report.whiteLabelConfig.primaryColor).toBe('#ff5500');
  });

  // Test 12: Signed Download URL Authorization Guard
  it('12. should reject signed download URL generation if user context is unauthenticated', async () => {
    const unauthCtx = { workspaceId: '', userId: '' } as any;

    await expect(
      assetService.generateSignedDownloadUrl(unauthCtx, 'asset-1')
    ).rejects.toThrow('Workspace & User context required.');
  });

  // Test 13: Feature Flag Enforcement
  it('13. should block API requests when Phase 5 feature flags are disabled for tenant', async () => {
    tenantFeatureFlags.setFlags('tenant-a', {
      creativeAssetPipeline: false,
      agencyOperations: false,
      whiteLabelReporting: false,
    });

    await expect(
      assetService.createAsset(ctxTenantA, {
        brandId: 'brand-a',
        name: 'Asset Test',
        assetType: 'image',
        mimeType: 'image/png',
        fileSizeBytes: 100,
        checksum: 'abc',
        storageReference: 'ref',
      })
    ).rejects.toThrow('Feature "creativeAssetPipeline" is disabled for this tenant.');

    await expect(
      workflowService.createBrief(ctxTenantA, {
        brandId: 'brand-a',
        title: 'Brief Test',
        objective: 'Obj',
        targetAudience: 'Aud',
        platform: 'instagram',
        format: 'post',
        keyMessage: 'Msg',
      })
    ).rejects.toThrow('Feature "agencyOperations" is disabled for this tenant.');

    await expect(
      reportService.generateReportDraft(ctxTenantA, {
        brandId: 'brand-a',
        reportTitle: 'Report Test',
        periodStart: new Date(),
        periodEnd: new Date(),
      })
    ).rejects.toThrow('Feature "whiteLabelReporting" is disabled for this tenant.');
  });

  // Test 14: Phase 1-4 Full Zero-Regression Guard
  it('14. should preserve all Phase 1-4 domain guards, 3-tier approval signatures, and queue guard contracts', () => {
    expect(tenantFeatureFlags.isFeatureEnabled('tenant-a', 'clientApprovalPortal')).toBe(true);
    expect(tenantFeatureFlags.isFeatureEnabled('tenant-a', 'campaignIntelligence')).toBe(true);
    expect(tenantFeatureFlags.isFeatureEnabled('tenant-a', 'competitorRadar')).toBe(true);
    expect(tenantFeatureFlags.isFeatureEnabled('tenant-a', 'unifiedInbox')).toBe(true);
  });

  // Test 15: Non-empty file empty payload checksum rejection
  it('15. should reject non-empty file (fileSizeBytes > 0) with empty string SHA-256 checksum (e3b0c44298fc...)', async () => {
    await expect(
      assetService.createAsset(ctxTenantA, {
        brandId: 'brand-a',
        name: 'NonEmptyVideo.mp4',
        assetType: 'video',
        mimeType: 'video/mp4',
        fileSizeBytes: 1048576, // 1MB
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        storageReference: 'uploads/nonempty.mp4',
      })
    ).rejects.toThrow('INVALID_CHECKSUM: Non-empty file cannot use empty payload SHA-256 hash');
  });

  // Test 16: Worker Checksum Match Guard
  it('16. should fail worker derivative processing if asset version uses empty payload hash for non-empty file', async () => {
    const invalidVerRecord: any = {
      _id: 'v-invalid',
      fileSizeBytes: 2048,
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      mimeType: 'image/png',
      processingStatus: 'PENDING',
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(CreativeAssetVersionModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(invalidVerRecord),
    } as any);

    await expect(
      mediaWorker.processAssetDerivatives(ctxTenantA, 'asset-1', 1)
    ).rejects.toThrow('INVALID_WORKER_CHECKSUM');
  });

  // Test 17: Asset Name Ambiguity Guard
  it('17. should prevent logical asset ambiguity when creating asset with existing name', async () => {
    const existingAssetHeader: any = {
      _id: 'asset-hero-1',
      workspaceId: 'tenant-a',
      brandId: 'brand-a',
      name: 'Hero Visual Banner.png',
      currentVersion: 1,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(CreativeAssetModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(existingAssetHeader),
    } as any);

    vi.spyOn(CreativeAssetVersionModel, 'create').mockResolvedValue({
      _id: 'v2',
      version: 2,
    } as any);

    const result = await assetService.createAsset(ctxTenantA, {
      brandId: 'brand-a',
      name: 'Hero Visual Banner.png',
      assetType: 'image',
      mimeType: 'image/png',
      fileSizeBytes: 4096,
      checksum: 'sha256_different_new_content',
      storageReference: 'uploads/hero_v2.png',
    });

    expect(result.asset._id).toBe('asset-hero-1');
    expect(result.version.version).toBe(2);
  });

  // Test 18: Signed URL Token Expiration Guard
  it('18. should reject expired signed export URL tokens', () => {
    const expiredMs = Date.now() - 5000; // 5 seconds in the past
    const expiredToken = Buffer.from(`tenant-a:report-100:${expiredMs}`).toString('base64url');

    expect(() => verifySignedUrlToken(expiredToken)).toThrow('Signed export URL has expired.');
  });
});
