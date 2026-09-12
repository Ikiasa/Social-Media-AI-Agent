import { KnowledgeChunkModel, IKnowledgeChunk } from '../../database/src/models/KnowledgeChunk';
import { KnowledgeChunkInput } from './chunker';
import { AuthorizationError } from '../../core/src/errors';

export interface VectorSearchQuery {
  workspaceId: string;
  brandId?: string;
  queryEmbedding: number[];
  limit?: number;
  minSimilarity?: number;
}

export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  workspaceId: string;
  brandId?: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface VectorStore {
  upsert(chunks: KnowledgeChunkInput[], embeddings: number[][]): Promise<void>;
  search(query: VectorSearchQuery): Promise<VectorSearchResult[]>;
  deleteByDocument(documentId: string, workspaceId: string): Promise<void>;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const minDim = Math.min(a.length, b.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < minDim; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

export class MongooseVectorStore implements VectorStore {
  async upsert(chunks: KnowledgeChunkInput[], embeddings: number[][]): Promise<void> {
    if (chunks.length === 0) return;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i] || [];

      await KnowledgeChunkModel.findOneAndUpdate(
        { documentId: chunk.documentId, chunkIndex: chunk.chunkIndex },
        {
          $set: {
            workspaceId: chunk.workspaceId,
            brandId: chunk.brandId,
            documentId: chunk.documentId,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            contentHash: chunk.contentHash,
            tokenCount: chunk.tokenCount,
            metadata: chunk.metadata,
            embedding,
          },
        },
        { upsert: true, new: true }
      );
    }
  }

  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    if (!query.workspaceId) {
      throw new AuthorizationError('Workspace ID is required for vector search.');
    }

    const dbFilter: Record<string, unknown> = { workspaceId: query.workspaceId };
    if (query.brandId) {
      dbFilter.brandId = query.brandId;
    }

    const candidateChunks: IKnowledgeChunk[] = await KnowledgeChunkModel.find(dbFilter).exec();
    const limit = query.limit || 5;
    const minSimilarity = query.minSimilarity || 0.1;

    const scoredResults: VectorSearchResult[] = [];

    for (const chunk of candidateChunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) continue;
      const sim = cosineSimilarity(query.queryEmbedding, chunk.embedding);
      if (sim >= minSimilarity) {
        scoredResults.push({
          chunkId: String(chunk._id),
          documentId: chunk.documentId,
          workspaceId: chunk.workspaceId,
          brandId: chunk.brandId,
          content: chunk.content,
          similarity: sim,
          metadata: chunk.metadata,
        });
      }
    }

    scoredResults.sort((a, b) => b.similarity - a.similarity);
    return scoredResults.slice(0, limit);
  }

  async deleteByDocument(documentId: string, workspaceId: string): Promise<void> {
    if (!workspaceId) {
      throw new AuthorizationError('Workspace ID is required for vector deletion.');
    }
    await KnowledgeChunkModel.deleteMany({ documentId, workspaceId });
  }
}
