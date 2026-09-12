import { describe, it, expect } from 'vitest';
import { XOAuthProvider } from '../services/api/src/services/oauth/XOAuthProvider';
import { defaultOAuthProviderRegistry } from '../services/api/src/services/oauth/OAuthProvider';

describe('XOAuthProvider PKCE & Identity Unit Tests', () => {
  const provider = new XOAuthProvider({ clientId: 'test_client_id' });

  it('should register XOAuthProvider in defaultOAuthProviderRegistry', () => {
    expect(defaultOAuthProviderRegistry.has('x')).toBe(true);
    const resolved = defaultOAuthProviderRegistry.get('x');
    expect(resolved.platform).toBe('x');
  });

  it('should generate PKCE S256 authorization URL with required parameters', () => {
    const { codeVerifier, codeChallenge } = provider.generatePkcePair();
    expect(codeVerifier).toBeDefined();
    expect(codeChallenge).toBeDefined();

    const url = provider.getAuthorizationUrl('state_x_123', 'http://localhost/callback', codeChallenge);

    expect(url).toContain('https://twitter.com/i/oauth2/authorize');
    expect(url).toContain('response_type=code');
    expect(url).toContain('client_id=test_client_id');
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%2Fcallback');
    expect(url).toContain('state=state_x_123');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('scope=tweet.read%20tweet.write%20users.read%20media.write%20offline.access');
  });

  it('should exchange code for OAuthAccountResult', async () => {
    const result = await provider.exchangeCodeForAccount('mock_valid_x_code', 'http://localhost/callback');

    expect(result.username).toBe('x_brand_user');
    expect(result.platformAccountId).toContain('x_user_');
    expect(result.accessToken).toBe('mock_x_access_token');
    expect(result.refreshToken).toBe('mock_x_refresh_token');
  });
});
