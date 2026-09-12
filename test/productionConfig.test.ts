import { describe, it, expect } from 'vitest';
import { validateProductionConfig } from '../packages/core/src/configValidator';
import { ValidationError } from '../packages/core/src/errors';

describe('Production Configuration Startup Validator Tests', () => {
  it('should pass in development mode with fallback defaults', () => {
    const config = validateProductionConfig({ NODE_ENV: 'development' });
    expect(config.isProduction).toBe(false);
    expect(config.jwtSecret).toBeDefined();
    expect(config.encryptionSecret).toBeDefined();
  });

  it('should throw ValidationError in production mode if JWT_SECRET is missing or under 32 chars', () => {
    expect(() =>
      validateProductionConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'short_secret',
        ENCRYPTION_SECRET: 'valid_encryption_secret_min_32_characters_long',
        MONGODB_URI: 'mongodb://localhost:27017/riona_prod',
      })
    ).toThrow(ValidationError);
  });

  it('should throw ValidationError in production mode if ENCRYPTION_SECRET is weak or default', () => {
    expect(() =>
      validateProductionConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'valid_jwt_secret_min_32_characters_long_for_test',
        ENCRYPTION_SECRET: 'dev_secret_weak_12345678901234567890',
        MONGODB_URI: 'mongodb://localhost:27017/riona_prod',
      })
    ).toThrow(ValidationError);
  });

  it('should pass in production mode when all required secrets are strong and valid', () => {
    const config = validateProductionConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'prod_strong_jwt_secret_min_32_characters_long_key_1',
      ENCRYPTION_SECRET: 'prod_strong_encryption_secret_min_32_chars_key_2',
      MONGODB_URI: 'mongodb://localhost:27017/riona_prod',
    });

    expect(config.isProduction).toBe(true);
    expect(config.jwtSecret).toBe('prod_strong_jwt_secret_min_32_characters_long_key_1');
    expect(config.encryptionSecret).toBe('prod_strong_encryption_secret_min_32_chars_key_2');
  });
});
