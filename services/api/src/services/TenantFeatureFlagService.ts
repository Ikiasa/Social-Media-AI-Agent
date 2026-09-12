export interface TenantFeatureFlags {
  clientApprovalPortal: boolean;
  whiteLabeling: boolean;
  campaignIntelligence: boolean;
  competitorRadar: boolean;
  unifiedInbox: boolean;
  communityAgentDrafts: boolean;
  creativePipeline: boolean;
  creativeAssetPipeline: boolean;
  agencyOperations: boolean;
  whiteLabelReporting: boolean;
  aiQualityGuardrails: boolean;
  socialListeningGateway: boolean;
  // Phase 7 Instagram Official Pilot Feature Flags (Rollout Policy)
  instagramOfficialPilot: boolean;
  instagramMetricsSync: boolean;
  instagramInboxWebhook: boolean;
  instagramPublishing: boolean;
  instagramCommunityReply: boolean;
  maxBrandsAllowed: number;
}

const DEFAULT_FLAGS: TenantFeatureFlags = {
  clientApprovalPortal: true,
  whiteLabeling: true,
  campaignIntelligence: true,
  competitorRadar: true,
  unifiedInbox: true,
  communityAgentDrafts: true,
  creativePipeline: true,
  creativeAssetPipeline: true,
  agencyOperations: true,
  whiteLabelReporting: true,
  aiQualityGuardrails: true,
  socialListeningGateway: true,
  // Phase 7 Pilot flags default to false for safe controlled rollout
  instagramOfficialPilot: false,
  instagramMetricsSync: false,
  instagramInboxWebhook: false,
  instagramPublishing: false,
  instagramCommunityReply: false,
  maxBrandsAllowed: 10,
};

export class TenantFeatureFlagService {
  private tenantFlags: Map<string, TenantFeatureFlags> = new Map();

  getFlags(workspaceId: string): TenantFeatureFlags {
    if (!this.tenantFlags.has(workspaceId)) {
      return { ...DEFAULT_FLAGS };
    }
    return { ...DEFAULT_FLAGS, ...this.tenantFlags.get(workspaceId)! };
  }

  isFeatureEnabled(workspaceId: string, feature: keyof Omit<TenantFeatureFlags, 'maxBrandsAllowed'>): boolean {
    const flags = this.getFlags(workspaceId);
    return Boolean(flags[feature]);
  }

  setFlags(workspaceId: string, flags: Partial<TenantFeatureFlags>): TenantFeatureFlags {
    const current = this.getFlags(workspaceId);
    const updated = { ...current, ...flags };
    this.tenantFlags.set(workspaceId, updated);
    return updated;
  }

  /**
   * Emergency Rollback of all Instagram Pilot feature flags for a given workspace
   */
  rollbackPilot(workspaceId: string): TenantFeatureFlags {
    return this.setFlags(workspaceId, {
      instagramOfficialPilot: false,
      instagramMetricsSync: false,
      instagramInboxWebhook: false,
      instagramPublishing: false,
      instagramCommunityReply: false,
    });
  }
}

export const tenantFeatureFlags = new TenantFeatureFlagService();
