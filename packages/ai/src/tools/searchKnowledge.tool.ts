import { AgentTool } from './types';
import { WorkspaceContext } from '../../../core/src/context';
import { KnowledgeRetrievalService } from '../../../knowledge/src/retrievalService';
import { VectorSearchResult } from '../../../knowledge/src/vectorStore';

export interface SearchKnowledgeInput {
  query: string;
  brandId?: string;
  limit?: number;
}

export class SearchKnowledgeTool implements AgentTool<SearchKnowledgeInput, VectorSearchResult[]> {
  readonly name = 'search_knowledge';
  readonly description = 'Performs RAG semantic retrieval over workspace & brand documents';
  readonly category = 'READ';
  readonly requiresApproval = false;

  private retrievalService: KnowledgeRetrievalService;

  constructor(retrievalService: KnowledgeRetrievalService = new KnowledgeRetrievalService()) {
    this.retrievalService = retrievalService;
  }

  async execute(context: WorkspaceContext, input: SearchKnowledgeInput): Promise<VectorSearchResult[]> {
    return await this.retrievalService.retrieve(
      context,
      input.query,
      input.brandId || context.brandId,
      input.limit || 5
    );
  }
}
