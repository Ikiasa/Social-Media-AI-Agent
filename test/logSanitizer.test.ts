import { describe, it, expect } from 'vitest';
import { sanitizeLogData } from '../packages/core/src/crypto';

describe('Log & Error Secret Leakage Sanitization', () => {
  it('should redact sensitive keys from log objects', () => {
    const rawData = {
      user: 'admin',
      accessToken: 'EAAGm0PX4123_sensitive_access_token',
      refreshToken: 'r_token_secret_123',
      clientSecret: 'my_app_secret',
      authorization: 'Bearer secret_auth_token_xyz',
      nested: {
        password: 'super_secret_password',
        safeField: 'public_value',
      },
    };

    const sanitized = sanitizeLogData(rawData);

    expect(sanitized.accessToken).toBe('[REDACTED]');
    expect(sanitized.refreshToken).toBe('[REDACTED]');
    expect(sanitized.clientSecret).toBe('[REDACTED]');
    expect(sanitized.authorization).toBe('[REDACTED]');
    expect(sanitized.nested.password).toBe('[REDACTED]');
    expect(sanitized.nested.safeField).toBe('public_value');
  });

  it('should redact Bearer and token query parameters from string log messages', () => {
    const rawMsg = 'Failed to execute Graph API request with header Authorization: Bearer secret_bearer_token_999 and query access_token=EAAG12345';
    const sanitized = sanitizeLogData(rawMsg);

    expect(sanitized).not.toContain('secret_bearer_token_999');
    expect(sanitized).not.toContain('EAAG12345');
    expect(sanitized).toContain('Bearer [REDACTED]');
    expect(sanitized).toContain('access_token=[REDACTED]');
  });
});
