import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  AIError,
  DatabaseError,
  PlatformError,
  KnowledgeError,
  NotImplementedError,
} from '../packages/core/src/errors';

describe('Error Hierarchy', () => {
  it('should create ValidationError with 400 status code', () => {
    const err = new ValidationError('Invalid payload');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Invalid payload');
  });

  it('should create AuthenticationError with 401 status code', () => {
    const err = new AuthenticationError('Unauthorized access');
    expect(err.code).toBe('AUTHENTICATION_ERROR');
    expect(err.statusCode).toBe(401);
  });

  it('should create AuthorizationError with 403 status code', () => {
    const err = new AuthorizationError('Forbidden resource');
    expect(err.code).toBe('AUTHORIZATION_ERROR');
    expect(err.statusCode).toBe(403);
  });

  it('should create AIError with 502 status code', () => {
    const err = new AIError('Model timeout');
    expect(err.code).toBe('AI_ERROR');
    expect(err.statusCode).toBe(502);
  });

  it('should create DatabaseError with 500 status code', () => {
    const err = new DatabaseError('Connection failed');
    expect(err.code).toBe('DATABASE_ERROR');
    expect(err.statusCode).toBe(500);
  });

  it('should create PlatformError with 502 status code', () => {
    const err = new PlatformError('API rate limit');
    expect(err.code).toBe('PLATFORM_ERROR');
    expect(err.statusCode).toBe(502);
  });

  it('should create KnowledgeError with 422 status code', () => {
    const err = new KnowledgeError('Parsing failed');
    expect(err.code).toBe('KNOWLEDGE_ERROR');
    expect(err.statusCode).toBe(422);
  });

  it('should create NotImplementedError with 501 status code', () => {
    const err = new NotImplementedError('Feature pending');
    expect(err.code).toBe('NOT_IMPLEMENTED_ERROR');
    expect(err.statusCode).toBe(501);
  });
});
