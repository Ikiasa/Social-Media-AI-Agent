import { describe, it, expect, vi } from 'vitest';
import { XPublisher } from '../platforms/x/src/XPublisher';
import { defaultPublisherRegistry } from '../packages/social/src/PublisherRegistry';
import { PublishingWorker } from '../services/scheduler/PublishingWorker';
import { ScheduledPostModel } from '../packages/database/src/models/ScheduledPost';
import { SocialAccountModel } from '../packages/database/src/models/SocialAccount';
import { ContentModel } from '../packages/database/src/models/Content';
import { PublicationModel } from '../packages/database/src/models/Publication';
import { createWorkspaceContext } from '../packages/core/src/context';
import { encryptToken, generateCanonicalApprovalHmac, CanonicalApprovalPayload } from '../packages/core/src/crypto';

describe('XPublisher & Worker Integration (v2 Media Upload)', () => {
  const publisher = new XPublisher();
  const ctx = createWorkspaceContext('ws-x-1', 'user-x-1');

  it('should resolve XPublisher from defaultPublisherRegistry', () => {
    expect(defaultPublisherRegistry.has('x')).toBe(true);
    const resolved = defaultPublisherRegistry.get('x');
    expect(resolved.platform).toBe('x');
  });

  it('should publish text tweet successfully in test environment', async () => {
    const account: any = {
      username: 'x_brand_user',
      encryptedAccessToken: encryptToken('mock_valid_token'),
    };
    const request: any = {
      scheduledPostId: 'sched-x-1',
      contentId: 'content-x-1',
      platform: 'x',
      caption: 'Announcing product update on X!',
    };

    const result = await publisher.publish(ctx, account, request);

    expect(result.outcome).toBe('PUBLISHED');
    expect(result.status).toBe('SUCCESS');
    expect(result.providerPostId).toContain('tweet_mock_');
    expect(result.providerUrl).toContain('https://x.com/i/status/');
  });

  it('should fail fast with VALIDATION if caption exceeds 280 weighted characters', async () => {
    const account: any = {
      username: 'x_brand_user',
      encryptedAccessToken: encryptToken('mock_valid_token'),
    };

    const result = await publisher.publish(ctx, account, {
      caption: 'a'.repeat(281),
    } as any);

    expect(result.outcome).toBe('FAILED');
    expect(result.errorCategory).toBe('VALIDATION');
    expect(result.errorCode).toBe('CHARACTER_LIMIT_EXCEEDED');
  });

  it('should fail fast with VALIDATION if video media is provided', async () => {
    const account: any = {
      username: 'x_brand_user',
      encryptedAccessToken: encryptToken('mock_valid_token'),
    };

    const result = await publisher.publish(ctx, account, {
      caption: 'Valid text',
      media: [{ url: 'https://example.com/video.mp4', type: 'video' }],
    } as any);

    expect(result.outcome).toBe('FAILED');
    expect(result.errorCategory).toBe('VALIDATION');
    expect(result.errorCode).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('should validate image size limits (5MB max) and fail fast when exceeding limit', async () => {
    const account: any = {
      username: 'x_brand_user',
      encryptedAccessToken: encryptToken('actual_x_token'),
    };

    // Below limit (2MB) - should pass validation
    const passResult = await publisher.publish(ctx, account, {
      caption: 'Valid 2MB image post',
      media: [{ url: 'https://example.com/2mb.png', type: 'image', sizeBytes: 2 * 1024 * 1024 }],
    } as any);
    expect(passResult.errorCode).not.toBe('MEDIA_SIZE_EXCEEDED');

    // Exactly at limit (5MB) - should pass validation
    const atLimitResult = await publisher.publish(ctx, account, {
      caption: 'Valid 5MB image post',
      media: [{ url: 'https://example.com/5mb.png', type: 'image', sizeBytes: 5 * 1024 * 1024 }],
    } as any);
    expect(atLimitResult.errorCode).not.toBe('MEDIA_SIZE_EXCEEDED');

    // Above limit (6MB) - should fail fast with VALIDATION / MEDIA_SIZE_EXCEEDED
    const failResult = await publisher.publish(ctx, account, {
      caption: 'Over 5MB image post',
      media: [{ url: 'https://example.com/6mb.png', type: 'image', sizeBytes: 6 * 1024 * 1024 }],
    } as any);

    expect(failResult.outcome).toBe('FAILED');
    expect(failResult.errorCategory).toBe('VALIDATION');
    expect(failResult.errorCode).toBe('MEDIA_SIZE_EXCEEDED');
  });

  it('should upload image using current X API v2 endpoint (POST https://api.x.com/2/media/upload)', async () => {
    const realTokenAccount: any = {
      username: 'real_x_user',
      platformAccountId: '1234567890',
      encryptedAccessToken: encryptToken('actual_x_token'),
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      // Step 1: Media upload v2
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ data: { id: 'media_v2_1001' } }),
      } as any)
      // Step 2: Tweet creation /2/tweets
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ data: { id: 'tweet_v2_2002' } }),
      } as any);

    const result = await publisher.publish(ctx, realTokenAccount, {
      scheduledPostId: 'p-x-img',
      contentId: 'c-x-img',
      platform: 'x',
      caption: 'Testing X v2 Media Upload',
      media: [{ url: 'https://example.com/image.png', type: 'image' }],
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.x.com/2/media/upload',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer actual_x_token',
        }),
      })
    );

    const postCall = fetchSpy.mock.calls[1];
    const postBody = JSON.parse(postCall[1]?.body as string);
    expect(postBody.media.media_ids).toEqual(['media_v2_1001']);
    expect(result.providerPostId).toBe('tweet_v2_2002');

    fetchSpy.mockRestore();
  });

  it('should return UNKNOWN outcome and shouldRetry false if 2xx response misses tweet ID', async () => {
    const realTokenAccount: any = {
      username: 'real_x_user',
      encryptedAccessToken: encryptToken('actual_x_token'),
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ data: {} }), // missing id
    } as any);

    const result = await publisher.publish(ctx, realTokenAccount, { caption: 'Malformed test' } as any);

    expect(result.outcome).toBe('UNKNOWN');
    expect(result.shouldRetry).toBe(false);
    expect(result.errorCode).toBe('MALFORMED_RESPONSE');

    fetchSpy.mockRestore();
  });

  it('should handle HTTP 429 rate limit and inspect reset headers', async () => {
    const realTokenAccount: any = {
      username: 'real_x_user',
      encryptedAccessToken: encryptToken('actual_x_token'),
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ 'x-rate-limit-reset': '1700000000' }),
      json: () => Promise.resolve({ title: 'Too Many Requests' }),
    } as any);

    const result = await publisher.publish(ctx, realTokenAccount, { caption: 'Rate limit test' } as any);

    expect(result.outcome).toBe('PROCESSING');
    expect(result.status).toBe('RETRY_WAIT');
    expect(result.errorCategory).toBe('RATE_LIMIT');
    expect(result.shouldRetry).toBe(true);

    fetchSpy.mockRestore();
  });

  it('should execute X publishing cycle via platform-neutral PublishingWorker', async () => {
    const worker = new PublishingWorker();

    const candidatePost: any = {
      _id: 'sched-x-worker-1',
      workspaceId: 'ws-x-1',
      contentId: 'content-x-1',
      platform: 'x',
      status: 'READY_TO_PUBLISH',
    };

    const claimedPost: any = {
      ...candidatePost,
      status: 'PUBLISHING',
      save: vi.fn().mockResolvedValue(true),
    };

    const approvedAtIso = new Date().toISOString();
    const payload: CanonicalApprovalPayload = {
      tenantId: 'ws-x-1',
      brandId: '',
      contentId: 'content-x-1',
      contentVersion: 1,
      decision: 'APPROVED',
      reviewerId: 'Client Reviewer',
      approvedAt: approvedAtIso,
    };
    const signature = generateCanonicalApprovalHmac(payload);

    const mockContent: any = {
      _id: 'content-x-1',
      workspaceId: 'ws-x-1',
      title: 'X Announcement',
      caption: 'Announcing feature launch on X!',
      status: 'APPROVED',
      contentVersion: 1,
      finalApprovedBy: 'Client Reviewer',
      finalApprovalAt: new Date(approvedAtIso),
      approvalSignature: signature,
      save: vi.fn().mockResolvedValue(true),
    };

    const mockAccount: any = {
      workspaceId: 'ws-x-1',
      platform: 'x',
      username: 'brand_x_account',
      encryptedAccessToken: encryptToken('mock_valid_token'),
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(ScheduledPostModel, 'find').mockImplementation((filter?: any) => {
      if (filter && filter.status && typeof filter.status === 'object' && '$in' in filter.status) {
        return { exec: vi.fn().mockResolvedValue([]) } as any;
      }
      return { exec: vi.fn().mockResolvedValue([candidatePost]) } as any;
    });

    vi.spyOn(ScheduledPostModel, 'findOneAndUpdate').mockReturnValue({
      exec: vi.fn().mockResolvedValue(claimedPost),
    } as any);

    vi.spyOn(PublicationModel, 'findOne').mockResolvedValue(null);
    vi.spyOn(ContentModel, 'findOne').mockResolvedValue(mockContent as any);
    vi.spyOn(SocialAccountModel, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(mockAccount),
    } as any);
    vi.spyOn(PublicationModel, 'create').mockResolvedValue({} as any);

    const stats = await worker.runWorkerCycle('ws-x-1');

    expect(stats.published).toBe(1);
    expect(claimedPost.status).toBe('PUBLISHED');
    expect(mockContent.status).toBe('PUBLISHED');
    expect(PublicationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'x',
        providerPostId: expect.stringContaining('tweet_mock_'),
      })
    );
  });
});
