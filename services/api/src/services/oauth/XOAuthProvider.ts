import crypto from 'crypto';
import { OAuthProvider, OAuthAccountResult } from './OAuthProvider';
import { SocialPlatform } from '../../../../../packages/social/src/publisher';
import { ValidationError } from '../../../../../packages/core/src/errors';
import { getXConfig, XConfig } from '../../../../../platforms/x/src/XConfig';

export interface XOAuthParams extends Partial<XConfig> {
  clientId?: string;
  clientSecret?: string;
  authorizeUrl?: string;
  tokenUrl?: string;
}

export class XOAuthProvider implements OAuthProvider {
  readonly platform: SocialPlatform = 'x';
  private clientId: string;
  private clientSecret: string;
  private config: XConfig;
  private authorizeUrl: string;
  private tokenUrl: string;

  constructor(params: XOAuthParams = {}) {
    this.clientId = params.clientId || process.env.X_CLIENT_ID || 'mock_x_client_id';
    this.clientSecret = params.clientSecret || process.env.X_CLIENT_SECRET || 'mock_x_client_secret';
    this.config = getXConfig(params);
    this.authorizeUrl = params.authorizeUrl || process.env.X_AUTHORIZE_URL || 'https://twitter.com/i/oauth2/authorize';
    this.tokenUrl = params.tokenUrl || process.env.X_TOKEN_URL || `${this.config.apiBaseUrl}/2/oauth2/token`;
  }

  // Generates PKCE code_verifier and S256 code_challenge
  public generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('hex');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return { codeVerifier, codeChallenge };
  }

  getAuthorizationUrl(state: string, redirectUri: string, codeChallengeParam?: string): string {
    const challenge = codeChallengeParam || this.generatePkcePair().codeChallenge;
    const scope = encodeURIComponent('tweet.read tweet.write users.read media.write offline.access');
    return `${this.authorizeUrl}?response_type=code&client_id=${encodeURIComponent(
      this.clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(
      state
    )}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`;
  }

  async exchangeCodeForAccount(code: string, redirectUri: string, codeVerifier?: string): Promise<OAuthAccountResult> {
    if (process.env.NODE_ENV === 'test' && (code === 'mock_valid_x_code' || code.startsWith('mock_'))) {
      const mockUserId = `x_user_${Date.now()}`;
      return {
        username: 'x_brand_user',
        platformAccountId: mockUserId,
        accessToken: 'mock_x_access_token',
        refreshToken: 'mock_x_refresh_token',
        tokenExpiresAt: new Date(Date.now() + 7200 * 1000),
      };
    }

    const pkceVerifier = codeVerifier || 'mock_code_verifier';
    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const tokenRes = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        code,
        redirect_uri: redirectUri,
        code_verifier: pkceVerifier,
      }).toString(),
    });

    if (!tokenRes.ok) {
      throw new Error(`X OAuth token exchange failed with HTTP ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 7200;

    if (!accessToken) {
      throw new ValidationError('X OAuth response missing access_token.');
    }

    // Resolve authenticated X user identity via GET /2/users/me
    const userRes = await fetch(`${this.config.apiBaseUrl}/2/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userRes.ok) {
      throw new Error(`X User Info request failed with HTTP ${userRes.status}`);
    }

    const userData = await userRes.json();
    const xUser = userData.data;

    if (!xUser || !xUser.id) {
      throw new Error('X User Info response missing user ID.');
    }

    return {
      username: xUser.username || xUser.name || xUser.id,
      platformAccountId: String(xUser.id),
      accessToken,
      refreshToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }
}
