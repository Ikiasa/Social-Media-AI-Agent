import {
  SocialDataConnector,
  DataSourceType,
  ConnectorContext,
  ConnectorHealth,
  NormalizedSocialRecord,
  FetchMetricsInput,
  FetchPostsInput,
} from '../types';

export class LicensedSocialListeningConnector implements SocialDataConnector {
  public readonly provider = 'licensed_listening';
  public readonly sourceType: DataSourceType = 'licensed_provider';

  async healthCheck(context: ConnectorContext): Promise<ConnectorHealth> {
    const hasConnection = Boolean(context.providerConnectionId);

    if (!hasConnection) {
      return {
        status: 'NOT_CONNECTED',
        provider: this.provider,
        sourceType: this.sourceType,
        lastCheckedAt: new Date().toISOString(),
        message: 'Licensed Listening Feed API key required.',
        actionRequired: 'Configure licensed provider API key and stream endpoint.',
      };
    }

    return {
      status: 'CONNECTED',
      provider: this.provider,
      sourceType: this.sourceType,
      lastCheckedAt: new Date().toISOString(),
      message: 'Licensed Social Listening Feed active.',
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
