import { AgentTool } from './types';
import { WorkspaceContext } from '../../../core/src/context';
import { BrandService } from '../../../../services/api/src/services/BrandService';
import { IBrand } from '../../../database/src/models/Brand';

export interface GetBrandInput {
  brandId?: string;
}

export class GetBrandTool implements AgentTool<GetBrandInput, IBrand | null> {
  readonly name = 'get_brand';
  readonly description = 'Loads authorized brand context profile (name, voice, audience, pillars, restrictions)';
  readonly category = 'READ';
  readonly requiresApproval = false;

  private brandService: BrandService;

  constructor(brandService: BrandService = new BrandService()) {
    this.brandService = brandService;
  }

  async execute(context: WorkspaceContext, input: GetBrandInput): Promise<IBrand | null> {
    const targetBrandId = input.brandId || context.brandId;
    if (!targetBrandId) {
      const brands = await this.brandService.listBrands(context);
      return brands.length > 0 ? brands[0] : null;
    }
    return await this.brandService.getBrand(context, targetBrandId);
  }
}
