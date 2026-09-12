/**
 * Multi-tenant Workspace Context Definition
 */

export interface WorkspaceContext {
  workspaceId: string;
  userId: string;
  brandId?: string;
  role?: string;
}

export function createWorkspaceContext(
  workspaceId: string,
  userId: string,
  brandId?: string
): WorkspaceContext {
  if (!workspaceId || !workspaceId.trim()) {
    throw new Error('Workspace ID is required for multi-tenancy context.');
  }
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required for multi-tenancy context.');
  }
  return {
    workspaceId,
    userId,
    brandId,
  };
}
