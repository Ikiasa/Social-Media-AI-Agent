import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../../packages/core/src/errors';
import { defaultLogger } from '../../../../packages/core/src/logger';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    defaultLogger.warn(`API Error [${err.code}]: ${err.message}`, { statusCode: err.statusCode });
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  defaultLogger.error(`Unhandled API Error: ${message}`, { error: err });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred.',
    },
  });
}
