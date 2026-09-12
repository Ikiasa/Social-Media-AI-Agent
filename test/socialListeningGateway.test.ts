import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import {
  socialListeningGatewayService,
} from '../services/api/src/services/social-listening/SocialListeningGatewayService';
import { connectorRegistry } from '../services/api/src/services/social-listening/ConnectorRegistry';
import { UserImportConnector } from '../services/api/src/services/social-listening/connectors/UserImportConnector';
import { tenantFeatureFlags } from '../services/api/src/services/TenantFeatureFlagService';
import { eventBus } from '../services/api/src/services/EventBusService';
import {
  ProviderConnectionModel,
  SocialDataIngestionRecordModel,
} from '../packages/database/src';

vi.mock('../packages/database/src', async (importOriginal) => {
  const actual: any = await importOriginal();
  const connectionsMap = new Map<string, any>();
  const ingestionsMap = new Map<string, any>();

  class MockProviderConnectionModel {
    [key: string]: any;
    constructor(data: any) {
      const id = data?._id || `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      Object.assign(this, {
        ...data,
        _id: id,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    async save() {
      connectionsMap.set(String(this._id), this);
      return this;
    }

    toJSON() {
      const copy = { ...this };
      delete copy.encryptedCredentialRef;
      return copy;
    }

    static find = vi.fn().mockImplementation((query) => ({
      sort: vi.fn().mockReturnValue({
        exec: async () => {
          return Array.from(connectionsMap.values()).filter((item) => {
            if (query.workspaceId && item.workspaceId !== query.workspaceId) return false;
            if (query.brandId && item.brandId !== query.brandId) return false;
            return true;
          });
        },
      }),
    }));

    static findOne = vi.fn().mockImplementation((query) => ({
      exec: async () => {
        return Array.from(connectionsMap.values()).find((item) => {
          if (query._id && String(item._id) !== String(query._id)) return false;
          if (query.workspaceId && item.workspaceId !== query.workspaceId) return false;
          return true;
        }) || null;
      },
    }));
  }

  class MockSocialDataIngestionRecordModel {
    [key: string]: any;
    constructor(data: any) {
      const id = data?._id || `ing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      Object.assign(this, {
        ...data,
        _id: id,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    async save() {
      const key = `${this.workspaceId}:${this.source}:${this.sourceRecordId}`;
      const existingKeyDoc = Array.from(ingestionsMap.values()).find(
        (d) => `${d.workspaceId}:${d.source}:${d.sourceRecordId}` === key && String(d._id) !== String(this._id)
      );

      if (existingKeyDoc) {
        const err: any = new Error('Duplicate key collision');
        err.code = 11000;
        throw err;
      }

      ingestionsMap.set(String(this._id), this);
      return this;
    }

    static find = vi.fn().mockImplementation((query) => ({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          exec: async () => {
            return Array.from(ingestionsMap.values()).filter((item) => {
              if (query.workspaceId && item.workspaceId !== query.workspaceId) return false;
              if (query.brandId && item.brandId !== query.brandId) return false;
              if (query.source) {
                if (typeof query.source === 'object' && query.source.$ne) {
                  if (item.source === query.source.$ne) return false;
                } else if (item.source !== query.source) {
                  return false;
                }
              }
              return true;
            });
          },
        }),
      }),
    }));

    static findOne = vi.fn().mockImplementation((query) => ({
      exec: async () => {
        return Array.from(ingestionsMap.values()).find((item) => {
          if (query._id && String(item._id) !== String(query._id)) return false;
          if (query.workspaceId && item.workspaceId !== query.workspaceId) return false;
          if (query.source && item.source !== query.source) return false;
          if (query.sourceRecordId && item.sourceRecordId !== query.sourceRecordId) return false;
          return true;
        }) || null;
      },
    }));
  }

  return {
    ...actual,
    ProviderConnectionModel: MockProviderConnectionModel,
    SocialDataIngestionRecordModel: MockSocialDataIngestionRecordModel,
  };
});

