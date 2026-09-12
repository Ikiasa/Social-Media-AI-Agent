import { SocialDataConnector } from './types';
import { InstagramOfficialConnector } from './connectors/InstagramOfficialConnector';
import { TikTokOfficialConnector } from './connectors/TikTokOfficialConnector';
import { LinkedInOfficialConnector } from './connectors/LinkedInOfficialConnector';
import { XOfficialConnector } from './connectors/XOfficialConnector';
import { LicensedSocialListeningConnector } from './connectors/LicensedSocialListeningConnector';
import { UserImportConnector } from './connectors/UserImportConnector';
import { SandboxFixtureConnector } from './connectors/SandboxFixtureConnector';
import { tenantFeatureFlags } from '../TenantFeatureFlagService';

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors: Map<string, SocialDataConnector> = new Map();

  private constructor() {
    this.registerDefaultConnectors();
  }

  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  private registerDefaultConnectors(): void {
    this.registerConnector(new InstagramOfficialConnector());
    this.registerConnector(new TikTokOfficialConnector());
    this.registerConnector(new LinkedInOfficialConnector());
    this.registerConnector(new XOfficialConnector());
    this.registerConnector(new LicensedSocialListeningConnector());
    this.registerConnector(new UserImportConnector());
    this.registerConnector(new SandboxFixtureConnector());
  }

  public registerConnector(connector: SocialDataConnector): void {
    this.connectors.set(connector.provider, connector);
  }

  public getConnector(provider: string, workspaceId?: string): SocialDataConnector | undefined {
    if (workspaceId) {
      const isEnabled = tenantFeatureFlags.isFeatureEnabled(workspaceId, 'socialListeningGateway');
      if (!isEnabled) {
        throw new Error(`Social Listening Gateway feature flag is disabled for workspace ${workspaceId}.`);
      }
    }

    return this.connectors.get(provider);
  }

  public listConnectors(workspaceId?: string): SocialDataConnector[] {
    if (workspaceId) {
      const isEnabled = tenantFeatureFlags.isFeatureEnabled(workspaceId, 'socialListeningGateway');
      if (!isEnabled) {
        return [];
      }
    }
    return Array.from(this.connectors.values());
  }
}

export const connectorRegistry = ConnectorRegistry.getInstance();
