import { describe, it, expect, vi } from 'vitest';
import { LinkedInPublisher } from '../platforms/linkedin/src/LinkedInPublisher';
import { defaultPublisherRegistry } from '../packages/social/src/PublisherRegistry';
import { PublishingWorker } from '../services/scheduler/PublishingWorker';
import { ScheduledPostModel } from '../packages/database/src/models/ScheduledPost';
import { SocialAccountModel } from '../packages/database/src/models/SocialAccount';
import { ContentModel } from '../packages/database/src/models/Content';
import { PublicationModel } from '../packages/database/src/models/Publication';
import { createWorkspaceContext } from '../packages/core/src/context';
import { encryptToken, generateCanonicalApprovalHmac, CanonicalApprovalPayload } from '../packages/core/src/crypto';
import { getLinkedInConfig } from '../platforms/linkedin/src/LinkedInConfig';
import { ValidationError } from '../packages/core/src/errors';

describe('LinkedInPublisher & Current Posts API Hardening (Version 202608)', () => {
  const publisher = new LinkedInPublisher();
  const ctx = createWorkspaceContext('ws-li-1', 'user-li-1');

  it('should validate API version format strictly as YYYYMM (6 digits)', () => {
    expect(() => getLinkedInConfig({ apiVersion: '202608' })).not.toThrow();
    expect(() => getLinkedInConfig({ apiVersion: 'invalid' })).toThrow(ValidationError);
    expect(() => getLinkedInConfig({ apiVersion: '2026' })).toThrow(ValidationError);
    expect(() => getLinkedInConfig({ apiVersion: '2026-08' })).toThrow(ValidationError);
  });

  it('should support environment variable override for LINKEDIN_API_VERSION', () => {
    const origEnv = process.env.LINKEDIN_API_VERSION;
    process.env.LINKEDIN_API_VERSION = '202612';
    const cfg = getLinkedInConfig();
    expect(cfg.apiVersion).toBe('202612');
    if (origEnv) {
      process.env.LINKEDIN_API_VERSION = origEnv;
    } else {
      delete process.env.LINKEDIN_API_VERSION;
    }
  });

  it('should resolve LinkedInPublisher from defaultPublisherRegistry', () => {
    expect(defaultPublisherRegistry.has('linkedin')).toBe(true);
    const resolved = defaultPublisherRegistry.get('linkedin');
    expect(resolved.platform).toBe('linkedin');
  });

  it('should send correct Posts API headers (Linkedin-Version 202608 & X-Restli-Protocol-Version 2.0.0) and payload structure', async () => {
    const customPublisher = new LinkedInPublisher({ apiVersion: '202608' });
    const realTokenAccount: any = {
      username: 'real_user',
      platformAccountId: 'urn:li:person:12345',
      encryptedAccessToken: encryptToken('actual_linkedin_token'),
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({ 'x-restli-id': 'urn:li:post:post_123456' }),
      json: () => Promise.resolve({ id: 'urn:li:post:post_123456' }),
    } as any);

    const result = await customPublisher.publish(ctx, realTokenAccount, {
      scheduledPostId: 'p-1',
      contentId: 'c-1',
      platform: 'linkedin',
      caption: 'Testing current Posts API version 202608',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.linkedin.com/rest/posts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer actual_linkedin_token',
          'Linkedin-Version': '202608',
          'X-Restli-Protocol-Version': '2.0.0',
        }),
      })
    );

    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(sentBody.author).toBe('urn:li:person:12345');
    expect(sentBody.commentary).toBe('Testing current Posts API version 202608');
    expect(sentBody.visibility).toBe('PUBLIC');
    expect(sentBody.distribution.feedDistribution).toBe('MAIN_FEED');

    expect(result.outcome).toBe('PUBLISHED');
    expect(result.providerPostId).toBe('urn:li:post:post_123456');

    fetchSpy.mockRestore();
  });

  it('should prefer x-restli-id header and fallback to body id correctly', async () => {
    const realTokenAccount: any = {
      username: 'real_user',
      platformAccountId: 'urn:li:person:12345',
      encryptedAccessToken: encryptToken('actual_linkedin_token'),
    };

    // Case A: x-restli-id header present
    const fetchSpyA = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({ 'x-restli-id': 'urn:li:post:header_id' }),
      json: () => Promise.resolve({}),
    } as any);

    const resA = await publisher.publish(ctx, realTokenAccount, { caption: 'Test A' } as any);
    expect(resA.providerPostId).toBe('urn:li:post:header_id');
    fetchSpyA.mockRestore();

    // Case B: body id fallback present
    const fetchSpyB = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({}),
      json: () => Promise.resolve({ id: 'urn:li:post:body_id' }),
    } as any);

    const resB = await publisher.publish(ctx, realTokenAccount, { caption: 'Test B' } as any);
    expect(resB.providerPostId).toBe('urn:li:post:body_id');
    fetchSpyB.mockRestore();
  });

  it('should return outcome UNKNOWN and shouldRetry false on missing provider post ID', async () => {
    const realTokenAccount: any = {
      username: 'real_user',
      platformAccountId: 'urn:li:person:12345',
      encryptedAccessToken: encryptToken('actual_linkedin_token'),
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({}), // Missing x-restli-id and location
      json: () => Promise.resolve({}), // Missing body id
    } as any);

    const result = await publisher.publish(ctx, realTokenAccount, { caption: 'Malformed post test' } as any);

    expect(result.outcome).toBe('UNKNOWN');
    expect(result.shouldRetry).toBe(false);
    expect(result.errorCode).toBe('MALFORMED_RESPONSE');
    expect(result.errorMessage).toContain('missing x-restli-id');

    fetchSpy.mockRestore();
  });

  it('should handle image upload via current Images API (/rest/images?action=initializeUpload)', async () => {
    const realTokenAccount: any = {
      username: 'real_user',
      platformAccountId: 'urn:li:person:12345',
      encryptedAccessToken: encryptToken('actual_linkedin_token'),
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            value: {
              image: 'urn:li:image:img_9999',
              uploadMechanism: {
                'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                  uploadUrl: 'https://upload.linkedin.com/binary',
                },
              },
            },
          }),
      } as any)
      .mockResolvedValueOnce({ ok: true, status: 201 } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'x-restli-id': 'urn:li:post:img_post_101' }),
        json: () => Promise.resolve({ id: 'urn:li:post:img_post_101' }),
      } as any);

    const result = await publisher.publish(ctx, realTokenAccount, {
      scheduledPostId: 'p-img',
      contentId: 'c-img',
      platform: 'linkedin',
      caption: 'Post with image',
      media: [{ url: 'https://example.com/image.png' }],
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.linkedin.com/rest/images?action=initializeUpload',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Linkedin-Version': '202608',
          'X-Restli-Protocol-Version': '2.0.0',
        }),
      })
    );

    const postCall = fetchSpy.mock.calls[2];
    const postBody = JSON.parse(postCall[1]?.body as string);
    expect(postBody.content.media.id).toBe('urn:li:image:img_9999');
    expect(result.providerPostId).toBe('urn:li:post:img_post_101');

    fetchSpy.mockRestore();
  });

  it('should validate expired token and return permanent AUTHENTICATION failure', async () => {
    const expiredAccount: any = {
      username: 'expired_li_user',
      encryptedAccessToken: encryptToken('valid_token_string'),
      tokenExpiresAt: new Date(Date.now() - 5000),
    };

    const result = await publisher.publish(ctx, expiredAccount, { caption: 'Test' } as any);

    expect(result.outcome).toBe('FAILED');
    expect(result.errorCategory).toBe('AUTHENTICATION');
    expect(result.isPermanentAuthFailure).toBe(true);
  });

  it('should classify error codes accurately into domain categories', () => {
    expect(publisher.classifyError({ status: 401 })).toBe('AUTHENTICATION');
    expect(publisher.classifyError({ status: 403 })).toBe('AUTHENTICATION');
    expect(publisher.classifyError({ status: 429 })).toBe('RATE_LIMIT');
    expect(publisher.classifyError({ status: 500 })).toBe('TRANSIENT');
  });

  it('should execute LinkedIn publishing cycle via platform-neutral PublishingWorker', async () => {
    const worker = new PublishingWorker();

    const candidatePost: any = {
      _id: 'sched-li-worker-1',
      workspaceId: 'ws-li-1',
      contentId: 'content-li-1',
      platform: 'linkedin',
      status: 'READY_TO_PUBLISH',
    };

    const claimedPost: any = {
      ...candidatePost,
      status: 'PUBLISHING',
      save: vi.fn().mockResolvedValue(true),
    };

    const approvedAtIso = new Date().toISOString();
    const payload: CanonicalApprovalPayload = {
      tenantId: 'ws-li-1',
      brandId: '',
      contentId: 'content-li-1',
      contentVersion: 1,
      decision: 'APPROVED',
      reviewerId: 'Client Reviewer',
      approvedAt: approvedAtIso,
    };
    const signature = generateCanonicalApprovalHmac(payload);

    const mockContent: any = {
      _id: 'content-li-1',
      workspaceId: 'ws-li-1',
      title: 'LinkedIn Announcement',
      caption: 'Announcing our new feature launch!',
      status: 'APPROVED',
      contentVersion: 1,
      finalApprovedBy: 'Client Reviewer',
      finalApprovalAt: new Date(approvedAtIso),
      approvalSignature: signature,
      save: vi.fn().mockResolvedValue(true),
    };

    const mockAccount: any = {
      workspaceId: 'ws-li-1',
      platform: 'linkedin',
      username: 'company_page',
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

    const stats = await worker.runWorkerCycle('ws-li-1');

    expect(stats.published).toBe(1);
    expect(claimedPost.status).toBe('PUBLISHED');
    expect(mockContent.status).toBe('PUBLISHED');
    expect(PublicationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'linkedin',
        providerPostId: expect.stringContaining('urn:li:share:'),
      })
    );
  });
});
