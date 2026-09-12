import { describe, it, expect } from 'vitest';
import { LinkedInPublisher } from '../platforms/linkedin/src/LinkedInPublisher';
import { encryptToken } from '../packages/core/src/crypto';
import { createWorkspaceContext } from '../packages/core/src/context';

describe('Real LinkedIn API Integration Test Mode (Isolated / Opt-In)', () => {
  const isRealApiTestEnabled = process.env.LINKEDIN_TEST_ENABLED === 'true' && Boolean(process.env.LINKEDIN_TEST_ACCESS_TOKEN);

  it('should skip live LinkedIn API test unless LINKEDIN_TEST_ENABLED=true and credentials are present', () => {
    if (!isRealApiTestEnabled) {
      console.log('Skipping live LinkedIn API test (LINKEDIN_TEST_ENABLED is not set).');
      expect(true).toBe(true);
      return;
    }
  });

  if (isRealApiTestEnabled) {
    it('should execute post publication against real LinkedIn REST API', async () => {
      const publisher = new LinkedInPublisher();
      const ctx = createWorkspaceContext('ws-test-real-li', 'user-test-real-li');
      const account: any = {
        username: process.env.LINKEDIN_TEST_ACCOUNT_ID || 'test_li_account',
        platformAccountId: process.env.LINKEDIN_TEST_ACCOUNT_ID,
        encryptedAccessToken: encryptToken(process.env.LINKEDIN_TEST_ACCESS_TOKEN!),
      };
      const request: any = {
        scheduledPostId: `sched-real-li-${Date.now()}`,
        contentId: `content-real-li-${Date.now()}`,
        platform: 'linkedin',
        caption: `Automated live LinkedIn integration test post created at ${new Date().toISOString()} #RionaTest`,
      };

      const result = await publisher.publish(ctx, account, request);

      expect(result.outcome).toBe('PUBLISHED');
      expect(result.providerPostId).toBeDefined();
      expect(result.providerUrl).toBeDefined();
    });
  }
});
