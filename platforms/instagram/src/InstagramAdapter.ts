import {
  LegacySocialPlatform,
  AuthenticateInput,
  AuthenticateResult,
  PublishPostInput,
  LegacyPublishResult,
  SocialProfile,
  AnalyticsInput,
  AnalyticsResult,
} from '../../../packages/social/src/types';
import { NotImplementedError } from '../../../packages/core/src/errors';

export class InstagramAdapter implements LegacySocialPlatform {
  public readonly platformName = 'Instagram';

  async authenticate(input: AuthenticateInput): Promise<AuthenticateResult> {
    if (!input.username && !input.sessionToken) {
      throw new Error('Username or session token required for Instagram authentication.');
    }
    // Explicit boundary notice: Actual login logic using Graph API / instagram-private-api will be connected in Phase 10
    return {
      success: true,
      authenticatedAt: new Date(),
      sessionToken: input.sessionToken || '',
    };
  }

  async publishPost(_input: PublishPostInput): Promise<LegacyPublishResult> {
    throw new NotImplementedError(
      'Instagram publishing implementation is not available yet in upstream repository.'
    );
  }

  async getProfile(): Promise<SocialProfile> {
    throw new NotImplementedError(
      'Instagram getProfile implementation is not available yet in upstream repository.'
    );
  }

  async getAnalytics(_input: AnalyticsInput): Promise<AnalyticsResult> {
    throw new NotImplementedError(
      'Instagram getAnalytics implementation is not available yet in upstream repository.'
    );
  }
}
