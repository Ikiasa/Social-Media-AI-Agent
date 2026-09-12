import {
  SocialDataConnector,
  DataSourceType,
  ConnectorContext,
  ConnectorHealth,
  NormalizedSocialRecord,
  FetchMetricsInput,
  FetchPostsInput,
} from '../types';

export class TikTokOfficialConnector implements SocialDataConnector {
  public readonly provider = 'tiktok_official';
  public readonly sourceType: DataSourceType = 'official_api';

  async healthCheck(context: ConnectorContext): Promise<ConnectorHealth> {
    const hasConnection = Boolean(context.providerConnectionId || context.socialAccountId);

    if (!hasConnection) {
      return {
        status: 'NOT_CONNECTED',
        provider: this.provider,
        sourceType: this.sourceType,
        lastCheckedAt: new Date().toISOString(),
        message: 'TikTok Business API connection required.',
        actionRequired: 'Authorize TikTok Business Account via Developer App.',
      };
    }

    return {
      status: 'CONNECTED',
      provider: this.provider,
      sourceType: this.sourceType,
      lastCheckedAt: new Date().toISOString(),
      message: 'TikTok Official API is active.',
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
