import { describe, it, expect } from 'vitest';
import { XPublisher } from '../platforms/x/src/XPublisher';
import { encryptToken } from '../packages/core/src/crypto';
import { createWorkspaceContext } from '../packages/core/src/context';

describe('Real X API Integration Test Mode (Isolated / Opt-In)', () => {
  const isRealApiTestEnabled = process.env.X_TEST_ENABLED === 'true' && Boolean(process.env.X_TEST_ACCESS_TOKEN);

  it('should skip live X API test unless X_TEST_ENABLED=true and credentials are present', () => {
    if (!isRealApiTestEnabled) {
      console.log('Skipping live X API test (X_TEST_ENABLED is not set).');
      expect(true).toBe(true);
      return;
    }
  });

  if (isRealApiTestEnabled) {
    it('should execute post publication against real X API v2', async () => {
      const publisher = new XPublisher();
      const ctx = createWorkspaceContext('ws-test-real-x', 'user-test-real-x');
      const account: any = {
        username: process.env.X_TEST_ACCOUNT_ID || 'test_x_account',
        platformAccountId: process.env.X_TEST_ACCOUNT_ID,
        encryptedAccessToken: encryptToken(process.env.X_TEST_ACCESS_TOKEN!),
      };
      const request: any = {
        scheduledPostId: `sched-real-x-${Date.now()}`,
        contentId: `content-real-x-${Date.now()}`,
        platform: 'x',
        caption: `Automated live X API v2 integration test post created at ${new Date().toISOString()} #RionaTest`,
      };

      const result = await publisher.publish(ctx, account, request);

      expect(result.outcome).toBe('PUBLISHED');
      expect(result.providerPostId).toBeDefined();
      expect(result.providerUrl).toBeDefined();
    });
  }
});
