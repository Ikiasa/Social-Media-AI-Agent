import { Response, NextFunction } from 'express';
import { ProductionAuthRequest } from './productionAuth';
import { AuthorizationError } from '../../../../packages/core/src/errors';

export function requireRole(allowedRoles: Array<'OWNER' | 'ADMIN' | 'MEMBER'>) {
  return (req: ProductionAuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthorizationError('Authenticated user required for role check.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AuthorizationError(`User role '${req.user.role}' is not authorized to perform this operation. Required: ${allowedRoles.join(', ')}`)
      );
    }

    next();
  };
}
