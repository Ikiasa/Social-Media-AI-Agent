import crypto from 'crypto';
import { generateHmacSignature, timingSafeCompare } from '../../../../packages/core/src/crypto';
import { AuthenticationError } from '../../../../packages/core/src/errors';
import { OAuthNonceModel } from '../../../../packages/database/src/models/OAuthNonce';

export interface OAuthStateResult {
  workspaceId: string;
  brandId?: string;
  userId: string;
}

export interface OAuthStateStore {
  createNonce(userId: string, workspaceId: string, brandId?: string): Promise<{ state: string; nonce: string }>;
  consumeAndValidateState(encodedState: string, initiatingUserId?: string): Promise<OAuthStateResult>;
}

export class InMemoryOAuthStateStore implements OAuthStateStore {
  private nonces: Map<string, { nonce: string; userId: string; workspaceId: string; brandId?: string; expiresAt: number }> = new Map();
  private readonly ttlMs = 10 * 60 * 1000;

  async createNonce(userId: string, workspaceId: string, brandId?: string): Promise<{ state: string; nonce: string }> {
    const nonce = crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const expiresAt = now + this.ttlMs;

    this.nonces.set(nonce, { nonce, userId, workspaceId, brandId, expiresAt });

    const rawState = JSON.stringify({ nonce, userId, workspaceId, brandId, expiresAt });
    const signature = generateHmacSignature(rawState);
    const state = Buffer.from(JSON.stringify({ rawState, signature })).toString('base64');

    return { state, nonce };
  }

  async consumeAndValidateState(encodedState: string, initiatingUserId?: string): Promise<OAuthStateResult> {
    if (!encodedState || typeof encodedState !== 'string') {
      throw new AuthenticationError('Missing OAuth state parameter.');
    }

    let parsed: any;
    try {
      const decoded = Buffer.from(encodedState, 'base64').toString('utf8');
      parsed = JSON.parse(decoded);
    } catch (_e) {
      throw new AuthenticationError('Invalid OAuth state base64 encoding.');
    }

    const { rawState, signature } = parsed;
    if (!rawState || !signature) {
      throw new AuthenticationError('Malformed OAuth state structure.');
    }

    const expectedSignature = generateHmacSignature(rawState);
    if (!timingSafeCompare(signature, expectedSignature)) {
      throw new AuthenticationError('OAuth state HMAC signature mismatch. State has been tampered with.');
    }

    const payload = JSON.parse(rawState);

    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      throw new AuthenticationError('OAuth state parameter has expired.');
    }

    const record = this.nonces.get(payload.nonce);
    if (!record) {
      throw new AuthenticationError('OAuth state nonce has already been consumed or is invalid (Replay attack prevented).');
    }

    this.nonces.delete(payload.nonce);

    if (initiatingUserId && payload.userId !== initiatingUserId) {
      throw new AuthenticationError(`OAuth state initiating user mismatch. Expected '${initiatingUserId}', got '${payload.userId}'`);
    }

    return {
      workspaceId: payload.workspaceId,
      brandId: payload.brandId,
      userId: payload.userId,
    };
  }

  clearAll(): void {
    this.nonces.clear();
  }
}

export class DatabaseOAuthStateStore implements OAuthStateStore {
  private readonly ttlMs = 10 * 60 * 1000;

  async createNonce(userId: string, workspaceId: string, brandId?: string): Promise<{ state: string; nonce: string }> {
    const nonce = crypto.randomBytes(24).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMs);

    await OAuthNonceModel.create({
      nonce,
      userId,
      workspaceId,
      brandId,
      expiresAt,
    });

    const rawState = JSON.stringify({ nonce, userId, workspaceId, brandId, expiresAt: expiresAt.getTime() });
    const signature = generateHmacSignature(rawState);
    const state = Buffer.from(JSON.stringify({ rawState, signature })).toString('base64');

    return { state, nonce };
  }

  async consumeAndValidateState(encodedState: string, initiatingUserId?: string): Promise<OAuthStateResult> {
    if (!encodedState || typeof encodedState !== 'string') {
      throw new AuthenticationError('Missing OAuth state parameter.');
    }

    let parsed: any;
    try {
      const decoded = Buffer.from(encodedState, 'base64').toString('utf8');
      parsed = JSON.parse(decoded);
    } catch (_e) {
      throw new AuthenticationError('Invalid OAuth state base64 encoding.');
    }

    const { rawState, signature } = parsed;
    if (!rawState || !signature) {
      throw new AuthenticationError('Malformed OAuth state structure.');
    }

    const expectedSignature = generateHmacSignature(rawState);
    if (!timingSafeCompare(signature, expectedSignature)) {
      throw new AuthenticationError('OAuth state HMAC signature mismatch. State has been tampered with.');
    }

    const payload = JSON.parse(rawState);

    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      throw new AuthenticationError('OAuth state parameter has expired.');
    }

    // Atomic single-use consumption from database
    const nonceRecord = await OAuthNonceModel.findOneAndDelete({ nonce: payload.nonce }).exec();
    if (!nonceRecord) {
      throw new AuthenticationError('OAuth state nonce has already been consumed or is invalid (Replay attack prevented).');
    }

    if (initiatingUserId && payload.userId !== initiatingUserId) {
      throw new AuthenticationError(`OAuth state initiating user mismatch. Expected '${initiatingUserId}', got '${payload.userId}'`);
    }

    return {
      workspaceId: payload.workspaceId,
      brandId: payload.brandId,
      userId: payload.userId,
    };
  }
}

// Factory function resolving store instance
export function getOAuthStateStore(): OAuthStateStore {
  if (process.env.NODE_ENV === 'test' || !process.env.MONGODB_URI) {
    return new InMemoryOAuthStateStore();
  }
  return new DatabaseOAuthStateStore();
}
