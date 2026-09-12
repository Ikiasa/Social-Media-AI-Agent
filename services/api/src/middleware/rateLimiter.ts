import { Request, Response, NextFunction } from 'express';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  category?: string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class MemoryRateLimiter {
  private hits: Map<string, RateLimitRecord> = new Map();
  private windowMs: number;
  private maxRequests: number;
  private category: string;

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs || 60000;
    this.maxRequests = options.maxRequests || 100;
    this.category = options.category || 'general';
  }

  isRateLimited(key: string): { limited: boolean; remaining: number; resetAt: number; retryAfterSeconds: number } {
    const now = Date.now();
    const compositeKey = `${this.category}:${key}`;
    let record = this.hits.get(compositeKey);

    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + this.windowMs };
      this.hits.set(compositeKey, record);
      return { limited: false, remaining: this.maxRequests - 1, resetAt: record.resetAt, retryAfterSeconds: 0 };
    }

    if (record.count >= this.maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      return { limited: true, remaining: 0, resetAt: record.resetAt, retryAfterSeconds };
    }

    record.count += 1;
    return { limited: false, remaining: this.maxRequests - record.count, resetAt: record.resetAt, retryAfterSeconds: 0 };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = (req.headers['x-workspace-id'] as string) || req.ip || 'anonymous';
      const result = this.isRateLimited(key);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

      if (result.limited) {
        res.setHeader('Retry-After', result.retryAfterSeconds);
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded for category '${this.category}'. Please try again in ${result.retryAfterSeconds} seconds.`,
            retryAfterSeconds: result.retryAfterSeconds,
          },
        });
        return;
      }

      next();
    };
  }

  clear(): void {
    this.hits.clear();
  }
}

export const createRateLimiter = (options: RateLimitOptions) => new MemoryRateLimiter(options);
