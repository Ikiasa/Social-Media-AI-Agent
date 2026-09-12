import { describe, it, expect, beforeEach } from 'vitest';
import { OAuthNonceStore } from '../services/api/src/services/OAuthNonceStore';
import { AuthenticationError } from '../packages/core/src/errors';

describe('OAuth State Single-Use Replay Protection & Timing-Safe Checks', () => {
  let store: OAuthNonceStore;

  beforeEach(() => {
    store = OAuthNonceStore.getInstance();
    store.clearAllNonces();
  });

  it('should generate valid state and allow successful single-use validation', () => {
    const { state } = store.createNonce('user-1', 'ws-1', 'brand-1');
    const validated = store.consumeAndValidateState(state, 'user-1');

    expect(validated.workspaceId).toBe('ws-1');
    expect(validated.brandId).toBe('brand-1');
    expect(validated.userId).toBe('user-1');
  });

  it('should reject replay attacks when the same state parameter is reused twice', () => {
    const { state } = store.createNonce('user-1', 'ws-1');

    // First use: success
    store.consumeAndValidateState(state, 'user-1');

    // Second use: REPLAY ATTACK - Must throw AuthenticationError
    expect(() => store.consumeAndValidateState(state, 'user-1')).toThrow(AuthenticationError);
  });

  it('should reject state parameter if initiating userId mismatches session', () => {
    const { state } = store.createNonce('user-1', 'ws-1');
    expect(() => store.consumeAndValidateState(state, 'attacker-user-2')).toThrow('initiating user mismatch');
  });

  it('should reject tampered state parameter with invalid HMAC signature', () => {
    const { state } = store.createNonce('user-1', 'ws-1');
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    
    // Tamper rawState to change workspaceId to ws-HACKED
    decoded.rawState = JSON.stringify({ nonce: 'fake', userId: 'user-1', workspaceId: 'ws-HACKED' });
    const tamperedState = Buffer.from(JSON.stringify(decoded)).toString('base64');

    expect(() => store.consumeAndValidateState(tamperedState, 'user-1')).toThrow('HMAC signature mismatch');
  });
});
