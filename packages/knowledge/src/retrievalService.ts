import { VectorStore, MongooseVectorStore, VectorSearchResult } from './vectorStore';
import { EmbeddingProvider, GeminiEmbeddingProvider } from './embedding';
import { WorkspaceContext } from '../../core/src/context';
import { AuthorizationError, KnowledgeError } from '../../core/src/errors';
import { Logger, defaultLogger } from '../../core/src/logger';

export class KnowledgeRetrievalService {
  private vectorStore: VectorStore;
  private embeddingProvider: EmbeddingProvider;
  private logger: Logger;

  constructor(
    vectorStore: VectorStore = new MongooseVectorStore(),
    embeddingProvider: EmbeddingProvider = new GeminiEmbeddingProvider(),
    logger: Logger = defaultLogger
  ) {
    this.vectorStore = vectorStore;
    this.embeddingProvider = embeddingProvider;
    this.logger = logger;
  }

  async retrieve(
    ctx: WorkspaceContext,
    query: string,
    brandId?: string,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required for knowledge retrieval.');
    }
    if (!query || !query.trim()) {
      throw new KnowledgeError('Search query is required for knowledge retrieval.');
    }

    this.logger.info('Performing semantic knowledge retrieval', {
      workspaceId: ctx.workspaceId,
      brandId: brandId || ctx.brandId,
      query,
    });

    const queryEmbeddings = await this.embeddingProvider.embed([query]);
    if (queryEmbeddings.length === 0) {
      return [];
    }

    const results = await this.vectorStore.search({
      workspaceId: ctx.workspaceId,
      brandId: brandId || ctx.brandId,
      queryEmbedding: queryEmbeddings[0],
      limit,
    });

    this.logger.info(`Retrieved ${results.length} relevant knowledge chunks`, {
      workspaceId: ctx.workspaceId,
      count: results.length,
    });

    return results;
  }
}
