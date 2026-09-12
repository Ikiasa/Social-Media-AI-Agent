import { Request, Response, NextFunction } from 'express';
import { WorkspaceContext, createWorkspaceContext } from '../../../../packages/core/src/context';
import { AuthenticationError } from '../../../../packages/core/src/errors';

export interface AuthenticatedRequest extends Request {
  context?: WorkspaceContext;
}

export function authMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const userId = (req.headers['x-dev-user-id'] as string) || (process.env.NODE_ENV === 'test' ? 'user-test-1' : undefined);
  const workspaceId = (req.headers['x-dev-workspace-id'] as string) || (process.env.NODE_ENV === 'test' ? 'ws-test-1' : undefined);

  if (!userId || !workspaceId) {
    return next(
      new AuthenticationError('Authentication required. Missing X-Dev-User-Id or X-Dev-Workspace-Id header.')
    );
  }

  try {
    req.context = createWorkspaceContext(workspaceId, userId);
    next();
  } catch (error) {
    next(new AuthenticationError('Invalid workspace context headers.', error instanceof Error ? error : undefined));
  }
}
