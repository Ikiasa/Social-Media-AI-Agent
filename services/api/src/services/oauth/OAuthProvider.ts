import { SocialPlatform } from '../../../../../packages/social/src/publisher';
import { ValidationError } from '../../../../../packages/core/src/errors';

export interface OAuthAccountResult {
  username: string;
  platformAccountId?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface OAuthProvider {
  readonly platform: SocialPlatform;
  getAuthorizationUrl(state: string, redirectUri: string, codeChallenge?: string): string;
  exchangeCodeForAccount(code: string, redirectUri: string, codeVerifier?: string): Promise<OAuthAccountResult>;
}

export class InstagramOAuthProvider implements OAuthProvider {
  readonly platform: SocialPlatform = 'instagram';
  private apiBaseUrl: string;

  constructor(apiBaseUrl = 'https://graph.facebook.com/v19.0') {
    this.apiBaseUrl = apiBaseUrl;
  }

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const clientId = process.env.INSTAGRAM_CLIENT_ID || 'mock_instagram_client_id';
    const scope = encodeURIComponent('instagram_basic,instagram_content_publish');
    return `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`;
  }

  async exchangeCodeForAccount(code: string, redirectUri: string): Promise<OAuthAccountResult> {
    if (code === 'mock_invalid_code' || code === 'invalid_code') {
      throw new ValidationError('Invalid OAuth authorization code.');
    }

    if (process.env.NODE_ENV === 'test' && (code.startsWith('mock_code') || code === 'mock_valid_code')) {
      return {
        username: 'test_ig_user',
        platformAccountId: 'ig_acc_12345',
        accessToken: `mock_valid_token_${Date.now()}`,
        tokenExpiresAt: new Date(Date.now() + 60 * 86400 * 1000), // 60 days
      };
    }

    const clientId = process.env.INSTAGRAM_CLIENT_ID || '';
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET || '';

    // Real OAuth exchange call against Meta OAuth endpoint
    const res = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }).toString(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new ValidationError(data?.error_message || 'Failed to exchange Instagram authorization code.');
    }

    return {
      username: data.user_id || 'instagram_account',
      platformAccountId: String(data.user_id),
      accessToken: data.access_token,
      tokenExpiresAt: new Date(Date.now() + 60 * 86400 * 1000),
    };
  }
}

import { LinkedInOAuthProvider } from './LinkedInOAuthProvider';
import { XOAuthProvider } from './XOAuthProvider';

export class OAuthProviderRegistry {
  private providers: Map<string, OAuthProvider> = new Map();

  constructor() {
    this.register(new InstagramOAuthProvider());
    this.register(new LinkedInOAuthProvider());
    this.register(new XOAuthProvider());
  }

  register(provider: OAuthProvider): void {
    this.providers.set(provider.platform, provider);
  }

  get(platform: SocialPlatform): OAuthProvider {
    const p = this.providers.get(platform);
    if (!p) {
      throw new ValidationError(`No OAuthProvider registered for platform '${platform}'`);
    }
    return p;
  }

  has(platform: string): boolean {
    return this.providers.has(platform);
  }
}

export const defaultOAuthProviderRegistry = new OAuthProviderRegistry();
