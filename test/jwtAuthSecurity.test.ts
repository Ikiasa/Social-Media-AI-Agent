import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signJwt, verifyJwt } from '../packages/core/src/crypto';
import { productionAuthMiddleware } from '../services/api/src/middleware/productionAuth';
import { AuthenticationError } from '../packages/core/src/errors';

describe('Cryptographic JWT & Production Security Controls', () => {
  const secret = 'my_test_jwt_secret_key_32bytes!!';

  it('should sign and verify valid JWT tokens', () => {
    const token = signJwt(
      { sub: 'user-101', workspaceId: 'ws-101', role: 'OWNER', email: 'owner@example.com' },
      secret
    );

    const payload = verifyJwt(token, secret);
    expect(payload.sub).toBe('user-101');
    expect(payload.workspaceId).toBe('ws-101');
    expect(payload.role).toBe('OWNER');
    expect(payload.type).toBe('access');
  });

  it('should reject forged JWT tokens with modified payloads or signatures', () => {
    const validToken = signJwt({ sub: 'user-101', workspaceId: 'ws-101', role: 'MEMBER' }, secret);
    const parts = validToken.split('.');
    
    // Forged payload claiming OWNER role
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'user-101', workspaceId: 'ws-101', role: 'OWNER' })).toString('base64url');
    const forgedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;

    expect(() => verifyJwt(forgedToken, secret)).toThrow('Invalid JWT signature.');
  });

  it('should reject expired JWT tokens', () => {
    const expiredToken = signJwt(
      { sub: 'user-101', workspaceId: 'ws-101', role: 'MEMBER', expiresInSeconds: -10 },
      secret
    );

    expect(() => verifyJwt(expiredToken, secret)).toThrow('JWT token has expired.');
  });

  it('should reject JWT tokens with invalid issuer or audience claims', () => {
    const invalidIssToken = signJwt({ sub: 'u1', workspaceId: 'w1', role: 'MEMBER' }, secret, 'wrong-issuer');
    expect(() => verifyJwt(invalidIssToken, secret, 'riona-api', 'riona-web')).toThrow('Invalid JWT issuer.');
  });

  describe('Production Mode Fail-Closed Behavior', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should strictly reject X-Dev-* headers in production mode', () => {
      const req: any = {
        headers: {
          'x-dev-user-id': 'dev-user-1',
          'x-dev-workspace-id': 'dev-ws-1',
          'x-dev-user-role': 'OWNER',
        },
      };
      let thrownError: any;

      productionAuthMiddleware(req, {} as any, (err?: any) => {
        thrownError = err;
      });

      expect(thrownError).toBeInstanceOf(AuthenticationError);
      expect(thrownError.message).toContain('Development headers are strictly disabled in production mode');
    });
  });
});
