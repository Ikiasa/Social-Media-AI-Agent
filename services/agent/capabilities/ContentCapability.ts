import { ContentGenerationService } from '../../api/src/services/ContentGenerationService';
import { WorkspaceContext } from '../../../packages/core/src/context';
import { IContent } from '../../../packages/database/src/models/Content';

export class ContentCapability {
  private generationService: ContentGenerationService;

  constructor(generationService: ContentGenerationService = new ContentGenerationService()) {
    this.generationService = generationService;
  }

  async generateDraft(context: WorkspaceContext, topic: string, brandId?: string): Promise<IContent> {
    return await this.generationService.generateAndSaveDraft(context, {
      topic,
      brandId,
      platform: 'instagram',
      contentType: 'educational',
    });
  }
}
