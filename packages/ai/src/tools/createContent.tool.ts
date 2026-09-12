import { AgentTool } from './types';
import { WorkspaceContext } from '../../../core/src/context';
import { ContentGenerationService, GenerateContentParams } from '../../../../services/api/src/services/ContentGenerationService';
import { IContent } from '../../../database/src/models/Content';

export class CreateContentTool implements AgentTool<GenerateContentParams, IContent> {
  readonly name = 'create_content';
  readonly description = 'Generates AI content utilizing Brand Context & RAG Knowledge, then saves draft';
  readonly category = 'WRITE';
  readonly requiresApproval = false;

  private generationService: ContentGenerationService;

  constructor(generationService: ContentGenerationService = new ContentGenerationService()) {
    this.generationService = generationService;
  }

  async execute(context: WorkspaceContext, input: GenerateContentParams): Promise<IContent> {
    return await this.generationService.generateAndSaveDraft(context, input);
  }
}
