import { describe, it, expect, vi } from 'vitest';
import { PublishingWorker } from '../services/scheduler/PublishingWorker';
import { ScheduledPostModel } from '../packages/database/src/models/ScheduledPost';
import { SocialAccountModel } from '../packages/database/src/models/SocialAccount';
import { ContentModel } from '../packages/database/src/models/Content';
import { PublicationModel } from '../packages/database/src/models/Publication';
import { encryptToken, generateCanonicalApprovalHmac, CanonicalApprovalPayload } from '../packages/core/src/crypto';

describe('Atomic Worker Concurrency & Exponential Backoff', () => {
  const createApprovedContentMock = (id = 'content-1') => {
    const approvedAtIso = new Date().toISOString();
    const payload: CanonicalApprovalPayload = {
      tenantId: 'ws-1',
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
      workspaceId: 'ws-1',
      status: 'APPROVED',
      contentVersion: 1,
      finalApprovedBy: 'Client Reviewer',
      finalApprovalAt: new Date(approvedAtIso),
      approvalSignature: signature,
      save: vi.fn().mockResolvedValue(true),
    };
  };

  it('should prevent concurrent workers from processing the same candidate post via atomic findOneAndUpdate', async () => {
    const worker1 = new PublishingWorker();
    const worker2 = new PublishingWorker();

    const candidatePost: any = {
      _id: 'sched-concurrent-1',
      workspaceId: 'ws-1',
      contentId: 'content-1',
      platform: 'instagram',
      status: 'READY_TO_PUBLISH',
    };

    const claimedPost: any = {
      ...candidatePost,
      status: 'PUBLISHING',
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(ScheduledPostModel, 'find').mockImplementation((filter?: any) => {
      if (filter && filter.status && typeof filter.status === 'object' && '$in' in filter.status) {
        return { exec: vi.fn().mockResolvedValue([]) } as any;
      }
      return { exec: vi.fn().mockResolvedValue([candidatePost]) } as any;
    });

    // Worker 1 atomically claims post; Worker 2 receives null on findOneAndUpdate
    vi.spyOn(ScheduledPostModel, 'findOneAndUpdate')
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue(claimedPost) } as any)
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue(null) } as any);

    vi.spyOn(PublicationModel, 'findOne').mockResolvedValue(null);
    vi.spyOn(ContentModel, 'findOne').mockResolvedValue(createApprovedContentMock() as any);
    vi.spyOn(SocialAccountModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue({ encryptedAccessToken: encryptToken('mock_valid_token'), save: vi.fn() }),
    } as any);
    vi.spyOn(PublicationModel, 'create').mockResolvedValue({} as any);

    const [stats1, stats2] = await Promise.all([
      worker1.runWorkerCycle('ws-1'),
      worker2.runWorkerCycle('ws-1'),
    ]);

    // Exactly one worker publishes, the other worker gets 0 processed/published
    expect(stats1.published + stats2.published).toBe(1);
  });

  it('should calculate exponential backoff delay on 429 rate limit retries', async () => {
    const worker = new PublishingWorker();

    const mockPost: any = {
      _id: 'sched-backoff-1',
      workspaceId: 'ws-1',
      contentId: 'content-1',
      platform: 'instagram',
      status: 'READY_TO_PUBLISH',
      retryCount: 2,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(ScheduledPostModel, 'find').mockImplementation((filter?: any) => {
      if (filter && filter.status && typeof filter.status === 'object' && '$in' in filter.status) {
        return { exec: vi.fn().mockResolvedValue([]) } as any;
      }
      return { exec: vi.fn().mockResolvedValue([mockPost]) } as any;
    });

    vi.spyOn(ScheduledPostModel, 'findOneAndUpdate')
      .mockReturnValue({ exec: vi.fn().mockResolvedValue(mockPost) } as any);

    vi.spyOn(PublicationModel, 'findOne').mockResolvedValue(null);
    vi.spyOn(ContentModel, 'findOne').mockResolvedValue(createApprovedContentMock() as any);
    vi.spyOn(SocialAccountModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue({ encryptedAccessToken: encryptToken('mock_rate_limit_token'), save: vi.fn() }),
    } as any);

    const stats = await worker.runWorkerCycle('ws-1');

    expect(stats.retryWait).toBe(1);
    expect(mockPost.retryCount).toBe(3);
    expect(mockPost.nextRetryAt).toBeDefined();
  });
});
