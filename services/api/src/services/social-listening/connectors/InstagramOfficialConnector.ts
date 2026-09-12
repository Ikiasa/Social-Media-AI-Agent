import {
  SocialDataConnector,
  DataSourceType,
  ConnectorContext,
  ConnectorHealth,
  NormalizedSocialRecord,
  FetchMetricsInput,
  FetchPostsInput,
} from '../types';

export interface InstagramCapabilities {
  ownedAccountMetrics: boolean;
  inbox: boolean;
  publicDiscovery: boolean;
  competitorSignals: boolean;
  publishing: boolean;
}

export class InstagramOfficialConnector implements SocialDataConnector {
  public readonly provider = 'instagram_official';
  public readonly sourceType: DataSourceType = 'official_api';

  async healthCheck(context: ConnectorContext): Promise<ConnectorHealth> {
    const hasConnection = Boolean(context.providerConnectionId || context.socialAccountId);

    if (!hasConnection) {
      return {
        status: 'NOT_CONNECTED',
        provider: this.provider,
        sourceType: this.sourceType,
        lastCheckedAt: new Date().toISOString(),
        message: 'OAuth connection required for Instagram Official API.',
        actionRequired: 'Connect Instagram Business Account via OAuth 2.0.',
      };
    }

    return {
      status: 'CONNECTED',
      provider: this.provider,
      sourceType: this.sourceType,
      lastCheckedAt: new Date().toISOString(),
      message: 'Instagram Official API is active.',
    };
  }

  /**
   * Post-connect capability probe: inspect granted OAuth scopes and return verified capability matrix
   */
  probeCapabilities(grantedScopes: string[] = []): InstagramCapabilities {
    const scopeSet = new Set(grantedScopes);

    return {
      ownedAccountMetrics: scopeSet.has('instagram_manage_insights') || scopeSet.has('read_insights'),
      inbox: scopeSet.has('instagram_manage_messages') || scopeSet.has('pages_messaging'),
      publicDiscovery: scopeSet.has('instagram_public_discovery') || scopeSet.has('hashtag_search'),
      competitorSignals: scopeSet.has('instagram_competitor_analysis'),
      publishing: scopeSet.has('instagram_content_publish') || scopeSet.has('pages_manage_posts'),
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
