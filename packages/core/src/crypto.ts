import crypto from 'crypto';

export function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: ENCRYPTION_SECRET environment variable is missing in production mode.');
  }
  return secret || 'riona_dev_fallback_secret_key_32bytes!!';
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production mode.');
  }
  return secret || 'riona_dev_fallback_jwt_secret_key_32bytes!!';
}

export function encryptToken(plaintext: string, secretKey: string = getEncryptionSecret()): string {
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptToken(encryptedHex: string, secretKey: string = getEncryptionSecret()): string {
  const parts = encryptedHex.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format. Expected iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, encryptedText] = parts;
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function generateHmacSignature(payload: string, secretKey: string = getEncryptionSecret()): string {
  return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
}

export interface CanonicalApprovalPayload {
  tenantId: string;
  brandId?: string;
  contentId: string;
  contentVersion: number;
  decision: 'APPROVED';
  reviewerId: string;
  approvedAt: string;
}

export function getHmacSecret(): string {
  const secret = process.env.HMAC_SECRET || process.env.ENCRYPTION_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: HMAC_SECRET / ENCRYPTION_SECRET environment variable is missing in production mode.');
  }
  return secret || 'riona_dev_fallback_hmac_secret_32bytes!!';
}

export function generateCanonicalApprovalHmac(
  payload: CanonicalApprovalPayload,
  secretKey: string = getHmacSecret()
): string {
  const canonicalString = JSON.stringify({
    tenantId: payload.tenantId,
    brandId: payload.brandId || '',
    contentId: payload.contentId,
    contentVersion: payload.contentVersion,
    decision: payload.decision,
    reviewerId: payload.reviewerId,
    approvedAt: payload.approvedAt,
  });
  return crypto.createHmac('sha256', secretKey).update(canonicalString).digest('hex');
}

export function verifyCanonicalApprovalHmac(
  payload: CanonicalApprovalPayload,
  signature: string,
  secretKey: string = getHmacSecret()
): boolean {
  if (!signature || typeof signature !== 'string') return false;
  const expectedSignature = generateCanonicalApprovalHmac(payload, secretKey);
  return timingSafeCompare(signature, expectedSignature);
}
export interface TokenEncryption {
  encrypt(plaintext: string, secretKey?: string): string;
  decrypt(encryptedHex: string, secretKey?: string): string;
  rotate(encryptedHex: string, oldSecretKey: string, newSecretKey: string): string;
}

export class TokenEncryptionService implements TokenEncryption {
  encrypt(plaintext: string, secretKey: string = getEncryptionSecret()): string {
    return encryptToken(plaintext, secretKey);
  }

  decrypt(encryptedHex: string, secretKey: string = getEncryptionSecret()): string {
    return decryptToken(encryptedHex, secretKey);
  }

  rotate(encryptedHex: string, oldSecretKey: string, newSecretKey: string): string {
    const plaintext = this.decrypt(encryptedHex, oldSecretKey);
    return this.encrypt(plaintext, newSecretKey);
  }
}

export const defaultTokenEncryption: TokenEncryption = new TokenEncryptionService();

export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// JWT Cryptographic Signer & Verifier
export interface JwtPayload {
  sub: string;
  workspaceId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  email?: string;
  iss?: string;
  aud?: string;
  exp?: number;
  type?: 'access';
  [key: string]: unknown;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function signJwt(
  payload: { sub: string; workspaceId: string; role: 'OWNER' | 'ADMIN' | 'MEMBER'; email?: string; expiresInSeconds?: number },
  secret: string = getJwtSecret(),
  issuer = 'riona-api',
  audience = 'riona-web'
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (payload.expiresInSeconds || 3600);

  const fullPayload: JwtPayload = {
    sub: payload.sub,
    workspaceId: payload.workspaceId,
    role: payload.role,
    email: payload.email,
    iss: issuer,
    aud: audience,
    exp,
    type: 'access',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', secret).update(signatureInput).digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwt(
  token: string,
  secret: string = getJwtSecret(),
  expectedIssuer = 'riona-api',
  expectedAudience = 'riona-web'
): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format. Expected header.payload.signature');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(signatureInput).digest('base64url');

  if (!timingSafeCompare(signature, expectedSignature)) {
    throw new Error('Invalid JWT signature.');
  }

  const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload));

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('JWT token has expired.');
  }

  if (payload.iss && payload.iss !== expectedIssuer) {
    throw new Error(`Invalid JWT issuer. Expected '${expectedIssuer}', got '${payload.iss}'`);
  }

  if (payload.aud && payload.aud !== expectedAudience) {
    throw new Error(`Invalid JWT audience. Expected '${expectedAudience}', got '${payload.aud}'`);
  }

  if (payload.type && payload.type !== 'access') {
    throw new Error(`Invalid JWT token type. Expected 'access', got '${payload.type}'`);
  }

  return payload;
}

// Log & Trace Sanitizer Utility
const SENSITIVE_KEYS = [
  'accesstoken',
  'refreshtoken',
  'clientsecret',
  'authorization',
  'bearer',
  'password',
  'sessiontoken',
  'session_token',
  'encryptedaccesstoken',
  'encryptedrefreshtoken',
  'api_key',
  'apikey',
  'secret',
];

export function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return data
      .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
      .replace(/access_token=[A-Za-z0-9._~+/-]+/gi, 'access_token=[REDACTED]')
      .replace(/client_secret=[A-Za-z0-9._~+/-]+/gi, 'client_secret=[REDACTED]');
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }

  return data;
}
