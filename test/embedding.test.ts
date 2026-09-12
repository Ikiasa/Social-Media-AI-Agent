import { describe, it, expect } from 'vitest';
import { GeminiEmbeddingProvider } from '../packages/knowledge/src/embedding';

describe('GeminiEmbeddingProvider', () => {
  it('should throw AIError when GEMINI_API_KEY is unavailable', async () => {
    const provider = new GeminiEmbeddingProvider();
    const texts = ['AI Social Media Agent', 'Brand Knowledge Engine RAG'];

    await expect(provider.embed(texts)).rejects.toThrow('GEMINI_API_KEY is missing or unavailable');
  });

  it('should return empty array for empty input', async () => {
    const provider = new GeminiEmbeddingProvider();
    const embeddings = await provider.embed([]);
    expect(embeddings).toHaveLength(0);
  });
});
