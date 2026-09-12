import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeRetrievalService } from '../packages/knowledge/src/retrievalService';
import { createWorkspaceContext } from '../packages/core/src/context';
import { VectorSearchResult } from '../packages/knowledge/src/vectorStore';

describe('RAG Multi-Tenant & Brand Security Isolation', () => {
  let retrievalService: KnowledgeRetrievalService;
  let mockVectorStore: any;
  let mockEmbeddingProvider: any;

  beforeEach(() => {
    const chunkStore: VectorSearchResult[] = [
      {
        chunkId: 'chunk-wsA-1',
        documentId: 'doc-wsA-1',
        workspaceId: 'ws-A',
        brandId: 'brand-A',
        content: 'Workspace A confidential product specs',
        similarity: 0.95,
      },
      {
        chunkId: 'chunk-wsB-1',
        documentId: 'doc-wsB-1',
        workspaceId: 'ws-B',
        brandId: 'brand-B',
        content: 'Workspace B secret financials',
        similarity: 0.98,
      },
    ];

    mockEmbeddingProvider = {
      embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    };

    mockVectorStore = {
      search: vi.fn().mockImplementation((query) => {
        const filtered = chunkStore.filter((c) => {
          if (c.workspaceId !== query.workspaceId) return false;
          if (query.brandId && c.brandId !== query.brandId) return false;
          return true;
        });
        return Promise.resolve(filtered);
      }),
    };

    retrievalService = new KnowledgeRetrievalService(mockVectorStore, mockEmbeddingProvider);
  });

  it('MUST NOT return Workspace B documents when Workspace A performs RAG retrieval', async () => {
    const ctxWorkspaceA = createWorkspaceContext('ws-A', 'user-A');
    const results = await retrievalService.retrieve(ctxWorkspaceA, 'secret financials');

    expect(results).toHaveLength(1);
    expect(results[0].workspaceId).toBe('ws-A');
    expect(results[0].content).not.toContain('Workspace B secret financials');
  });

  it('MUST NOT return Brand B knowledge when Brand A query is executed', async () => {
    const ctxWorkspaceA = createWorkspaceContext('ws-A', 'user-A', 'brand-A');
    const results = await retrievalService.retrieve(ctxWorkspaceA, 'confidential', 'brand-A');

    expect(results).toHaveLength(1);
    expect(results[0].brandId).toBe('brand-A');
    expect(results[0].content).toContain('Workspace A confidential product specs');
  });

  it('MUST return empty results when Workspace C (no documents) performs RAG retrieval', async () => {
    const ctxWorkspaceC = createWorkspaceContext('ws-C', 'user-C');
    const results = await retrievalService.retrieve(ctxWorkspaceC, 'confidential');

    expect(results).toHaveLength(0);
  });
});
