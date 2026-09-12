import {
  SocialDataConnector,
  DataSourceType,
  ConnectorContext,
  ConnectorHealth,
  NormalizedSocialRecord,
  FetchMetricsInput,
  FetchPostsInput,
} from '../types';

export class LinkedInOfficialConnector implements SocialDataConnector {
  public readonly provider = 'linkedin_official';
  public readonly sourceType: DataSourceType = 'official_api';

  async healthCheck(context: ConnectorContext): Promise<ConnectorHealth> {
    const hasConnection = Boolean(context.providerConnectionId || context.socialAccountId);

    if (!hasConnection) {
      return {
        status: 'NOT_CONNECTED',
        provider: this.provider,
        sourceType: this.sourceType,
        lastCheckedAt: new Date().toISOString(),
        message: 'LinkedIn Organization OAuth connection required.',
        actionRequired: 'Authorize LinkedIn Page Admin via OAuth 2.0.',
      };
    }

    return {
      status: 'CONNECTED',
      provider: this.provider,
      sourceType: this.sourceType,
      lastCheckedAt: new Date().toISOString(),
      message: 'LinkedIn Official API is active.',
    };
  }

  async fetchMetrics(
    context: ConnectorContext,
    _input: FetchMetricsInput
  ): Promise<NormalizedSocialRecord[]> {
    const health = await this.healthCheck(context);
    if (health.status !== 'CONNECTED') {
      return [];
    }

    return [];
  }

  async fetchPosts(
    context: ConnectorContext,
    _input: FetchPostsInput
  ): Promise<NormalizedSocialRecord[]> {
    const health = await this.healthCheck(context);
    if (health.status !== 'CONNECTED') {
      return [];
    }

    return [];
  }
}
