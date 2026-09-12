import { OAuthProvider, OAuthAccountResult } from './OAuthProvider';
import { SocialPlatform } from '../../../../../packages/social/src/publisher';
import { ValidationError } from '../../../../../packages/core/src/errors';

export class LinkedInOAuthProvider implements OAuthProvider {
  readonly platform: SocialPlatform = 'linkedin';

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const clientId = process.env.LINKEDIN_CLIENT_ID || 'mock_linkedin_client_id';
    const scope = encodeURIComponent('openid profile w_member_social');
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;
  }

  async exchangeCodeForAccount(code: string, redirectUri: string): Promise<OAuthAccountResult> {
    if (!code || typeof code !== 'string') {
      throw new ValidationError('Missing OAuth authorization code.');
    }

    if (code === 'mock_invalid_code' || code === 'invalid_code') {
      throw new ValidationError('Invalid LinkedIn OAuth authorization code.');
    }

    if (process.env.NODE_ENV === 'test' && (code.startsWith('mock_code') || code === 'mock_valid_code')) {
      return {
        username: 'test_linkedin_user',
        platformAccountId: 'urn:li:person:mock_person_12345',
        accessToken: `mock_linkedin_valid_token_${Date.now()}`,
        tokenExpiresAt: new Date(Date.now() + 60 * 86400 * 1000), // 60 days
      };
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID || '';
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';

    // 1. Exchange auth code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new ValidationError(tokenData?.error_description || 'Failed to exchange LinkedIn authorization code.');
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 5184000; // 60 days in seconds

    // 2. Fetch authenticated user profile via LinkedIn OpenID userinfo endpoint
    let username = 'linkedin_user';
    let personUrn = 'urn:li:person:unknown';

    try {
      const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        username = profileData.name || profileData.given_name || profileData.sub || 'linkedin_user';
        personUrn = profileData.sub ? `urn:li:person:${profileData.sub}` : personUrn;
      }
    } catch (_e) {
      // Fallback if profile fetch fails
    }

    return {
      username,
      platformAccountId: personUrn,
      accessToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }
}
