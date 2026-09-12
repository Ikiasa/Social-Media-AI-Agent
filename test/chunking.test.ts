import { describe, it, expect } from 'vitest';
import { TokenWindowChunkingStrategy, normalizeText } from '../packages/knowledge/src/chunker';

describe('TokenWindowChunkingStrategy', () => {
  it('should normalize whitespace correctly', () => {
    const raw = '  Hello   World \r\n\r\n\n\n Paragraph 2  ';
    const normalized = normalizeText(raw);
    expect(normalized).toBe('Hello World\n\nParagraph 2');
  });

  it('should chunk large documents into overlapping chunks with SHA-256 hashes', async () => {
    const chunker = new TokenWindowChunkingStrategy({ targetChunkSize: 100, chunkOverlap: 20 });
    const text = 'Paragraph 1: AI social media agent simplifies content creation.\n\nParagraph 2: Brand knowledge engine provides RAG retrieval.\n\nParagraph 3: Multi-tenant security isolation prevents data leaks.';

    const chunks = await chunker.chunk({
      id: 'doc-1',
      workspaceId: 'ws-1',
      brandId: 'brand-1',
      title: 'Guide',
      extractedText: text,
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].workspaceId).toBe('ws-1');
    expect(chunks[0].documentId).toBe('doc-1');
    expect(chunks[0].contentHash).toHaveLength(64); // SHA-256 hex string
  });
});
