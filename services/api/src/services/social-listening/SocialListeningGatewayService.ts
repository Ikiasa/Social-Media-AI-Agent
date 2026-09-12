import crypto from 'crypto';
import {
  ProviderConnectionModel,
  IProviderConnection,
  ProviderConnectionStatus,
  ProviderSourceType,
} from '../../../../../packages/database/src';
import {
  SocialDataIngestionRecordModel,
  ISocialDataIngestionRecord,
} from '../../../../../packages/database/src';
import {
  ConnectorContext,
  NormalizedSocialRecord,
  ConnectorHealth,
} from './types';
import { connectorRegistry } from './ConnectorRegistry';
import { CircuitBreaker } from './CircuitBreaker';
import { eventBus } from '../EventBusService';
import { costObservabilityService } from '../CostObservabilityService';
import { tenantFeatureFlags } from '../TenantFeatureFlagService';

export interface CreateConnectionInput {
  workspaceId: string;
  brandId: string;
  platform: 'instagram' | 'tiktok' | 'linkedin' | 'x' | 'threads' | 'generic';
  provider: string;
  sourceType: ProviderSourceType;
  credentialSecret?: string;
  capabilities?: {
    ownedAccountMetrics?: boolean;
    inbox?: boolean;
    publicDiscovery?: boolean;
    competitorSignals?: boolean;
    publishing?: boolean;
  };
}

export class SocialListeningGatewayService {
  private static instance: SocialListeningGatewayService;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  public static getInstance(): SocialListeningGatewayService {
    if (!SocialListeningGatewayService.instance) {
      SocialListeningGatewayService.instance = new SocialListeningGatewayService();
    }
    return SocialListeningGatewayService.instance;
  }

