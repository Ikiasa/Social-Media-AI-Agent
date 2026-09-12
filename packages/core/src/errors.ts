/**
 * Domain Error Model Hierarchy
 */

export abstract class AppError extends Error {
  public abstract readonly code: string;
  public readonly statusCode: number;
  public readonly cause?: Error;

  constructor(message: string, statusCode: number = 500, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  public readonly code = 'VALIDATION_ERROR';
  constructor(message: string, cause?: Error) {
    super(message, 400, cause);
  }
}

export class AuthenticationError extends AppError {
  public readonly code = 'AUTHENTICATION_ERROR';
  constructor(message: string, cause?: Error) {
    super(message, 401, cause);
  }
}

export class AuthorizationError extends AppError {
  public readonly code = 'AUTHORIZATION_ERROR';
  constructor(message: string, cause?: Error) {
    super(message, 403, cause);
  }
}

export class AIError extends AppError {
  public readonly code = 'AI_ERROR';
  constructor(message: string, cause?: Error) {
    super(message, 502, cause);
  }
}

export class DatabaseError extends AppError {
  public readonly code = 'DATABASE_ERROR';
  constructor(message: string, cause?: Error) {
    super(message, 500, cause);
  }
}

export class PlatformError extends AppError {
  public readonly code = 'PLATFORM_ERROR';
  constructor(message: string, cause?: Error) {
    super(message, 502, cause);
  }
}

export class KnowledgeError extends AppError {
  public readonly code = 'KNOWLEDGE_ERROR';
  constructor(message: string, cause?: Error) {
    super(message, 422, cause);
  }
}

export class NotImplementedError extends AppError {
  public readonly code = 'NOT_IMPLEMENTED_ERROR';
  constructor(message: string = 'Feature not implemented yet.') {
    super(message, 501);
  }
}
