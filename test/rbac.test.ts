import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '../services/api/src/middleware/rbac';
import { AuthorizationError } from '../packages/core/src/errors';

describe('Role-Based Access Control (RBAC)', () => {
  it('should ALLOW access if user possesses required role OWNER', () => {
    const middleware = requireRole(['OWNER', 'ADMIN']);
    const req: any = { user: { id: 'u-1', role: 'OWNER' } };
    const next = vi.fn();

    middleware(req, {} as any, next);
    expect(next).toHaveBeenCalledWith(); // No error passed
  });

  it('should DENY access if user possesses role MEMBER when OWNER is required', () => {
    const middleware = requireRole(['OWNER']);
    const req: any = { user: { id: 'u-2', role: 'MEMBER' } };
    const next = vi.fn();

    middleware(req, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
  });
});
