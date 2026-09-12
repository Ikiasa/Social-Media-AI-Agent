import { describe, it, expect } from 'vitest';
import { InstagramPublisher } from '../platforms/instagram/src/InstagramPublisher';
import { encryptToken } from '../packages/core/src/crypto';
import { createWorkspaceContext } from '../packages/core/src/context';

describe('OAuth Token Expiration & Refresh Lifecycle', () => {
  const publisher = new InstagramPublisher();
  const ctx = createWorkspaceContext('ws-1', 'user-1');

  it('should detect expired tokens and trigger permanent auth failure requiring re-authentication', async () => {
    const expiredAccount: any = {
      username: 'test_ig_user',
      encryptedAccessToken: encryptToken('some_valid_token'),
      tokenExpiresAt: new Date(Date.now() - 10000), // Expired 10s ago
    };

    const res = await publisher.publish(ctx, expiredAccount, { title: 'Post' } as any);

    expect(res.status).toBe('FAILED');
    expect(res.errorCode).toBe('TOKEN_EXPIRED');
    expect(res.isPermanentAuthFailure).toBe(true);
  });
});
