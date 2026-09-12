import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from '../packages/knowledge/src/vectorStore';

describe('VectorStore & Cosine Similarity', () => {
  it('should calculate identical vectors cosine similarity as 1.0', () => {
    const vecA = [0.5, 0.5, 0.5, 0.5];
    const sim = cosineSimilarity(vecA, vecA);
    expect(sim).toBeCloseTo(1.0, 5);
  });

  it('should calculate orthogonal vectors cosine similarity as 0', () => {
    const vecA = [1, 0];
    const vecB = [0, 1];
    const sim = cosineSimilarity(vecA, vecB);
    expect(sim).toBeCloseTo(0, 5);
  });
});
