import crypto from 'crypto';
import { generateHmacSignature, timingSafeCompare } from '../../../../packages/core/src/crypto';
import { AuthenticationError } from '../../../../packages/core/src/errors';

export interface OAuthNonceRecord {
  nonce: string;
  userId: string;
  workspaceId: string;
  brandId?: string;
  createdAt: number;
  expiresAt: number;
}

export class OAuthNonceStore {
  private static instance: OAuthNonceStore;
  private nonces: Map<string, OAuthNonceRecord> = new Map();
  private readonly ttlMs = 10 * 60 * 1000; // 10 minutes TTL

  private constructor() {}

  public static getInstance(): OAuthNonceStore {
    if (!OAuthNonceStore.instance) {
      OAuthNonceStore.instance = new OAuthNonceStore();
    }
    return OAuthNonceStore.instance;
  }

  public createNonce(userId: string, workspaceId: string, brandId?: string): { state: string; nonce: string } {
    const nonce = crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const expiresAt = now + this.ttlMs;

    const record: OAuthNonceRecord = {
      nonce,
      userId,
      workspaceId,
      brandId,
      createdAt: now,
      expiresAt,
    };

    this.nonces.set(nonce, record);

    const rawState = JSON.stringify({ nonce, userId, workspaceId, brandId, expiresAt });
    const signature = generateHmacSignature(rawState);
    const state = Buffer.from(JSON.stringify({ rawState, signature })).toString('base64');

    return { state, nonce };
  }

  public consumeAndValidateState(
    encodedState: string,
    initiatingUserId?: string
  ): { workspaceId: string; brandId?: string; userId: string } {
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

    // 1. Timing-safe HMAC signature verification
    const expectedSignature = generateHmacSignature(rawState);
    if (!timingSafeCompare(signature, expectedSignature)) {
      throw new AuthenticationError('OAuth state HMAC signature mismatch. State has been tampered with.');
    }

    const payload = JSON.parse(rawState);

    // 2. Check Expiration
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      throw new AuthenticationError('OAuth state parameter has expired.');
    }

    // 3. Check Single-Use Replay Protection
    const record = this.nonces.get(payload.nonce);
    if (!record) {
      throw new AuthenticationError('OAuth state nonce has already been consumed or is invalid (Replay attack prevented).');
    }

    // Immediately consume/delete nonce
    this.nonces.delete(payload.nonce);

    // 4. Session/User Binding Check
    if (initiatingUserId && payload.userId !== initiatingUserId) {
      throw new AuthenticationError(`OAuth state initiating user mismatch. Expected '${initiatingUserId}', got '${payload.userId}'`);
    }

    return {
      workspaceId: payload.workspaceId,
      brandId: payload.brandId,
      userId: payload.userId,
    };
  }

  public clearAllNonces(): void {
    this.nonces.clear();
  }
}