describe('Social Listening Data Gateway (Phase 6 Architecture)', () => {
  const ctxTenantA = {
    workspaceId: 'ws_tenant_a',
    userId: 'user_admin_a',
    brandId: 'brand_a1',
  };

  const ctxTenantB = {
    workspaceId: 'ws_tenant_b',
    userId: 'user_admin_b',
    brandId: 'brand_b1',
  };

  beforeEach(() => {
    tenantFeatureFlags.setFlags('ws_tenant_a', { socialListeningGateway: true });
    tenantFeatureFlags.setFlags('ws_tenant_b', { socialListeningGateway: true });
  });

  it('1. Tenant Isolation: Tenant A cannot access ProviderConnections or Ingestions of Tenant B', async () => {
    const connA = await socialListeningGatewayService.createConnection(ctxTenantA, {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'instagram',
      provider: 'instagram_official',
      sourceType: 'official_api',
    });

    const tenantAConnections = await socialListeningGatewayService.listConnections(ctxTenantA.workspaceId);
    const tenantBConnections = await socialListeningGatewayService.listConnections(ctxTenantB.workspaceId);

    expect(tenantAConnections.some((c) => String(c._id) === String(connA._id))).toBe(true);
    expect(tenantBConnections.some((c) => String(c._id) === String(connA._id))).toBe(false);

    await expect(
      socialListeningGatewayService.checkHealth(String(connA._id), {
        workspaceId: ctxTenantB.workspaceId,
        brandId: ctxTenantB.brandId,
        requestedBy: ctxTenantB.userId,
        correlationId: 'corr_test_1',
      })
    ).rejects.toThrow(`ProviderConnection ${connA._id} not found in workspace ws_tenant_b.`);
  });

  it('2. Connector NOT_CONNECTED: does not generate fake live metrics', async () => {
    const connInfo = await socialListeningGatewayService.createConnection(ctxTenantA, {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'instagram',
      provider: 'instagram_official',
      sourceType: 'official_api',
    });

    const health = await socialListeningGatewayService.checkHealth(String(connInfo._id), {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      requestedBy: ctxTenantA.userId,
      correlationId: 'corr_health_1',
    });

    expect(health.status).toBe('NOT_CONNECTED');
    expect(health.message).toContain('OAuth connection required');

    const syncRes = await socialListeningGatewayService.syncConnection(String(connInfo._id), {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      requestedBy: ctxTenantA.userId,
      correlationId: 'corr_sync_1',
    });

    expect(syncRes.syncedCount).toBe(0);
    expect(syncRes.duplicateCount).toBe(0);
  });

  it('3. Idempotency: duplicate sourceRecordId is ingested only once (returns DUPLICATE)', async () => {
    const recPayload = {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'instagram' as const,
      source: 'official_api' as const,
      sourceRecordId: 'post_unique_123',
      recordType: 'post' as const,
      capturedAt: new Date().toISOString(),
      data: { likes: 50, comments: 5 },
      dataQuality: { coverage: 'complete' as const, unavailableFields: [] },
    };

    const res1 = await socialListeningGatewayService.ingestRecord(recPayload, 'corr_idemp_1');
    expect(res1.status).toBe('PROCESSED');

    const res2 = await socialListeningGatewayService.ingestRecord(recPayload, 'corr_idemp_2');
    expect(res2.status).toBe('DUPLICATE');
  });

  it('4. Webhook Signature & Replay Window: invalid signature or expired timestamp is rejected', async () => {
    const secret = 'test_webhook_secret_key';
    const payload = Buffer.from(JSON.stringify({ event: 'comment_created', id: 'c_1' }));
    const validTimestamp = Date.now().toString();
    const expiredTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 mins ago

    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const validHeaders = {
      'x-provider-signature': `sha256=${hmac}`,
      'x-provider-timestamp': validTimestamp,
    };

    const expiredHeaders = {
      'x-provider-signature': `sha256=${hmac}`,
      'x-provider-timestamp': expiredTimestamp,
    };

    const invalidHeaders = {
      'x-provider-signature': 'sha256=invalid_signature_hash',
      'x-provider-timestamp': validTimestamp,
    };

    expect(socialListeningGatewayService.verifyWebhookSignature(payload, validHeaders, secret)).toBe(true);
    expect(socialListeningGatewayService.verifyWebhookSignature(payload, expiredHeaders, secret)).toBe(false);
    expect(socialListeningGatewayService.verifyWebhookSignature(payload, invalidHeaders, secret)).toBe(false);
  });

  it('5. Provider Rate Limit & Circuit Breaker: threshold failure opens circuit breaker', async () => {
    const conn = await socialListeningGatewayService.createConnection(ctxTenantA, {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'generic',
      provider: 'unregistered_failing_provider',
      sourceType: 'official_api',
    });

    const connId = String(conn._id);

    for (let i = 0; i < 3; i++) {
      await socialListeningGatewayService.checkHealth(connId, {
        workspaceId: ctxTenantA.workspaceId,
        brandId: ctxTenantA.brandId,
        requestedBy: ctxTenantA.userId,
        correlationId: `fail_${i}`,
      });
    }

    const state = socialListeningGatewayService.getCircuitBreakerState(connId);
    expect(state).toBe('OPEN');
  });

  it('6. Credential Masking: encryptedCredentialRef is never exposed in API model responses', async () => {
    const conn = await socialListeningGatewayService.createConnection(ctxTenantA, {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'instagram',
      provider: 'instagram_official',
      sourceType: 'official_api',
      credentialSecret: 'super_secret_oauth_token_123',
    });

    const jsonOutput = JSON.parse(JSON.stringify(conn));
    expect(jsonOutput.encryptedCredentialRef).toBeUndefined();
    expect(JSON.stringify(jsonOutput)).not.toContain('super_secret_oauth_token_123');
  });

  it('7. Sandbox Fixture Segregation: sandbox records are labeled sandbox_fixture', async () => {
    const sandboxConnector = connectorRegistry.getConnector('sandbox_fixture');
    expect(sandboxConnector).toBeDefined();

    const metrics = await sandboxConnector!.fetchMetrics(
      {
        workspaceId: ctxTenantA.workspaceId,
        brandId: ctxTenantA.brandId,
        requestedBy: ctxTenantA.userId,
        correlationId: 'sb_corr',
      },
      {}
    );

    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics.every((m) => m.source === 'sandbox_fixture')).toBe(true);
  });

  it('8. User Import Validation: enforces maximum 5MB file size limit and brand binding', () => {
    const userImportConnector = new UserImportConnector();
    const rows = [
      {
        platform: 'instagram' as const,
        sourceRecordId: 'imp_row_1',
        recordType: 'metric' as const,
        data: { reach: 1000 },
      },
    ];

    const context = {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      requestedBy: ctxTenantA.userId,
      correlationId: 'imp_test_1',
    };

    const validRecords = userImportConnector.processImportPayload(context, rows, 1024);
    expect(validRecords.length).toBe(1);
    expect(validRecords[0].workspaceId).toBe(ctxTenantA.workspaceId);
    expect(validRecords[0].brandId).toBe(ctxTenantA.brandId);

    const OVER_LIMIT_BYTES = 6 * 1024 * 1024; // 6MB
    expect(() => userImportConnector.processImportPayload(context, rows, OVER_LIMIT_BYTES)).toThrow(
      'exceeds 5MB limit'
    );
  });

  it('9. Downstream Event Routing: emits social_data.* events upon ingestion', async () => {
    const emittedEvents: any[] = [];
    const unsubscribe = (eventData: any) => {
      emittedEvents.push(eventData);
    };

    eventBus.on('social_data.post_ingested', unsubscribe);

    const recPayload = {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'tiktok' as const,
      source: 'official_api' as const,
      sourceRecordId: `event_test_post_${Date.now()}`,
      recordType: 'post' as const,
      capturedAt: new Date().toISOString(),
      data: { videoViews: 5000 },
      dataQuality: { coverage: 'complete' as const, unavailableFields: [] },
    };

    await socialListeningGatewayService.ingestRecord(recPayload, 'corr_event_1');

    expect(emittedEvents.length).toBe(1);
    expect(emittedEvents[0].payload.sourceRecordId).toBe(recPayload.sourceRecordId);

    eventBus.off('social_data.post_ingested', unsubscribe);
  });

  it('10. Feature Flag Gating: disabling socialListeningGateway blocks API and connector access', async () => {
    tenantFeatureFlags.setFlags(ctxTenantA.workspaceId, { socialListeningGateway: false });

    await expect(
      socialListeningGatewayService.listConnections(ctxTenantA.workspaceId)
    ).rejects.toThrow('Social Listening Gateway feature flag is disabled');

    expect(() => connectorRegistry.getConnector('instagram_official', ctxTenantA.workspaceId)).toThrow(
      'Social Listening Gateway feature flag is disabled'
    );
  });

  it('11. Tenant Circuit Breaker Isolation: failure on Tenant A connection does not open circuit breaker on Tenant B connection', async () => {
    const connA = await socialListeningGatewayService.createConnection(ctxTenantA, {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'generic',
      provider: 'failing_provider_tenant_a',
      sourceType: 'official_api',
    });

    const connB = await socialListeningGatewayService.createConnection(ctxTenantB, {
      workspaceId: ctxTenantB.workspaceId,
      brandId: ctxTenantB.brandId,
      platform: 'generic',
      provider: 'failing_provider_tenant_b',
      sourceType: 'official_api',
    });

    const connIdA = String(connA._id);
    const connIdB = String(connB._id);

    // Fail connection A 3 times
    for (let i = 0; i < 3; i++) {
      await socialListeningGatewayService.checkHealth(connIdA, {
        workspaceId: ctxTenantA.workspaceId,
        brandId: ctxTenantA.brandId,
        requestedBy: ctxTenantA.userId,
        correlationId: `fail_a_${i}`,
      });
    }

    expect(socialListeningGatewayService.getCircuitBreakerState(connIdA)).toBe('OPEN');
    // Tenant B connection circuit breaker must remain CLOSED
    expect(socialListeningGatewayService.getCircuitBreakerState(connIdB)).toBe('CLOSED');
  });

  it('12. Webhook Replay Protection: valid webhook with same providerEventId returns DUPLICATE on second replay', async () => {
    const providerEventId = `wh_event_replay_${Date.now()}`;

    const recPayload = {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'instagram' as const,
      source: 'official_api' as const,
      sourceRecordId: providerEventId,
      recordType: 'metric' as const,
      capturedAt: new Date().toISOString(),
      data: { likes: 250 },
      dataQuality: { coverage: 'complete' as const, unavailableFields: [] },
    };

    const firstResult = await socialListeningGatewayService.ingestRecord(recPayload, 'wh_corr_1');
    expect(firstResult.status).toBe('PROCESSED');

    // Second ingestion with same providerEventId must return DUPLICATE
    const secondResult = await socialListeningGatewayService.ingestRecord(recPayload, 'wh_corr_2');
    expect(secondResult.status).toBe('DUPLICATE');
  });

  it('13. Sandbox Fixture Isolation: sandbox records are excluded from production reports and active alerts', async () => {
    const sandboxRecord = {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'generic' as const,
      source: 'sandbox_fixture' as const,
      sourceRecordId: `sb_isolation_${Date.now()}`,
      recordType: 'metric' as const,
      capturedAt: new Date().toISOString(),
      data: { testMetric: 999 },
      dataQuality: { coverage: 'complete' as const, unavailableFields: [] },
    };

    await socialListeningGatewayService.ingestRecord(sandboxRecord, 'corr_sb_iso');

    const prodIngestions = await socialListeningGatewayService.listIngestions(
      ctxTenantA.workspaceId,
      ctxTenantA.brandId,
      50,
      false // includeSandbox = false
    );

    expect(prodIngestions.some((r) => r.source === 'sandbox_fixture')).toBe(false);

    const allIngestions = await socialListeningGatewayService.listIngestions(
      ctxTenantA.workspaceId,
      ctxTenantA.brandId,
      50,
      true // includeSandbox = true
    );

    expect(allIngestions.some((r) => r.source === 'sandbox_fixture')).toBe(true);
  });

  it('14. Capability Unavailable: requesting unsupported connector capability returns CAPABILITY_UNAVAILABLE without fake data or errors', async () => {
    const conn = await socialListeningGatewayService.createConnection(ctxTenantA, {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'x',
      provider: 'x_official',
      sourceType: 'official_api',
      capabilities: { competitorSignals: false },
    });

    const connId = String(conn._id);
    const check = await socialListeningGatewayService.checkCapability(connId, ctxTenantA.workspaceId, 'competitorSignals');

    expect(check.available).toBe(false);
    expect(check.status).toBe('CAPABILITY_UNAVAILABLE');
    expect(check.reason).toContain('not supported');
  });

  it('15. Concurrent Ingestion & Unique Index Enforcement: parallel calls with same providerEventId map duplicate-key error to DUPLICATE status', async () => {
    const concurrentEventId = `wh_concurrent_${Date.now()}`;
    const recPayload = {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'tiktok' as const,
      source: 'official_api' as const,
      sourceRecordId: concurrentEventId,
      recordType: 'metric' as const,
      capturedAt: new Date().toISOString(),
      data: { shares: 50 },
      dataQuality: { coverage: 'complete' as const, unavailableFields: [] },
    };

    // Execute concurrent parallel ingestions
    const [res1, res2] = await Promise.all([
      socialListeningGatewayService.ingestRecord(recPayload, 'corr_conc_1'),
      socialListeningGatewayService.ingestRecord(recPayload, 'corr_conc_2'),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain('PROCESSED');
    expect(statuses).toContain('DUPLICATE');
  });

  it('16. Downstream Consumer Sandbox Guard: AttributionService, CompetitorTrendRadarService, and Inbox ignore sandbox_fixture records', async () => {
    const { AttributionService } = await import('../services/api/src/services/AttributionService');
    const { CompetitorTrendRadarService } = await import('../services/api/src/services/CompetitorTrendRadarService');
    const { UnifiedInboxIngestionService } = await import('../services/api/src/services/UnifiedInboxIngestionService');

    const attributionService = new AttributionService();
    const radarService = new CompetitorTrendRadarService();
    const inboxService = new UnifiedInboxIngestionService();

    const sandboxAttribution = await attributionService.recordEvent(ctxTenantA, {
      eventId: `sb_attr_${Date.now()}`,
      brandId: ctxTenantA.brandId,
      platform: 'instagram',
      eventType: 'conversion' as any,
      source: 'sandbox_fixture',
    });

    expect(sandboxAttribution).toBeNull();

    const sandboxSnapshot = await radarService.recordSnapshot(ctxTenantA, {
      brandId: ctxTenantA.brandId,
      competitorId: 'comp_1',
      platform: 'instagram',
      source: 'sandbox_fixture',
      sourceRecordId: `sb_snap_${Date.now()}`,
      postCount: 5,
      sampleSize: 5,
    });

    expect(sandboxSnapshot).toBeNull();

    const sandboxMessage = await inboxService.ingestInboundMessage(ctxTenantA, {
      brandId: ctxTenantA.brandId,
      socialAccountId: 'acc_1',
      platform: 'instagram' as any,
      externalConversationId: 'conv_1',
      externalMessageId: 'msg_1',
      participantReference: 'part_1',
      body: 'Test sandbox message',
      providerEventId: `sb_msg_${Date.now()}`,
      metadata: { source: 'sandbox_fixture' },
    });

    expect(sandboxMessage).toBeNull();
  });
});

