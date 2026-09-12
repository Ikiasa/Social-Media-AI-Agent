import { AgentTool } from './types';
import { WorkspaceContext } from '../../../core/src/context';
import { ContentService } from '../../../../services/api/src/services/ContentService';
import { IContent } from '../../../database/src/models/Content';
import { ValidationError } from '../../../core/src/errors';

export interface UpdateContentInput {
  contentId: string;
  updates: Partial<IContent>;
}

export class UpdateContentTool implements AgentTool<UpdateContentInput, IContent> {
  readonly name = 'update_content';
  readonly description = 'Updates existing content draft within active workspace boundary';
  readonly category = 'WRITE';
  readonly requiresApproval = false;

  private contentService: ContentService;

  constructor(contentService: ContentService = new ContentService()) {
    this.contentService = contentService;
  }

  async execute(context: WorkspaceContext, input: UpdateContentInput): Promise<IContent> {
    const updated = await this.contentService.updateContent(context, input.contentId, input.updates);
    if (!updated) {
      throw new ValidationError(`Content not found with ID ${input.contentId} in current workspace.`);
    }
    return updated;
  }
}
