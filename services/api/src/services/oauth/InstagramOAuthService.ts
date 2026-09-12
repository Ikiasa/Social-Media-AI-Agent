import crypto from 'crypto';
import { AuthorizationError, ValidationError } from '../../../../../packages/core/src/errors';
import { currentConfig, EnvironmentType } from '../../config/env';
import { createOAuthNonceStore, OAuthNonceStore } from './OAuthNonceStore';

export interface OAuthStatePayload {
  workspaceId: string;
  brandId: string;
  userId: string;
  environment: EnvironmentType;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

export class InstagramOAuthService {
  private static instance: InstagramOAuthService;
  private nonceStore: OAuthNonceStore;

  constructor(nonceStore: OAuthNonceStore = createOAuthNonceStore()) {
    this.nonceStore = nonceStore;
  }

  public static getInstance(): InstagramOAuthService {
    if (!InstagramOAuthService.instance) {
      InstagramOAuthService.instance = new InstagramOAuthService();
    }
    return InstagramOAuthService.instance;
  }

  /**
   * Generate short-lived (5-minute), signed, single-use OAuth state token
   */
  generateOAuthState(workspaceId: string, brandId: string, userId: string): { stateToken: string; nonce: string } {
    if (!workspaceId || !brandId || !userId) {
      throw new ValidationError('workspaceId, brandId, and userId are required to generate OAuth state.');
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    const payload: OAuthStatePayload = {
      workspaceId,
      brandId,
      userId,
      environment: currentConfig.env,
      nonce,
      issuedAt: now,
      expiresAt: now + 5 * 60 * 1000, // 5 minutes validity
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', currentConfig.jwtSecret)
      .update(payloadBase64)
      .digest('hex');

    const stateToken = `${payloadBase64}.${signature}`;
    return { stateToken, nonce };
  }

  /**
   * Validate state token: check signature, replay window (5-min), nonce uniqueness, environment, and workspace/user binding
   */
  async verifyOAuthState(
    stateToken: string,
    expectedWorkspaceId: string,
    expectedUserId: string
  ): Promise<OAuthStatePayload> {
    if (!stateToken || !stateToken.includes('.')) {
      throw new AuthorizationError('INVALID_OAUTH_STATE: Malformed state token.');
    }

    const [payloadBase64, signature] = stateToken.split('.');
    const expectedSignature = crypto
      .createHmac('sha256', currentConfig.jwtSecret)
      .update(payloadBase64)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);
    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      throw new AuthorizationError('INVALID_OAUTH_STATE: Signature verification failed.');
    }

    let payload: OAuthStatePayload;
    try {
      payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    } catch (_err) {
      throw new AuthorizationError('INVALID_OAUTH_STATE: Failed to parse payload.');
    }

    // 1. Expiration Check
    const now = Date.now();
    if (now > payload.expiresAt) {
      throw new AuthorizationError('EXPIRED_OAUTH_STATE: OAuth state token has expired (5-minute replay window exceeded).');
    }

    // 2. Environment Matching Check
    if (payload.environment !== currentConfig.env) {
      throw new AuthorizationError(
        `ENVIRONMENT_MISMATCH: State was generated for environment "${payload.environment}" but received in "${currentConfig.env}".`
      );
    }

    // 3. Workspace & User Binding Check
    if (payload.workspaceId !== expectedWorkspaceId || payload.userId !== expectedUserId) {
      throw new AuthorizationError('CROSS_TENANT_OAUTH_REJECTION: State token does not match active workspace or user context.');
    }

    // 4. Atomic, TTL-bound, single-use nonce redemption. Redis SET NX makes
    // this safe across multiple API instances in staging/production.
    const ttlMs = payload.expiresAt - now;
    let redeemed: boolean;
    try {
      redeemed = await this.nonceStore.consume(payload.nonce, ttlMs);
    } catch (_err) {
      throw new AuthorizationError('OAUTH_NONCE_STORE_UNAVAILABLE: OAuth callback could not be safely redeemed.');
    }

    if (!redeemed) {
      throw new AuthorizationError('REUSED_OAUTH_STATE: Single-use OAuth nonce has already been redeemed.');
    }

    return payload;
  }

  /**
   * Server-side authorization code exchange (simulated/mocked for pilot) returning encryptedCredentialRef
   */
  async exchangeCodeForCredentials(
    code: string,
    statePayload: OAuthStatePayload
  ): Promise<{ accessTokenRef: string; instagramAccountId: string; grantedScopes: string[] }> {
    if (!code) {
      throw new ValidationError('Authorization code is required.');
    }

    // Generate encrypted credential reference (never store raw access tokens)
    const rawSecretToken = `token_${code}_${Date.now()}`;
    const accessTokenRef = `enc_${crypto.createHash('sha256').update(rawSecretToken).digest('hex').substring(0, 24)}`;
    const instagramAccountId = `ig_acc_${statePayload.brandId}_${Date.now()}`;

    // Pilot granted scopes for Instagram Official API
    const grantedScopes = ['instagram_basic', 'instagram_manage_insights'];

    return {
      accessTokenRef,
      instagramAccountId,
      grantedScopes,
    };
  }

  public async resetNonces(): Promise<void> {
    await this.nonceStore.resetForTests?.();
  }
}

export const instagramOAuthService = InstagramOAuthService.getInstance();
