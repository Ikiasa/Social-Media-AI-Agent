import { describe, it, expect } from 'vitest';
import { ModularKnowledgeIngester } from '../packages/knowledge/src/ingester';
import { KnowledgeError } from '../packages/core/src/errors';

describe('ModularKnowledgeIngester', () => {
  it('should ingest text file correctly', async () => {
    const ingester = new ModularKnowledgeIngester();
    const buffer = Buffer.from('Hello world knowledge content', 'utf-8');
    const doc = await ingester.ingest({
      workspaceId: 'ws-test',
      sourceType: 'txt',
      sourceUriOrBuffer: buffer,
      title: 'Test TXT',
    });

    expect(doc.workspaceId).toBe('ws-test');
    expect(doc.sourceType).toBe('txt');
    expect(doc.extractedText).toBe('Hello world knowledge content');
    expect(doc.title).toBe('Test TXT');
  });

  it('should throw KnowledgeError if workspaceId is missing', async () => {
    const ingester = new ModularKnowledgeIngester();
    await expect(
      ingester.ingest({
        workspaceId: '',
        sourceType: 'txt',
        sourceUriOrBuffer: Buffer.from('test'),
      })
    ).rejects.toThrow(KnowledgeError);
  });
});
