import { describe, it, expect } from 'vitest';
import { InstagramAdapter } from '../platforms/instagram/src/InstagramAdapter';
import { NotImplementedError } from '../packages/core/src/errors';

describe('InstagramAdapter Contract', () => {
  it('should authenticate successfully with session token', async () => {
    const adapter = new InstagramAdapter();
    const res = await adapter.authenticate({ sessionToken: 'test_token' });
    expect(res.success).toBe(true);
    expect(res.sessionToken).toBe('test_token');
  });

  it('should throw NotImplementedError on publishPost', async () => {
    const adapter = new InstagramAdapter();
    await expect(
      adapter.publishPost({
        workspaceId: 'ws-1',
        caption: 'Hello World',
        mediaUrls: ['https://example.com/img.jpg'],
      })
    ).rejects.toThrow(NotImplementedError);
  });

  it('should throw NotImplementedError on getProfile', async () => {
    const adapter = new InstagramAdapter();
    await expect(adapter.getProfile()).rejects.toThrow(NotImplementedError);
  });

  it('should throw NotImplementedError on getAnalytics', async () => {
    const adapter = new InstagramAdapter();
    await expect(adapter.getAnalytics({ workspaceId: 'ws-1' })).rejects.toThrow(NotImplementedError);
  });
});
