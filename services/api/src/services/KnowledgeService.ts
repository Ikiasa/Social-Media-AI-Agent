import { KnowledgeRepository } from '../../../../packages/database/src/repositories/KnowledgeRepository';
import { IKnowledgeDocument, KnowledgeStatus } from '../../../../packages/database/src/models/KnowledgeDocument';
import { ModularKnowledgeIngester } from '../../../../packages/knowledge/src/ingester';
import { KnowledgeInput } from '../../../../packages/knowledge/src/types';
import { TokenWindowChunkingStrategy, ChunkingStrategy } from '../../../../packages/knowledge/src/chunker';
import { GeminiEmbeddingProvider, EmbeddingProvider } from '../../../../packages/knowledge/src/embedding';
import { MongooseVectorStore, VectorStore } from '../../../../packages/knowledge/src/vectorStore';
import { WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthorizationError, KnowledgeError } from '../../../../packages/core/src/errors';
import { Logger, defaultLogger } from '../../../../packages/core/src/logger';

export class KnowledgeService {
  private repo: KnowledgeRepository;
  private ingester: ModularKnowledgeIngester;
  private chunker: ChunkingStrategy;
  private embeddingProvider: EmbeddingProvider;
  private vectorStore: VectorStore;
  private logger: Logger;

  constructor(
    repo: KnowledgeRepository = new KnowledgeRepository(),
    ingester: ModularKnowledgeIngester = new ModularKnowledgeIngester(),
    chunker: ChunkingStrategy = new TokenWindowChunkingStrategy(),
    embeddingProvider: EmbeddingProvider = new GeminiEmbeddingProvider(),
    vectorStore: VectorStore = new MongooseVectorStore(),
    logger: Logger = defaultLogger
  ) {
    this.repo = repo;
    this.ingester = ingester;
    this.chunker = chunker;
    this.embeddingProvider = embeddingProvider;
    this.vectorStore = vectorStore;
    this.logger = logger;
  }

  async ingest(ctx: WorkspaceContext, input: Omit<KnowledgeInput, 'workspaceId'> & { brandId?: string }): Promise<IKnowledgeDocument> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required for knowledge ingestion.');
    }

    const rawDoc = await this.ingester.ingest({
      ...input,
      workspaceId: ctx.workspaceId,
    });

    const docRecord = await this.repo.create({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId || ctx.brandId,
      sourceType: rawDoc.sourceType,
      title: rawDoc.title,
      extractedText: rawDoc.extractedText,
      tokenCount: rawDoc.tokenCount,
      status: 'PROCESSING',
    });

    try {
      await this.processDocumentPipeline(docRecord);
      docRecord.status = 'READY';
      docRecord.processedAt = new Date();
      await docRecord.save();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      docRecord.status = 'FAILED';
      docRecord.processingError = message;
      await docRecord.save();
      this.logger.error(`Document pipeline processing failed for ${docRecord._id}: ${message}`);
    }

    return docRecord;
  }

  async reprocessDocument(ctx: WorkspaceContext, id: string): Promise<IKnowledgeDocument> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to reprocess document.');
    }
    const docRecord = await this.repo.findById(id, ctx.workspaceId);
    if (!docRecord) {
      throw new KnowledgeError(`Knowledge document not found with ID: ${id}`);
    }

    docRecord.status = 'PROCESSING';
    await docRecord.save();

    try {
      await this.processDocumentPipeline(docRecord);
      docRecord.status = 'READY';
      docRecord.processedAt = new Date();
      docRecord.processingError = undefined;
      await docRecord.save();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      docRecord.status = 'FAILED';
      docRecord.processingError = message;
      await docRecord.save();
      throw new KnowledgeError(`Reprocessing failed: ${message}`);
    }

    return docRecord;
  }

  private async processDocumentPipeline(docRecord: IKnowledgeDocument): Promise<void> {
    const chunkInputs = await this.chunker.chunk({
      id: String(docRecord._id),
      workspaceId: docRecord.workspaceId,
      brandId: docRecord.brandId,
      title: docRecord.title,
      extractedText: docRecord.extractedText,
    });

    if (chunkInputs.length === 0) return;

    const texts = chunkInputs.map((c) => c.content);
    const embeddings = await this.embeddingProvider.embed(texts);

    await this.vectorStore.upsert(chunkInputs, embeddings);
  }

  async getDocument(ctx: WorkspaceContext, id: string): Promise<IKnowledgeDocument | null> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to view document.');
    }
    return await this.repo.findById(id, ctx.workspaceId);
  }

  async listDocuments(ctx: WorkspaceContext): Promise<IKnowledgeDocument[]> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to list documents.');
    }
    return await this.repo.list(ctx.workspaceId);
  }

  async deleteDocument(ctx: WorkspaceContext, id: string): Promise<boolean> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required to delete document.');
    }
    const success = await this.repo.delete(id, ctx.workspaceId);
    if (success) {
      // Delete cascade: Remove all vector entries for this document
      await this.vectorStore.deleteByDocument(id, ctx.workspaceId);
    }
    return success;
  }
}
