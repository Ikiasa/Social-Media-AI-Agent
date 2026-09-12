import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublishingWorker } from '../services/scheduler/PublishingWorker';
import { ScheduledPostModel } from '../packages/database/src/models/ScheduledPost';
import { SocialAccountModel } from '../packages/database/src/models/SocialAccount';
import { ContentModel } from '../packages/database/src/models/Content';
import { PublicationModel } from '../packages/database/src/models/Publication';
import {
  encryptToken,
  generateCanonicalApprovalHmac,
  CanonicalApprovalPayload,
} from '../packages/core/src/crypto';

describe('PublishingWorker State Machine & Instagram Slice', () => {
  let worker: PublishingWorker;

  beforeEach(() => {
    worker = new PublishingWorker();
    vi.restoreAllMocks();
  });

  const createApprovedContentMock = (id: string, workspaceId = 'ws-1') => {
    const approvedAtIso = new Date().toISOString();
    const payload: CanonicalApprovalPayload = {
      tenantId: workspaceId,
      brandId: '',
      contentId: id,
      contentVersion: 1,
      decision: 'APPROVED',
      reviewerId: 'Client Reviewer',
      approvedAt: approvedAtIso,
    };
    const signature = generateCanonicalApprovalHmac(payload);

    return {
      _id: id,
      workspaceId,
      platform: 'instagram',
      title: 'Instagram Post',
      caption: 'Awesome Instagram Caption #AI',
      status: 'APPROVED',
      contentVersion: 1,
      finalApprovedBy: 'Client Reviewer',
      finalApprovalAt: new Date(approvedAtIso),
      approvalSignature: signature,
      save: vi.fn().mockResolvedValue(true),
    };
  };

  it('should process READY_TO_PUBLISH post, publish via Instagram, and record Publication audit trail', async () => {
    const mockPost: any = {
      _id: 'sched-ig-1',
      workspaceId: 'ws-1',
      contentId: 'content-ig-1',
      platform: 'instagram',
      scheduledAt: new Date(),
      status: 'READY_TO_PUBLISH',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockContent = createApprovedContentMock('content-ig-1', 'ws-1');

    const mockAccount: any = {
      _id: 'acc-ig-1',
      workspaceId: 'ws-1',
      platform: 'instagram',
      username: 'test_brand',
      encryptedAccessToken: encryptToken('mock_valid_token_123'),
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
    vi.spyOn(ContentModel, 'findOne').mockResolvedValue(mockContent as any);
    vi.spyOn(SocialAccountModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockAccount),
    } as any);
    vi.spyOn(PublicationModel, 'create').mockResolvedValue({} as any);

    const stats = await worker.runWorkerCycle('ws-1');

    expect(stats.published).toBe(1);
    expect(mockPost.status).toBe('PUBLISHED');
    expect(mockContent.status).toBe('PUBLISHED');
    expect(PublicationModel.create).toHaveBeenCalled();
  });

  it('should recover crashed stale PUBLISHING jobs back to READY_TO_PUBLISH', async () => {
    const stalePost: any = {
      _id: 'stale-1',
      workspaceId: 'ws-1',
      status: 'PUBLISHING',
      updatedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(ScheduledPostModel, 'find')
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue([stalePost]) } as any) // Stale query
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue([]) } as any); // Due query

    vi.spyOn(PublicationModel, 'findOne').mockResolvedValue(null);
    vi.spyOn(SocialAccountModel, 'findOne').mockReturnValue({ exec: vi.fn().mockResolvedValue(null) } as any);

    const stats = await worker.runWorkerCycle('ws-1');

    expect(stats.recovered).toBe(1);
    expect(stalePost.status).toBe('READY_TO_PUBLISH');
  });

  it('should handle 429 Rate Limit by transitioning status to RETRY_WAIT', async () => {
    const mockPost: any = {
      _id: 'sched-rate-limit',
      workspaceId: 'ws-1',
      contentId: 'content-rl-1',
      platform: 'instagram',
      status: 'READY_TO_PUBLISH',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockContent = createApprovedContentMock('content-rl-1', 'ws-1');

    const mockAccount: any = {
      _id: 'acc-rl-1',
      workspaceId: 'ws-1',
      encryptedAccessToken: encryptToken('mock_rate_limit_token'), // Simulates 429
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(ScheduledPostModel, 'find')
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue([]) } as any)
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue([mockPost]) } as any);

    vi.spyOn(ScheduledPostModel, 'findOneAndUpdate').mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockPost),
    } as any);

    vi.spyOn(PublicationModel, 'findOne').mockResolvedValue(null);
    vi.spyOn(ContentModel, 'findOne').mockResolvedValue(mockContent as any);
    vi.spyOn(SocialAccountModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockAccount),
    } as any);

    const stats = await worker.runWorkerCycle('ws-1');

    expect(stats.retryWait).toBe(1);
    expect(mockPost.status).toBe('RETRY_WAIT');
  });

  it('should handle permanent 401 Auth failure by setting SocialAccount to RE-AUTH_REQUIRED', async () => {
    const mockPost: any = {
      _id: 'sched-auth-fail',
      workspaceId: 'ws-1',
      contentId: 'content-auth-fail',
      platform: 'instagram',
      status: 'READY_TO_PUBLISH',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockContent = createApprovedContentMock('content-auth-fail', 'ws-1');

    const mockAccount: any = {
      _id: 'acc-invalid',
      username: 'invalid_ig_user',
      workspaceId: 'ws-1',
      encryptedAccessToken: encryptToken('mock_invalid_token'), // Simulates 401
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
    vi.spyOn(ContentModel, 'findOne').mockResolvedValue(mockContent as any);
    vi.spyOn(SocialAccountModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockAccount),
    } as any);

    const stats = await worker.runWorkerCycle('ws-1');

    expect(stats.failed).toBe(1);
    expect(mockPost.status).toBe('FAILED');
    expect(mockAccount.status).toBe('RE-AUTH_REQUIRED');
    expect(mockAccount.save).toHaveBeenCalled();
  });
});
