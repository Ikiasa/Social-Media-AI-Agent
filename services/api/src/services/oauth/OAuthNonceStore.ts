import Redis from 'ioredis';
import { currentConfig } from '../../config/env';

const OAUTH_NONCE_PREFIX = 'riona:oauth:nonce:';

export interface OAuthNonceStore {
  /**
   * Atomically marks a nonce as redeemed. Returns false when it has already
   * been redeemed by this or another application instance.
   */
  consume(nonce: string, ttlMs: number): Promise<boolean>;
  resetForTests?(): Promise<void>;
}

export class InMemoryOAuthNonceStore implements OAuthNonceStore {
  private readonly nonces = new Map<string, number>();

  async consume(nonce: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const expiresAt = this.nonces.get(nonce);
    if (expiresAt && expiresAt > now) return false;

    this.nonces.set(nonce, now + ttlMs);
    return true;
  }

  async resetForTests(): Promise<void> {
    this.nonces.clear();
  }
}

export class RedisOAuthNonceStore implements OAuthNonceStore {
  private readonly client: Redis;

  constructor(redisUrl = currentConfig.redisUrl) {
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  async consume(nonce: string, ttlMs: number): Promise<boolean> {
    const result = await this.client.set(
      `${OAUTH_NONCE_PREFIX}${nonce}`,
      'redeemed',
      'PX',
      Math.max(1, ttlMs),
      'NX'
    );
    return result === 'OK';
  }
}

export function createOAuthNonceStore(): OAuthNonceStore {
  // Tests must not depend on external infrastructure. Staging and production
  // always use Redis, which is required by environment validation.
  return currentConfig.env === 'test'
    ? new InMemoryOAuthNonceStore()
    : new RedisOAuthNonceStore();
}
