import { describe, it, expect } from 'vitest';
import { KnowledgeContextBuilder, BrandContextBuilder } from '../packages/knowledge/src/contextBuilder';
import { VectorSearchResult } from '../packages/knowledge/src/vectorStore';

describe('Context Builders & Citations', () => {
  it('should build formatted KnowledgeContext with source citations and token truncation', () => {
    const mockChunks: VectorSearchResult[] = [
      {
        chunkId: 'chunk-1',
        documentId: 'doc-101',
        workspaceId: 'ws-1',
        content: 'Acme AI Agent automates content drafts.',
        similarity: 0.92,
        metadata: { documentTitle: 'Acme Product Spec' },
      },
    ];

    const ctx = KnowledgeContextBuilder.buildContext(mockChunks, 1000);

    expect(ctx.formattedText).toContain('Acme AI Agent automates content drafts.');
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources[0].title).toBe('Acme Product Spec');
  });

  it('should build BrandContext with brand voice and restrictions', () => {
    const brandCtx = BrandContextBuilder.buildBrandContext({
      name: 'TechFlow',
      brandVoice: ['Casual', 'Witty'],
      restrictedTopics: ['Competitors', 'Crypto'],
    } as any);

    expect(brandCtx.formattedText).toContain('Brand Name: TechFlow');
    expect(brandCtx.formattedText).toContain('Casual, Witty');
    expect(brandCtx.formattedText).toContain('Competitors, Crypto');
  });
});
