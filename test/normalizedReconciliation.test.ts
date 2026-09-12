import { describe, it, expect, vi } from 'vitest';
import { InstagramPublisher } from '../platforms/instagram/src/InstagramPublisher';
import { createWorkspaceContext } from '../packages/core/src/context';
import { encryptToken } from '../packages/core/src/crypto';

describe('Normalized Provider Reconciliation Contract', () => {
  const publisher = new InstagramPublisher();
  const ctx = createWorkspaceContext('ws-rec-test', 'user-rec-test');
  const mockAccount: any = {
    username: 'test_user',
    encryptedAccessToken: encryptToken('mock_valid_token'),
  };

  it('should map container status FINISHED to normalized status PUBLISHED', async () => {
    const status = await publisher.getPublishStatus(ctx, mockAccount, 'mock_container_123');

    expect(status.status).toBe('PUBLISHED');
    expect(status.providerContainerId).toBe('mock_container_123');
    expect(status.providerPostId).toBeDefined();
  });

  it('should handle missing access token cleanly with FAILED state', async () => {
    const status = await publisher.getPublishStatus(ctx, { username: 'invalid' } as any, 'mock_container_123');

    expect(status.status).toBe('FAILED');
    expect(status.errorMessage).toContain('Missing access token');
  });
});
