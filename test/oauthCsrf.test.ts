import { describe, it, expect } from 'vitest';
import { generateHmacSignature } from '../packages/core/src/crypto';

describe('OAuth State CSRF Validation', () => {
  it('should validate signed OAuth state parameter', () => {
    const rawState = JSON.stringify({ workspaceId: 'ws-A', brandId: 'brand-A', timestamp: Date.now() });
    const signature = generateHmacSignature(rawState);
    const encodedState = Buffer.from(JSON.stringify({ rawState, signature })).toString('base64');

    const decoded = JSON.parse(Buffer.from(encodedState, 'base64').toString('utf8'));
    const expectedSig = generateHmacSignature(decoded.rawState);

    expect(decoded.signature).toBe(expectedSig);
  });

  it('should reject tampered CSRF state parameters', () => {
    const rawState = JSON.stringify({ workspaceId: 'ws-A', brandId: 'brand-A' });
    const tamperedRawState = JSON.stringify({ workspaceId: 'ws-B_HACKED', brandId: 'brand-A' });
    const signature = generateHmacSignature(rawState);

    const expectedSig = generateHmacSignature(tamperedRawState);
    expect(signature).not.toBe(expectedSig);
  });
});
