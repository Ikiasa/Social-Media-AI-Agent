import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApprovalWorkflowService } from '../services/api/src/services/ApprovalWorkflowService';
import { ContentService } from '../services/api/src/services/ContentService';
import { PublishingWorker } from '../services/scheduler/PublishingWorker';
import { ScheduledPostModel } from '../packages/database/src/models/ScheduledPost';
import { SocialAccountModel } from '../packages/database/src/models/SocialAccount';
import { ContentModel } from '../packages/database/src/models/Content';
import { PublicationModel } from '../packages/database/src/models/Publication';
import { WorkspaceContext } from '../packages/core/src/context';
import { ValidationError } from '../packages/core/src/errors';
import {
  generateCanonicalApprovalHmac,
  verifyCanonicalApprovalHmac,
  CanonicalApprovalPayload,
  encryptToken,
} from '../packages/core/src/crypto';

const VALID_OBJECT_ID_1 = '507f191e810c19729de860ea';
const VALID_OBJECT_ID_2 = '507f191e810c19729de860eb';
const VALID_OBJECT_ID_3 = '507f191e810c19729de860ec';

describe('Security Hardening: 3-Tier Approval Workflow & Publishing Queue Guard', () => {
  let approvalService: ApprovalWorkflowService;
  let contentService: ContentService;
  let publishingWorker: PublishingWorker;

  const mockRepo = {
    findById: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
  };

  const ctxTenantA: WorkspaceContext = {
    workspaceId: 'tenant_alpha',
    userId: 'user_writer_a',
  };

  const ctxTenantB: WorkspaceContext = {
    workspaceId: 'tenant_beta',
    userId: 'user_attacker_b',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    approvalService = new ApprovalWorkflowService(mockRepo as any);
    contentService = new ContentService(mockRepo as any);
    publishingWorker = new PublishingWorker();
  });

  // TEST 1: Tenant isolation on read, review, comment, and decision
  it('1. Should strictly enforce tenant isolation across read, review, and comment operations', async () => {
    mockRepo.findById.mockResolvedValue(null); // findById with tenant_beta returns null for tenant_alpha item

    await expect(
      approvalService.submitForStrategistReview(ctxTenantB, VALID_OBJECT_ID_1)
    ).rejects.toThrow(ValidationError);

    await expect(
      approvalService.strategistReview(ctxTenantB, VALID_OBJECT_ID_1, 'approve')
    ).rejects.toThrow(ValidationError);

    await expect(
      approvalService.clientDecision(ctxTenantB, VALID_OBJECT_ID_1, 'approve', 'Client B')
    ).rejects.toThrow(ValidationError);

    await expect(
      approvalService.addComment(ctxTenantB, VALID_OBJECT_ID_1, 'Attacker', 'client', 'Malicious comment')
    ).rejects.toThrow(ValidationError);
  });

  // TEST 2: Client cannot approve without strategist approval
  it('2. Should block Client decision if content has not received prior Strategist approval', async () => {
    const rawDraft = {
      _id: VALID_OBJECT_ID_1,
      workspaceId: 'tenant_alpha',
      title: 'Raw Unreviewed Post',
      status: 'DRAFT',
      contentVersion: 1,
    };

    mockRepo.findById.mockResolvedValue(rawDraft);

    await expect(
      approvalService.clientDecision(ctxTenantA, VALID_OBJECT_ID_1, 'approve', 'Direct Client')
    ).rejects.toThrow(/PENDING_CLIENT_REVIEW/);
  });

  // TEST 3: Edit content after client approval invalidates signature and increments contentVersion
  it('3. Should invalidate approval signature and increment contentVersion on material edit after approval', async () => {
    const approvedContent = {
      _id: VALID_OBJECT_ID_1,
      workspaceId: 'tenant_alpha',
      title: 'Approved Post Title',
      caption: 'Original Approved Caption',
      status: 'APPROVED',
      contentVersion: 1,
      approvedBy: 'Client CEO',
      finalApprovedBy: 'Client CEO',
      finalApprovalAt: new Date(),
      approvalSignature: 'valid_hmac_sig_v1',
      metadata: { approvalHistory: [] },
    };

    mockRepo.findById.mockResolvedValue(approvedContent);
    mockRepo.update.mockImplementation(async (_id, _wsId, updates) => ({
      ...approvedContent,
      ...updates,
    }));

    const result = await contentService.updateContent(ctxTenantA, VALID_OBJECT_ID_1, {
      caption: 'TAMPERED Caption After Client Approval',
    });

    expect(result).toBeDefined();
    expect(result?.contentVersion).toBe(2);
    expect(result?.status).toBe('DRAFT');
    expect(result?.approvalSignature).toBeUndefined();
    expect(result?.finalApprovedBy).toBeUndefined();
    expect(result?.approvalInvalidatedAt).toBeDefined();
    expect(result?.approvalInvalidationReason).toContain('Material content edit after final approval');
  });

  // TEST 4: Queue rejects invalid signature, expired, or version mismatch
  it('4. Queue Guard should reject job with BLOCKED_APPROVAL_VALIDATION if HMAC signature is invalid or tampered', async () => {
    const mockPost: any = {
      _id: 'sched_tampered_1',
      workspaceId: 'tenant_alpha',
      contentId: VALID_OBJECT_ID_1,
      platform: 'instagram',
      scheduledAt: new Date(),
      status: 'READY_TO_PUBLISH',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockContentTampered: any = {
      _id: VALID_OBJECT_ID_1,
      workspaceId: 'tenant_alpha',
      platform: 'instagram',
      title: 'Post Title',
      caption: 'Caption text',
      status: 'APPROVED',
      contentVersion: 2,
      finalApprovedBy: 'Client Manager',
      finalApprovalAt: new Date(),
      approvalSignature: 'INVALID_OR_TAMPERED_SIGNATURE_9999', // Invalid HMAC
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(ScheduledPostModel, 'find')
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue([]) } as any)
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue([mockPost]) } as any);

    vi.spyOn(ScheduledPostModel, 'findOneAndUpdate').mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockPost),
    } as any);

    vi.spyOn(PublicationModel, 'findOne').mockResolvedValue(null);
    vi.spyOn(ContentModel, 'findOne').mockResolvedValue(mockContentTampered);

    const stats = await publishingWorker.runWorkerCycle('tenant_alpha');

    expect(stats.failed).toBe(1);
    expect(mockPost.status).toBe('BLOCKED_APPROVAL_VALIDATION');
    expect(mockPost.errorMessage).toContain('BLOCKED_APPROVAL_VALIDATION');
  });

  // TEST 5: Worker rejects job that was valid when queued but invalidated before worker execution
  it('5. Worker should halt job with BLOCKED_APPROVAL_VALIDATION if content status was reset to DRAFT before execution', async () => {
    const mockPost: any = {
      _id: 'sched_invalidated_1',
      workspaceId: 'tenant_alpha',
      contentId: VALID_OBJECT_ID_2,
      platform: 'instagram',
      status: 'READY_TO_PUBLISH',
      save: vi.fn().mockResolvedValue(true),
    };

    // Content was edited after scheduling so status reverted to DRAFT
    const mockContentReset: any = {
      _id: VALID_OBJECT_ID_2,
      workspaceId: 'tenant_alpha',
      platform: 'instagram',
      title: 'Edited Title',
      caption: 'Edited Caption',
      status: 'DRAFT', // Reverted status
      contentVersion: 2,
      approvalInvalidatedAt: new Date(),
      approvalInvalidationReason: 'Material content edit',
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(ScheduledPostModel, 'find')
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue([]) } as any)
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue([mockPost]) } as any);

    vi.spyOn(ScheduledPostModel, 'findOneAndUpdate').mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockPost),
    } as any);

    vi.spyOn(PublicationModel, 'findOne').mockResolvedValue(null);
    vi.spyOn(ContentModel, 'findOne').mockResolvedValue(mockContentReset);

    const stats = await publishingWorker.runWorkerCycle('tenant_alpha');

    expect(stats.failed).toBe(1);
    expect(mockPost.status).toBe('BLOCKED_APPROVAL_VALIDATION');
  });

  // TEST 6: Concurrent client approval only produces 1 final decision
  it('6. Concurrent client decisions should be safely handled with status validation', async () => {
    const pendingContent = {
      _id: VALID_OBJECT_ID_3,
      workspaceId: 'tenant_alpha',
      brandId: 'brand_1',
      title: 'Concurrent Review Post',
      status: 'PENDING_CLIENT_REVIEW',
      contentVersion: 1,
      metadata: {},
    };

    let callCount = 0;
    mockRepo.findById.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return pendingContent;
      // Second concurrent call sees status already updated to APPROVED
      return { ...pendingContent, status: 'APPROVED' };
    });

    mockRepo.update.mockImplementation(async (_id, _wsId, updates) => ({
      ...pendingContent,
      ...updates,
    }));

    // First decision succeeds
    const firstDecision = await approvalService.clientDecision(
      ctxTenantA,
      VALID_OBJECT_ID_3,
      'approve',
      'Reviewer 1'
    );
    expect(firstDecision.status).toBe('APPROVED');

    // Second concurrent decision fails due to status transition
    await expect(
      approvalService.clientDecision(ctxTenantA, VALID_OBJECT_ID_3, 'approve', 'Reviewer 2')
    ).rejects.toThrow(/PENDING_CLIENT_REVIEW/);
  });

  // TEST 7: Idempotency prevents duplicate publishing jobs
  it('7. Idempotency check in PublishingWorker should prevent duplicate publishing executions', async () => {
    const mockPost: any = {
      _id: 'sched_duplicate_1',
      workspaceId: 'tenant_alpha',
      contentId: VALID_OBJECT_ID_1,
      platform: 'instagram',
      status: 'READY_TO_PUBLISH',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockPublication: any = {
      _id: 'pub_existing_1',
      workspaceId: 'tenant_alpha',
      scheduledPostId: 'sched_duplicate_1',
      platformPostId: 'ig_published_123',
    };

    vi.spyOn(ScheduledPostModel, 'find')
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue([]) } as any)
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue([mockPost]) } as any);

    vi.spyOn(ScheduledPostModel, 'findOneAndUpdate').mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockPost),
    } as any);

    // PublicationModel finds an existing published record
    vi.spyOn(PublicationModel, 'findOne').mockResolvedValue(mockPublication);

    const stats = await publishingWorker.runWorkerCycle('tenant_alpha');

    expect(stats.published).toBe(1);
    expect(mockPost.status).toBe('PUBLISHED');
  });

  // TEST 8: Valid approval processes end-to-end to scheduled job
  it('8. Valid end-to-end 3-tier approval should generate valid HMAC and pass Queue Guard', async () => {
    const approvedAtIso = new Date().toISOString();
    const approvedAtDate = new Date(approvedAtIso);

    const canonicalPayload: CanonicalApprovalPayload = {
      tenantId: 'tenant_alpha',
      brandId: 'brand_1',
      contentId: VALID_OBJECT_ID_1,
      contentVersion: 1,
      decision: 'APPROVED',
      reviewerId: 'Client VP',
      approvedAt: approvedAtIso,
    };

    const validSignature = generateCanonicalApprovalHmac(canonicalPayload);

    // Verify HMAC helper directly
    const isValid = verifyCanonicalApprovalHmac(canonicalPayload, validSignature);
    expect(isValid).toBe(true);

    const mockPost: any = {
      _id: 'sched_e2e_1',
      workspaceId: 'tenant_alpha',
      brandId: 'brand_1',
      contentId: VALID_OBJECT_ID_1,
      platform: 'instagram',
      status: 'READY_TO_PUBLISH',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockContentApproved: any = {
      _id: VALID_OBJECT_ID_1,
      workspaceId: 'tenant_alpha',
      brandId: 'brand_1',
      platform: 'instagram',
      title: 'Valid E2E Post',
      caption: 'Awesome E2E Caption #AI',
      status: 'APPROVED',
      contentVersion: 1,
      finalApprovedBy: 'Client VP',
      finalApprovalAt: approvedAtDate,
      approvalSignature: validSignature,
      save: vi.fn().mockResolvedValue(true),
    };

    const mockAccount: any = {
      _id: 'acc_ig_1',
      workspaceId: 'tenant_alpha',
      brandId: 'brand_1',
      platform: 'instagram',
      username: 'official_brand',
      encryptedAccessToken: encryptToken('mock_access_token_123'),
      status: 'CONNECTED',
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(ScheduledPostModel, 'find')
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue([]) } as any)
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue([mockPost]) } as any);

    vi.spyOn(ScheduledPostModel, 'findOneAndUpdate').mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockPost),
    } as any);

    vi.spyOn(PublicationModel, 'findOne').mockResolvedValue(null);
    vi.spyOn(ContentModel, 'findOne').mockResolvedValue(mockContentApproved);
    vi.spyOn(SocialAccountModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockAccount),
    } as any);
    vi.spyOn(PublicationModel, 'create').mockResolvedValue({} as any);

    // Mock publisher publish to return success
    const mockPublisher = (publishingWorker as any).registry.get('instagram');
    vi.spyOn(mockPublisher, 'publish').mockResolvedValue({
      outcome: 'PUBLISHED',
      status: 'SUCCESS',
      providerPostId: 'ig_post_e2e_999',
      postUrl: 'https://instagram.com/p/ig_post_e2e_999',
    });

    const stats = await publishingWorker.runWorkerCycle('tenant_alpha');

    expect(stats.published).toBe(1);
    expect(mockPost.status).toBe('PUBLISHED');
    expect(mockContentApproved.status).toBe('PUBLISHED');
  });
});
