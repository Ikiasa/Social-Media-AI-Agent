import { BrandRepository } from '../../../../packages/database/src/repositories/BrandRepository';
import { IBrand } from '../../../../packages/database/src/models/Brand';
import { WorkspaceContext } from '../../../../packages/core/src/context';
import { ValidationError, AuthorizationError } from '../../../../packages/core/src/errors';

export class BrandService {
  private repo: BrandRepository;

  constructor(repo: BrandRepository = new BrandRepository()) {
    this.repo = repo;
  }

  async createBrand(ctx: WorkspaceContext, data: Partial<IBrand>): Promise<IBrand> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to create a brand.');
    }
    if (!data.name || !data.name.trim()) {
      throw new ValidationError('Brand name is required.');
    }

    return await this.repo.create({
      ...data,
      workspaceId: ctx.workspaceId,
    });
  }

  async getBrand(ctx: WorkspaceContext, brandId: string): Promise<IBrand | null> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to access a brand.');
    }
    return await this.repo.findById(brandId, ctx.workspaceId);
  }

  async updateBrand(ctx: WorkspaceContext, brandId: string, updates: Partial<IBrand>): Promise<IBrand | null> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to update a brand.');
    }
    return await this.repo.update(brandId, ctx.workspaceId, updates);
  }

  async listBrands(ctx: WorkspaceContext): Promise<IBrand[]> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to list brands.');
    }
    return await this.repo.list(ctx.workspaceId);
  }
}
