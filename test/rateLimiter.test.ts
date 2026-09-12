import { describe, it, expect } from 'vitest';
import { MemoryRateLimiter } from '../services/api/src/middleware/rateLimiter';

describe('MemoryRateLimiter Middleware Unit Tests', () => {
  it('should allow requests within max limit', () => {
    const limiter = new MemoryRateLimiter({ windowMs: 60000, maxRequests: 3, category: 'test_cat' });

    const r1 = limiter.isRateLimited('user-1');
    expect(r1.limited).toBe(false);
    expect(r1.remaining).toBe(2);

    const r2 = limiter.isRateLimited('user-1');
    expect(r2.limited).toBe(false);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.isRateLimited('user-1');
    expect(r3.limited).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('should block requests exceeding max limit and return retryAfterSeconds', () => {
    const limiter = new MemoryRateLimiter({ windowMs: 60000, maxRequests: 2, category: 'auth_cat' });

    limiter.isRateLimited('user-blocked');
    limiter.isRateLimited('user-blocked');

    const blockedRes = limiter.isRateLimited('user-blocked');
    expect(blockedRes.limited).toBe(true);
    expect(blockedRes.remaining).toBe(0);
    expect(blockedRes.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('should isolate keys across different categories and keys', () => {
    const limiterA = new MemoryRateLimiter({ windowMs: 60000, maxRequests: 1, category: 'catA' });

    expect(limiterA.isRateLimited('user-x').limited).toBe(false);
    expect(limiterA.isRateLimited('user-x').limited).toBe(true);

    // Different user key remains unblocked
    expect(limiterA.isRateLimited('user-y').limited).toBe(false);
  });
});
