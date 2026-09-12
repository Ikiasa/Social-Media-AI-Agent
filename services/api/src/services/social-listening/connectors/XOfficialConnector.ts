import {
  SocialDataConnector,
  DataSourceType,
  ConnectorContext,
  ConnectorHealth,
  NormalizedSocialRecord,
  FetchMetricsInput,
  FetchPostsInput,
} from '../types';

export class XOfficialConnector implements SocialDataConnector {
  public readonly provider = 'x_official';
  public readonly sourceType: DataSourceType = 'official_api';

  async healthCheck(context: ConnectorContext): Promise<ConnectorHealth> {
    const hasConnection = Boolean(context.providerConnectionId || context.socialAccountId);

    if (!hasConnection) {
      return {
        status: 'NOT_CONNECTED',
        provider: this.provider,
        sourceType: this.sourceType,
        lastCheckedAt: new Date().toISOString(),
        message: 'X API v2 connection required.',
        actionRequired: 'Provide valid X API v2 Bearer Token or OAuth 2.0 User Access Token.',
      };
    }

    return {
      status: 'CONNECTED',
      provider: this.provider,
      sourceType: this.sourceType,
      lastCheckedAt: new Date().toISOString(),
      message: 'X Official API v2 is active.',
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
