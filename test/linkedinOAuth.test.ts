import { describe, it, expect } from 'vitest';
import { LinkedInOAuthProvider } from '../services/api/src/services/oauth/LinkedInOAuthProvider';
import { defaultOAuthProviderRegistry } from '../services/api/src/services/oauth/OAuthProvider';
import { ValidationError } from '../packages/core/src/errors';

describe('LinkedIn OAuth Provider & Scope Validation', () => {
  const provider = new LinkedInOAuthProvider();

  it('should generate valid LinkedIn OAuth authorization URL with correct OpenID and posting scopes', () => {
    const url = provider.getAuthorizationUrl('state_test_123', 'http://localhost:3000/callback');

    expect(url).toContain('https://www.linkedin.com/oauth/v2/authorization');
    expect(url).toContain('state=state_test_123');
    expect(url).toContain('w_member_social');
    expect(url).toContain('openid');
  });

  it('should exchange code for normalized account identity in test environment', async () => {
    const result = await provider.exchangeCodeForAccount('mock_code_12345', 'http://localhost:3000/callback');

    expect(result.username).toBe('test_linkedin_user');
    expect(result.platformAccountId).toBe('urn:li:person:mock_person_12345');
    expect(result.accessToken).toBeDefined();
    expect(result.tokenExpiresAt).toBeDefined();
  });

  it('should throw ValidationError on invalid authorization code', async () => {
    await expect(provider.exchangeCodeForAccount('invalid_code', 'http://localhost:3000/callback')).rejects.toThrow(ValidationError);
  });

  it('should resolve LinkedInOAuthProvider cleanly from defaultOAuthProviderRegistry', () => {
    expect(defaultOAuthProviderRegistry.has('linkedin')).toBe(true);
    const resolved = defaultOAuthProviderRegistry.get('linkedin');
    expect(resolved.platform).toBe('linkedin');
  });
});
