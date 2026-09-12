import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../../../../packages/core/src/errors';

export function validate(schema: ZodSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        next(new ValidationError(`Validation failed: ${issues}`));
      } else {
        next(error);
      }
    }
  };
}
