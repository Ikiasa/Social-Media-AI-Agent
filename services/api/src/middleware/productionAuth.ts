import { Response, NextFunction } from 'express';
import { createWorkspaceContext, WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthenticationError } from '../../../../packages/core/src/errors';
import { verifyJwt } from '../../../../packages/core/src/crypto';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export interface ProductionAuthRequest {
  headers: Record<string, string | string[] | undefined>;
  context?: WorkspaceContext;
  user?: AuthenticatedUser;
  [key: string]: unknown;
}

export function productionAuthMiddleware(req: ProductionAuthRequest, _res: Response, next: NextFunction): void {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.AUTH_MODE === 'production';
  const authHeader = req.headers.authorization as string | undefined;
  const devUserId = req.headers['x-dev-user-id'] as string | undefined;
  const devWorkspaceId = req.headers['x-dev-workspace-id'] as string | undefined;
  const devRole = (req.headers['x-dev-user-role'] as 'OWNER' | 'ADMIN' | 'MEMBER') || 'OWNER';

  // 1. Process Bearer JWT Token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyJwt(token);
      req.user = {
        id: payload.sub,
        email: payload.email || `${payload.sub}@workspace.example.com`,
        role: payload.role || 'MEMBER',
      };
      req.context = createWorkspaceContext(payload.workspaceId, payload.sub);
      return next();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return next(new AuthenticationError(`JWT Authentication Failed: ${msg}`));
    }
  }

  // 2. Reject dev headers in production mode
  if (isProduction) {
    return next(new AuthenticationError('Development headers are strictly disabled in production mode. Valid Bearer JWT token required.'));
  }

  // 3. Development header fallback (non-production only)
  if (devUserId && devWorkspaceId) {
    req.user = { id: devUserId, email: `${devUserId}@dev.example.com`, role: devRole };
    req.context = createWorkspaceContext(devWorkspaceId, devUserId);
    return next();
  }

  return next(new AuthenticationError('Authentication required. Missing Bearer token or development context headers.'));
}
