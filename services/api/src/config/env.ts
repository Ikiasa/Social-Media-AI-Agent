export type EnvironmentType = 'development' | 'test' | 'staging' | 'production';

export interface AppConfig {
  env: EnvironmentType;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  storageBucket: string;
  oauthCallbackUrl: string;
  webhookBaseUrl: string;
  webhookSecret: string;
  hmacApprovalSecret: string;
  jwtSecret: string;
  signedUrlSecret: string;
}

export function validateEnvironment(): AppConfig {
  const env = (process.env.NODE_ENV as EnvironmentType) || 'development';
  const allowedEnvs: EnvironmentType[] = ['development', 'test', 'staging', 'production'];

  if (!allowedEnvs.includes(env)) {
    throw new Error(`Invalid NODE_ENV: "${env}". Must be one of: ${allowedEnvs.join(', ')}`);
  }

  const isProdOrStaging = env === 'production' || env === 'staging';

  // Environment variable validation with defaults for dev/test
  const config: AppConfig = {
    env,
    port: parseInt(process.env.PORT || '3001', 10),
    databaseUrl: process.env.DATABASE_URL || (isProdOrStaging ? '' : 'mongodb://localhost:27017/riona_dev'),
    redisUrl: process.env.REDIS_URL || (isProdOrStaging ? '' : 'redis://localhost:6379'),
    storageBucket: process.env.STORAGE_BUCKET || `riona-${env}-assets`,
    oauthCallbackUrl: process.env.OAUTH_CALLBACK_URL || `https://api-${env}.riona.ai/api/v1/oauth/callback`,
    webhookBaseUrl: process.env.WEBHOOK_BASE_URL || `https://api-${env}.riona.ai/api/v1/social-data/webhooks`,
    webhookSecret: process.env.WEBHOOK_SECRET || (isProdOrStaging ? '' : 'dev_webhook_secret_key_123'),
    hmacApprovalSecret: process.env.HMAC_APPROVAL_SECRET || (isProdOrStaging ? '' : 'dev_hmac_approval_secret_456'),
    jwtSecret: process.env.JWT_SECRET || (isProdOrStaging ? '' : 'dev_jwt_secret_key_789'),
    signedUrlSecret: process.env.SIGNED_URL_SECRET || (isProdOrStaging ? '' : 'dev_signed_url_secret_012'),
  };

  // Enforce mandatory secrets and isolated URLs in staging and production
  if (isProdOrStaging) {
    const missing: string[] = [];
    if (!config.databaseUrl) missing.push('DATABASE_URL');
    if (!config.redisUrl) missing.push('REDIS_URL');
    if (!config.webhookSecret) missing.push('WEBHOOK_SECRET');
    if (!config.hmacApprovalSecret) missing.push('HMAC_APPROVAL_SECRET');
    if (!config.jwtSecret) missing.push('JWT_SECRET');
    if (!config.signedUrlSecret) missing.push('SIGNED_URL_SECRET');

    if (missing.length > 0) {
      throw new Error(`[CRITICAL] Missing required environment secrets for ${env}: ${missing.join(', ')}`);
    }

    // Verify isolated endpoints for staging vs production
    if (env === 'production') {
      if (config.databaseUrl.includes('staging') || config.databaseUrl.includes('dev')) {
        throw new Error('[CRITICAL] Production DATABASE_URL must not connect to staging or dev databases.');
      }
      if (config.redisUrl.includes('staging') || config.redisUrl.includes('dev')) {
        throw new Error('[CRITICAL] Production REDIS_URL must not connect to staging or dev Redis instances.');
      }
      if (config.storageBucket.includes('staging')) {
        throw new Error('[CRITICAL] Production STORAGE_BUCKET must be isolated from staging buckets.');
      }
    }
  }

  return config;
}

export const currentConfig = validateEnvironment();
