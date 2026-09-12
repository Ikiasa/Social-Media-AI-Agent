import { EnvironmentType } from './env';

export interface KeyRotationSchedule {
  keyName: string;
  rotationFrequencyDays: number;
  lastRotatedAt: string;
  nextRotationDueAt: string;
  activeKeyVersion: string;
  previousKeyVersionFallbackSupported: boolean;
}

export interface SecurityPolicyConfig {
  corsAllowedOrigins: string[];
  cspDirectives: Record<string, string[]>;
  cookieSettings: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAgeMs: number;
  };
  rateLimiting: {
    maxRequestsPerWindow: number;
    windowMs: number;
  };
  keyRotationPlan: KeyRotationSchedule[];
}

export function getSecurityPolicy(env: EnvironmentType): SecurityPolicyConfig {
  const isProd = env === 'production';
  const isStaging = env === 'staging';

  return {
    corsAllowedOrigins: isProd
      ? ['https://app.riona.ai', 'https://admin.riona.ai']
      : isStaging
      ? ['https://app-staging.riona.ai']
      : ['http://localhost:3000', 'http://localhost:3001'],
    cspDirectives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https://cdn.riona.ai'],
      'connect-src': ["'self'", isProd ? 'https://api.riona.ai' : 'https://api-staging.riona.ai'],
      'frame-ancestors': ["'none'"],
    },
    cookieSettings: {
      httpOnly: true,
      secure: isProd || isStaging,
      sameSite: 'strict',
      maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
    },
    rateLimiting: {
      maxRequestsPerWindow: isProd ? 100 : 300,
      windowMs: 15 * 60 * 1000, // 15 minutes
    },
    keyRotationPlan: [
      {
        keyName: 'HMAC_APPROVAL_SECRET',
        rotationFrequencyDays: 90,
        lastRotatedAt: '2026-09-01T00:00:00Z',
        nextRotationDueAt: '2026-12-01T00:00:00Z',
        activeKeyVersion: 'v1',
        previousKeyVersionFallbackSupported: true,
      },
      {
        keyName: 'WEBHOOK_SECRET',
        rotationFrequencyDays: 60,
        lastRotatedAt: '2026-09-01T00:00:00Z',
        nextRotationDueAt: '2026-11-01T00:00:00Z',
        activeKeyVersion: 'v1',
        previousKeyVersionFallbackSupported: true,
      },
      {
        keyName: 'OAUTH_CLIENT_SECRET',
        rotationFrequencyDays: 180,
        lastRotatedAt: '2026-09-01T00:00:00Z',
        nextRotationDueAt: '2027-03-01T00:00:00Z',
        activeKeyVersion: 'v1',
        previousKeyVersionFallbackSupported: false,
      },
      {
        keyName: 'SIGNED_URL_SECRET',
        rotationFrequencyDays: 30,
        lastRotatedAt: '2026-09-01T00:00:00Z',
        nextRotationDueAt: '2026-10-01T00:00:00Z',
        activeKeyVersion: 'v1',
        previousKeyVersionFallbackSupported: true,
      },
    ],
  };
}

export function sanitizeErrorForResponse(err: unknown, env: EnvironmentType): { code: string; message: string } {
  const isProd = env === 'production';
  if (err instanceof Error) {
    if (isProd) {
      // Return safe error codes without raw stack traces or internal implementation details
      const safeCodeMap: Record<string, string> = {
        ValidationError: 'INVALID_INPUT',
        AuthorizationError: 'UNAUTHORIZED_ACCESS',
        NotFoundError: 'RESOURCE_NOT_FOUND',
      };
      const code = safeCodeMap[err.name] || 'INTERNAL_SERVER_ERROR';
      return {
        code,
        message: code === 'INTERNAL_SERVER_ERROR' ? 'An unexpected system error occurred.' : err.message,
      };
    }
    return { code: err.name || 'ERROR', message: err.message };
  }
  return { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred.' };
}
