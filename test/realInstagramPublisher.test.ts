import { describe, it, expect } from 'vitest';
import { InstagramPublisher } from '../platforms/instagram/src/InstagramPublisher';
import { encryptToken } from '../packages/core/src/crypto';
import { createWorkspaceContext } from '../packages/core/src/context';

describe('Real Instagram API Integration Test Mode (Isolated / Opt-In)', () => {
  const isRealApiTestEnabled = process.env.META_TEST_ENABLED === 'true' && Boolean(process.env.META_TEST_ACCESS_TOKEN);

  it('should skip live Meta API test unless META_TEST_ENABLED=true and credentials are present', () => {
    if (!isRealApiTestEnabled) {
      console.log('Skipping live Meta API test (META_TEST_ENABLED is not set).');
      expect(true).toBe(true);
      return;
    }
  });

  if (isRealApiTestEnabled) {
    it('should execute container creation and publication against real Meta Graph API', async () => {
      const publisher = new InstagramPublisher();
      const ctx = createWorkspaceContext('ws-test-real', 'user-test-real');
      const account: any = {
        username: process.env.META_TEST_ACCOUNT_ID || 'test_ig_account',
        platformAccountId: process.env.META_TEST_ACCOUNT_ID,
        encryptedAccessToken: encryptToken(process.env.META_TEST_ACCESS_TOKEN!),
      };
      const content: any = {
        title: 'Automated Live Test Post',
        caption: `Automated live integration test run at ${new Date().toISOString()} #RionaTest`,
      };

      const result = await publisher.publish(ctx, account, content);

      expect(result.status).toBe('SUCCESS');
      expect(result.platformPostId).toBeDefined();
      expect(result.postUrl).toBeDefined();
    });
  }
});