  private getCircuitBreaker(connectionId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(connectionId)) {
      this.circuitBreakers.set(
        connectionId,
        new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 5000 })
      );
    }
    return this.circuitBreakers.get(connectionId)!;
  }

  public getCircuitBreakerState(connectionId: string): string {
    return this.getCircuitBreaker(connectionId).getState();
  }

  async createConnection(
    context: { workspaceId: string; brandId: string },
    input: CreateConnectionInput
  ): Promise<IProviderConnection> {
    if (!tenantFeatureFlags.isFeatureEnabled(context.workspaceId, 'socialListeningGateway')) {
      throw new Error(`Social Listening Gateway feature flag is disabled for workspace ${context.workspaceId}.`);
    }

    if (input.workspaceId !== context.workspaceId) {
      throw new Error(`Workspace mismatch: cannot create connection for a different workspace.`);
    }

    const encryptedCredentialRef = input.credentialSecret
      ? `enc_${crypto.createHash('sha256').update(input.credentialSecret).digest('hex').substring(0, 16)}`
      : undefined;

    const connection = new ProviderConnectionModel({
      workspaceId: context.workspaceId,
      brandId: input.brandId,
      platform: input.platform,
      provider: input.provider,
      sourceType: input.sourceType,
      status: input.credentialSecret ? 'CONNECTED' : 'PENDING',
      capabilities: {
        ownedAccountMetrics: false,
        inbox: false,
        publicDiscovery: false,
        competitorSignals: false,
        publishing: false,
        ...(input.capabilities || {}),
      },
      encryptedCredentialRef,
      lastHealthCheckAt: new Date(),
    });

    await connection.save();
    return connection;
  }

  async listConnections(
    workspaceId: string,
    brandId?: string
  ): Promise<IProviderConnection[]> {
    if (!tenantFeatureFlags.isFeatureEnabled(workspaceId, 'socialListeningGateway')) {
      throw new Error(`Social Listening Gateway feature flag is disabled for workspace ${workspaceId}.`);
    }

    const query: Record<string, unknown> = { workspaceId };
    if (brandId) query.brandId = brandId;

    return ProviderConnectionModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async checkHealth(
    connectionId: string,
    context: ConnectorContext
  ): Promise<ConnectorHealth> {
    const connection = await ProviderConnectionModel.findOne({
      _id: connectionId,
      workspaceId: context.workspaceId,
    }).exec();

    if (!connection) {
      throw new Error(`ProviderConnection ${connectionId} not found in workspace ${context.workspaceId}.`);
    }

    const breaker = this.getCircuitBreaker(connectionId);
    try {
      const health = await breaker.execute(async () => {
        const connector = connectorRegistry.getConnector(connection.provider, context.workspaceId);
        if (!connector) {
          throw new Error(`Connector for provider ${connection.provider} is not registered.`);
        }
        const res = await connector.healthCheck(context);
        if (res.status === 'DEGRADED') {
          throw new Error(res.message || `Connector for ${connection.provider} is degraded.`);
        }
        return res;
      });
      connection.lastHealthCheckAt = new Date();
      connection.status = health.status === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED';
      await connection.save();
      return health;
    } catch (err) {
      connection.lastHealthCheckAt = new Date();
      connection.lastErrorCode = err instanceof Error ? err.message : String(err);
      connection.status = 'ERROR';
      await connection.save();

      return {
        status: 'DEGRADED',
        provider: connection.provider,
        sourceType: connection.sourceType,
        lastCheckedAt: new Date().toISOString(),
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    headers: Record<string, string>,
    secret: string
  ): boolean {
    const signature = headers['x-provider-signature'] || headers['x-hub-signature-256'];
    const timestampStr = headers['x-provider-timestamp'];

    if (!signature) {
      return false;
    }

    // Replay window check: 5 minutes (300,000 ms)
    if (timestampStr) {
      const timestamp = parseInt(timestampStr, 10);
      if (!isNaN(timestamp)) {
        const now = Date.now();
        if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
          return false;
        }
      }
    }

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const cleanSignature = signature.replace(/^sha256=/i, '');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(cleanSignature, 'hex'),
        Buffer.from(expected, 'hex')
      );
    } catch (_err) {
      return false;
    }
  }

  async ingestRecord(
    record: NormalizedSocialRecord,
    correlationId: string,
    providerConnectionId?: string
  ): Promise<{ status: 'PROCESSED' | 'DUPLICATE' | 'FAILED'; record: ISocialDataIngestionRecord }> {
    if (!tenantFeatureFlags.isFeatureEnabled(record.workspaceId, 'socialListeningGateway')) {
      throw new Error(`Social Listening Gateway feature flag is disabled for workspace ${record.workspaceId}.`);
    }

    // Pre-check for duplicate/replay protection
    const existingRecord = await SocialDataIngestionRecordModel.findOne({
      workspaceId: record.workspaceId,
      source: record.source,
      sourceRecordId: record.sourceRecordId,
    }).exec();

    if (existingRecord) {
      existingRecord.status = 'DUPLICATE';
      return { status: 'DUPLICATE', record: existingRecord };
    }

    const payloadString = JSON.stringify(record.data);
    const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');

    const ingestionDoc = new SocialDataIngestionRecordModel({
      workspaceId: record.workspaceId,
      brandId: record.brandId,
      providerConnectionId,
      platform: record.platform,
      source: record.source,
      sourceRecordId: record.sourceRecordId,
      recordType: record.recordType,
      payloadHash,
      status: 'NORMALIZED',
      correlationId,
      capturedAt: new Date(record.capturedAt),
      processedAt: new Date(),
      dataQuality: record.dataQuality,
      payload: record.data,
    });

    try {
      await ingestionDoc.save();
    } catch (err: any) {
      if (err.code === 11000 || (err.message && (err.message.includes('Duplicate key') || err.message.includes('duplicate key')))) {
        // Idempotency duplicate collision fallback via unique index enforcement
        const existing = await SocialDataIngestionRecordModel.findOne({
          workspaceId: record.workspaceId,
          source: record.source,
          sourceRecordId: record.sourceRecordId,
        }).exec();

        ingestionDoc.status = 'DUPLICATE';
        return { status: 'DUPLICATE', record: existing || ingestionDoc };
      }
      throw err;
    }

    ingestionDoc.status = 'PROCESSED';
    await ingestionDoc.save();

    // Emit event based on recordType
    const eventNameMap: Record<string, string> = {
      metric: 'social_data.metric_ingested',
      post: 'social_data.post_ingested',
      engagement: 'social_data.engagement_ingested',
      message: 'social_data.message_ingested',
      trend_signal: 'social_data.trend_signal_ingested',
    };

    const isSandbox = record.source === 'sandbox_fixture';
    const eventName = eventNameMap[record.recordType] || 'social_data.metric_ingested';
    eventBus.publishEvent(eventName, {
      workspaceId: record.workspaceId,
      brandId: record.brandId,
      platform: record.platform,
      source: record.source,
      sourceRecordId: record.sourceRecordId,
      recordType: record.recordType,
      capturedAt: record.capturedAt,
      dataQuality: record.dataQuality,
      data: record.data,
      correlationId,
      isSandbox,
    });

    // Record cost tracking
    costObservabilityService.recordUsage(
      record.workspaceId,
      `gateway_sync_${record.source}`,
      10,
      20,
      record.brandId
    );

    return { status: 'PROCESSED', record: ingestionDoc };
  }

  async syncConnection(
    connectionId: string,
    context: ConnectorContext
  ): Promise<{ syncedCount: number; duplicateCount: number }> {
    const connection = await ProviderConnectionModel.findOne({
      _id: connectionId,
      workspaceId: context.workspaceId,
    }).exec();

    if (!connection) {
      throw new Error(`ProviderConnection ${connectionId} not found in workspace ${context.workspaceId}.`);
    }

    const connector = connectorRegistry.getConnector(connection.provider, context.workspaceId);
    if (!connector) {
      throw new Error(`Connector for provider ${connection.provider} is not registered.`);
    }

    const breaker = this.getCircuitBreaker(connectionId);
    let syncedCount = 0;
    let duplicateCount = 0;

    try {
      const records = await breaker.execute(async () => {
        const health = await connector.healthCheck(context);
        if (health.status !== 'CONNECTED') {
          return [];
        }

        const metricsRecords = await connector.fetchMetrics(context, {});
        const postRecords = connector.fetchPosts ? await connector.fetchPosts(context, {}) : [];
        return [...metricsRecords, ...postRecords];
      });

      for (const rec of records) {
        const res = await this.ingestRecord(rec, context.correlationId, connectionId);
        if (res.status === 'PROCESSED') syncedCount++;
        if (res.status === 'DUPLICATE') duplicateCount++;
      }

      connection.lastSyncAt = new Date();
      connection.status = 'CONNECTED';
      await connection.save();

      return { syncedCount, duplicateCount };
    } catch (err) {
      connection.lastErrorCode = err instanceof Error ? err.message : String(err);
      connection.status = 'ERROR';
      await connection.save();

      eventBus.publishEvent('social_data.sync_failed', {
        workspaceId: context.workspaceId,
        brandId: context.brandId,
        providerConnectionId: connectionId,
        provider: connection.provider,
        error: connection.lastErrorCode,
        correlationId: context.correlationId,
      });

      throw err;
    }
  }

  async listIngestions(
    workspaceId: string,
    brandId?: string,
    limit = 50,
    includeSandbox = false
  ): Promise<ISocialDataIngestionRecord[]> {
    if (!tenantFeatureFlags.isFeatureEnabled(workspaceId, 'socialListeningGateway')) {
      throw new Error(`Social Listening Gateway feature flag is disabled for workspace ${workspaceId}.`);
    }

    const query: Record<string, unknown> = { workspaceId };
    if (brandId) query.brandId = brandId;
    if (!includeSandbox) {
      query.source = { $ne: 'sandbox_fixture' };
    }

    return SocialDataIngestionRecordModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async checkCapability(
    connectionId: string,
    workspaceId: string,
    capabilityName: keyof IProviderConnection['capabilities']
  ): Promise<{ available: boolean; status: string; reason?: string }> {
    const connection = await ProviderConnectionModel.findOne({
      _id: connectionId,
      workspaceId,
    }).exec();

    if (!connection) {
      return { available: false, status: 'NOT_FOUND', reason: 'Connection not found.' };
    }

    const isCapabilitySupported = Boolean(connection.capabilities?.[capabilityName]);
    if (!isCapabilitySupported) {
      return {
        available: false,
        status: 'CAPABILITY_UNAVAILABLE',
        reason: `Capability ${String(capabilityName)} is not supported by connection ${connectionId}.`,
      };
    }

    return { available: true, status: 'AVAILABLE' };
  }

  async getIngestionById(
    workspaceId: string,
    id: string
  ): Promise<ISocialDataIngestionRecord | null> {
    if (!tenantFeatureFlags.isFeatureEnabled(workspaceId, 'socialListeningGateway')) {
      throw new Error(`Social Listening Gateway feature flag is disabled for workspace ${workspaceId}.`);
    }

    return SocialDataIngestionRecordModel.findOne({ _id: id, workspaceId }).exec();
  }
}

export const socialListeningGatewayService = SocialListeningGatewayService.getInstance();
