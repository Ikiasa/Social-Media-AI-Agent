import { ValidationError } from './errors';

export interface ProductionConfig {
  nodeEnv: string;
  port: number;
  jwtSecret: string;
  encryptionSecret: string;
  mongodbUri: string;
  isProduction: boolean;
}

const WEAK_SECRETS = ['dev_secret', 'change_me', 'secret', '123456', 'password', 'default_secret'];

export function validateProductionConfig(env: Record<string, string | undefined> = process.env): ProductionConfig {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const port = Number(env.PORT) || 3000;
  const jwtSecret = env.JWT_SECRET || (isProduction ? '' : 'dev_jwt_secret_min_32_characters_long_for_test');
  const encryptionSecret = env.ENCRYPTION_SECRET || (isProduction ? '' : 'dev_encryption_secret_min_32_chars_long_for_test');
  const mongodbUri = env.MONGODB_URI || 'mongodb://localhost:27017/riona_db';

  if (isProduction) {
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new ValidationError('Production configuration error: JWT_SECRET must be defined and at least 32 characters long.');
    }
    if (WEAK_SECRETS.some((weak) => jwtSecret.toLowerCase().startsWith(weak) || jwtSecret.toLowerCase() === weak)) {
      throw new ValidationError('Production configuration error: JWT_SECRET uses a weak or default value.');
    }

    if (!encryptionSecret || encryptionSecret.length < 32) {
      throw new ValidationError('Production configuration error: ENCRYPTION_SECRET must be defined and at least 32 characters long.');
    }
    if (WEAK_SECRETS.some((weak) => encryptionSecret.toLowerCase().startsWith(weak) || encryptionSecret.toLowerCase() === weak)) {
      throw new ValidationError('Production configuration error: ENCRYPTION_SECRET uses a weak or default value.');
    }

    if (!env.MONGODB_URI) {
      throw new ValidationError('Production configuration error: MONGODB_URI environment variable is required in production.');
    }
  }

  return {
    nodeEnv,
    port,
    jwtSecret,
    encryptionSecret,
    mongodbUri,
    isProduction,
  };
}
