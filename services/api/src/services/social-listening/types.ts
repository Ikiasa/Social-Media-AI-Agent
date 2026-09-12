export type DataSourceType =
  | 'official_api'
  | 'licensed_provider'
  | 'user_import'
  | 'sandbox_fixture';

export type SocialPlatform = 'instagram' | 'tiktok' | 'linkedin' | 'x' | 'threads' | 'generic';

export interface ConnectorContext {
  workspaceId: string;
  brandId: string;
  socialAccountId?: string;
  providerConnectionId?: string;
  requestedBy: string;
  correlationId: string;
}

export interface NormalizedSocialRecord {
  workspaceId: string;
  brandId: string;
  platform: SocialPlatform;
  source: DataSourceType;
  sourceRecordId: string;
  recordType: 'metric' | 'post' | 'engagement' | 'message' | 'trend_signal';
  capturedAt: string;
  occurredAt?: string;
  data: Record<string, unknown>;
  dataQuality: {
    coverage: 'complete' | 'partial' | 'limited';
    unavailableFields: string[];
  };
}

export interface ConnectorHealth {
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'DEGRADED' | 'CAPABILITY_UNAVAILABLE';
  provider: string;
  sourceType: DataSourceType;
  lastCheckedAt: string;
  message?: string;
  actionRequired?: string;
}

export interface FetchMetricsInput {
  periodStart?: string;
  periodEnd?: string;
  metrics?: string[];
}

export interface FetchPostsInput {
  limit?: number;
  sinceId?: string;
}

export interface SocialDataConnector {
  provider: string;
  sourceType: DataSourceType;
  healthCheck(context: ConnectorContext): Promise<ConnectorHealth>;
  fetchMetrics(
    context: ConnectorContext,
    input: FetchMetricsInput
  ): Promise<NormalizedSocialRecord[]>;
  fetchPosts?(
    context: ConnectorContext,
    input: FetchPostsInput
  ): Promise<NormalizedSocialRecord[]>;
  ingestWebhook?(
    rawBody: Buffer,
    headers: Record<string, string>
  ): Promise<NormalizedSocialRecord[]>;
}
