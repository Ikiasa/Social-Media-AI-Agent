import { AgentTool } from './types';
import { WorkspaceContext } from '../../../core/src/context';
import { ContentService } from '../../../../services/api/src/services/ContentService';
import { IContent, ContentStatus } from '../../../database/src/models/Content';

export interface GetRecentContentInput {
  status?: ContentStatus;
  limit?: number;
}

export class GetRecentContentTool implements AgentTool<GetRecentContentInput, IContent[]> {
  readonly name = 'get_recent_content';
  readonly description = 'Retrieves recent content items from active workspace to avoid topic duplication';
  readonly category = 'READ';
  readonly requiresApproval = false;

  private contentService: ContentService;

  constructor(contentService: ContentService = new ContentService()) {
    this.contentService = contentService;
  }

  async execute(context: WorkspaceContext, input: GetRecentContentInput): Promise<IContent[]> {
    const list = await this.contentService.listContent(context, input.status);
    return list.slice(0, input.limit || 5);
  }
}
