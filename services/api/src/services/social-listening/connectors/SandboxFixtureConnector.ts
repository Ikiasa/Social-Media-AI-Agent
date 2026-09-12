import {
  SocialDataConnector,
  DataSourceType,
  ConnectorContext,
  ConnectorHealth,
  NormalizedSocialRecord,
  FetchMetricsInput,
  FetchPostsInput,
} from '../types';

export class SandboxFixtureConnector implements SocialDataConnector {
  public readonly provider = 'sandbox_fixture';
  public readonly sourceType: DataSourceType = 'sandbox_fixture';

  async healthCheck(_context: ConnectorContext): Promise<ConnectorHealth> {
    return {
      status: 'CONNECTED',
      provider: this.provider,
      sourceType: this.sourceType,
      lastCheckedAt: new Date().toISOString(),
      message: 'Sandbox Fixture Connector ready for isolated testing.',
    };
  }

  async fetchMetrics(
    context: ConnectorContext,
    _input: FetchMetricsInput
  ): Promise<NormalizedSocialRecord[]> {
    const now = new Date().toISOString();

    return [
      {
        workspaceId: context.workspaceId,
        brandId: context.brandId,
        platform: 'instagram',
        source: 'sandbox_fixture',
        sourceRecordId: `sb_metric_${Date.now()}_1`,
        recordType: 'metric',
        capturedAt: now,
        occurredAt: now,
        data: {
          impressions: 12500,
          reach: 9800,
          likes: 450,
          comments: 32,
          shares: 18,
          saves: 85,
        },
        dataQuality: {
          coverage: 'complete',
          unavailableFields: [],
        },
      },
      {
        workspaceId: context.workspaceId,
        brandId: context.brandId,
        platform: 'x',
        source: 'sandbox_fixture',
        sourceRecordId: `sb_metric_${Date.now()}_2`,
        recordType: 'trend_signal',
        capturedAt: now,
        occurredAt: now,
        data: {
          topic: 'AI Content Automation',
          volume: 3400,
          velocityPct: 45,
          sampleText: 'AI Carousel automation boosted engagement by 40%',
        },
        dataQuality: {
          coverage: 'complete',
          unavailableFields: [],
        },
      },
    ];
  }

  async fetchPosts(
    context: ConnectorContext,
    _input: FetchPostsInput
  ): Promise<NormalizedSocialRecord[]> {
    const now = new Date().toISOString();

    return [
      {
        workspaceId: context.workspaceId,
        brandId: context.brandId,
        platform: 'instagram',
        source: 'sandbox_fixture',
        sourceRecordId: `sb_post_${Date.now()}_1`,
        recordType: 'post',
        capturedAt: now,
        occurredAt: now,
        data: {
          caption: 'Sandbox post test for social listening gateway',
          mediaUrl: 'https://sandbox.riona.ai/assets/sample.jpg',
          engagementRate: 0.045,
        },
        dataQuality: {
          coverage: 'complete',
          unavailableFields: [],
        },
      },
    ];
  }
}
