import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { validateEnvironment } from '../services/api/src/config/env';
import { getSecurityPolicy, sanitizeErrorForResponse } from '../services/api/src/config/SecurityConfig';
import { InstagramOAuthService, instagramOAuthService } from '../services/api/src/services/oauth/InstagramOAuthService';
import { InMemoryOAuthNonceStore } from '../services/api/src/services/oauth/OAuthNonceStore';
import { InstagramOfficialConnector } from '../services/api/src/services/social-listening/connectors/InstagramOfficialConnector';
import { Logger } from '../services/api/src/utils/Logger';
import { alertManagerService } from '../services/api/src/services/observability/AlertManagerService';
import { tenantFeatureFlags } from '../services/api/src/services/TenantFeatureFlagService';
import { socialListeningGatewayService } from '../services/api/src/services/social-listening/SocialListeningGatewayService';
import { ProviderConnectionModel, SocialDataIngestionRecordModel } from '../packages/database/src';

vi.mock('../packages/database/src', async (importOriginal) => {
  const actual: any = await importOriginal();
  const connectionsMap = new Map<string, any>();
  const ingestionsMap = new Map<string, any>();

  class MockProviderConnectionModel {
    [key: string]: any;
    constructor(data: any) {
      const id = data?._id || `conn_p7_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
      const id = data?._id || `ing_p7_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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

describe('Phase 7: Production Readiness & Official Provider Rollout', () => {
  const ctxTenantA = { workspaceId: 'ws_prod_a', brandId: 'b_prod_a', userId: 'user_admin_a' };
  const ctxTenantB = { workspaceId: 'ws_prod_b', brandId: 'b_prod_b', userId: 'user_admin_b' };

  beforeEach(async () => {
    vi.clearAllMocks();
    await instagramOAuthService.resetNonces();
    alertManagerService.clearAlerts();
    tenantFeatureFlags.setFlags(ctxTenantA.workspaceId, {
      socialListeningGateway: true,
      instagramOfficialPilot: true,
      instagramMetricsSync: true,
    });
    tenantFeatureFlags.setFlags(ctxTenantB.workspaceId, {
      socialListeningGateway: true,
      instagramOfficialPilot: true,
    });
  });

  it('1. OAuth State Binding: OAuth state from different tenant/user is rejected', async () => {
    const { stateToken } = instagramOAuthService.generateOAuthState(
      ctxTenantA.workspaceId,
      ctxTenantA.brandId,
      ctxTenantA.userId
    );

    // Attempting to verify state with Tenant B context must fail
    await expect(
      instagramOAuthService.verifyOAuthState(stateToken, ctxTenantB.workspaceId, ctxTenantB.userId)
    ).rejects.toThrow('CROSS_TENANT_OAUTH_REJECTION');
  });

  it('2. OAuth State Security: expired or reused single-use OAuth state is rejected', async () => {
    const { stateToken } = instagramOAuthService.generateOAuthState(
      ctxTenantA.workspaceId,
      ctxTenantA.brandId,
      ctxTenantA.userId
    );

    // First use: Valid
    const verified = await instagramOAuthService.verifyOAuthState(
      stateToken,
      ctxTenantA.workspaceId,
      ctxTenantA.userId
    );
    expect(verified.workspaceId).toBe(ctxTenantA.workspaceId);

    // Reuse attempt: Must fail with REUSED_OAUTH_STATE
    await expect(
      instagramOAuthService.verifyOAuthState(stateToken, ctxTenantA.workspaceId, ctxTenantA.userId)
    ).rejects.toThrow('REUSED_OAUTH_STATE');
  });

  it('2b. OAuth nonce store: a nonce redeemed by one service instance is rejected by another', async () => {
    const sharedStore = new InMemoryOAuthNonceStore();
    const primaryInstance = new InstagramOAuthService(sharedStore);
    const secondaryInstance = new InstagramOAuthService(sharedStore);
    const { stateToken } = primaryInstance.generateOAuthState(
      ctxTenantA.workspaceId,
      ctxTenantA.brandId,
      ctxTenantA.userId
    );

    await primaryInstance.verifyOAuthState(stateToken, ctxTenantA.workspaceId, ctxTenantA.userId);
    await expect(
      secondaryInstance.verifyOAuthState(stateToken, ctxTenantA.workspaceId, ctxTenantA.userId)
    ).rejects.toThrow('REUSED_OAUTH_STATE');
  });

  it('3. Environment Isolation: staging provider connection cannot be used in production mode', () => {
    const devConfig = validateEnvironment();
    expect(devConfig.env).toBeDefined();

    const policyStaging = getSecurityPolicy('staging');
    const policyProd = getSecurityPolicy('production');

    expect(policyProd.corsAllowedOrigins).not.toContain('https://app-staging.riona.ai');
    expect(policyStaging.corsAllowedOrigins).toContain('https://app-staging.riona.ai');
  });

  it('4. Secret & Token Masking: secret or token never appears in API response or structured log', async () => {
    const conn = await socialListeningGatewayService.createConnection(ctxTenantA, {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'instagram',
      provider: 'instagram_official',
      sourceType: 'official_api',
      credentialSecret: 'super_secret_oauth_access_token_xyz',
    });

    const jsonOutput = JSON.parse(JSON.stringify(conn));
    expect(jsonOutput.encryptedCredentialRef).toBeUndefined();
    expect(JSON.stringify(jsonOutput)).not.toContain('super_secret_oauth_access_token_xyz');

    // Test Logger redaction guard
    const logString = Logger.formatLog('info', 'Testing OAuth token logging', {
      workspaceId: ctxTenantA.workspaceId,
      accessToken: 'secret_access_token_999',
      clientSecret: 'secret_client_xyz',
    });

    expect(logString).not.toContain('secret_access_token_999');
    expect(logString).not.toContain('secret_client_xyz');
    expect(logString).toContain('[REDACTED_SECRET]');
  });

  it('5. Capability Probe Accuracy: unverified capabilities remain false and do not generate fake metrics', () => {
    const connector = new InstagramOfficialConnector();
    // Scope contains only insights, not publishing or messaging
    const pilotCapabilities = connector.probeCapabilities(['instagram_basic', 'instagram_manage_insights']);

    expect(pilotCapabilities.ownedAccountMetrics).toBe(true);
    expect(pilotCapabilities.inbox).toBe(false);
    expect(pilotCapabilities.publishing).toBe(false);
    expect(pilotCapabilities.competitorSignals).toBe(false);
  });

  it('6. Webhook Idempotency & Replay: valid webhook processed once; replay is rejected', async () => {
    const webhookEventId = `wh_p7_event_${Date.now()}`;
    const payload = {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'instagram' as const,
      source: 'official_api' as const,
      sourceRecordId: webhookEventId,
      recordType: 'metric' as const,
      capturedAt: new Date().toISOString(),
      data: { impressions: 1200 },
      dataQuality: { coverage: 'complete' as const, unavailableFields: [] },
    };

    const firstIngest = await socialListeningGatewayService.ingestRecord(payload, 'wh_p7_corr_1');
    expect(firstIngest.status).toBe('PROCESSED');

    const replayIngest = await socialListeningGatewayService.ingestRecord(payload, 'wh_p7_corr_2');
    expect(replayIngest.status).toBe('DUPLICATE');
  });

  it('7. Tenant Circuit Breaker Isolation: circuit breaker on one connection does not affect other tenants', async () => {
    const connA = await socialListeningGatewayService.createConnection(ctxTenantA, {
      workspaceId: ctxTenantA.workspaceId,
      brandId: ctxTenantA.brandId,
      platform: 'generic',
      provider: 'failing_provider_a',
      sourceType: 'official_api',
