import crypto from 'crypto';

export interface KnowledgeDocumentInput {
  id: string;
  workspaceId: string;
  brandId?: string;
  title: string;
  extractedText: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeChunkInput {
  workspaceId: string;
  brandId?: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  contentHash: string;
  tokenCount: number;
  metadata?: Record<string, unknown>;
}

export interface ChunkingStrategy {
  chunk(doc: KnowledgeDocumentInput): Promise<KnowledgeChunkInput[]>;
}

export interface ChunkingOptions {
  targetChunkSize?: number; // Target character length (default 600)
  chunkOverlap?: number;    // Overlap length (default 100)
  minChunkSize?: number;    // Minimum length threshold (default 50)
}

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

export class TokenWindowChunkingStrategy implements ChunkingStrategy {
  private targetSize: number;
  private overlap: number;
  private minSize: number;

  constructor(options: ChunkingOptions = {}) {
    this.targetSize = options.targetChunkSize || 600;
    this.overlap = options.chunkOverlap || 100;
    this.minSize = options.minChunkSize || 50;
  }

  async chunk(doc: KnowledgeDocumentInput): Promise<KnowledgeChunkInput[]> {
    const cleanedText = normalizeText(doc.extractedText);
    if (!cleanedText) return [];

    const paragraphs = cleanedText.split(/\n\n/);
    const chunks: KnowledgeChunkInput[] = [];

    let currentChunkText = '';
    let chunkIndex = 0;

    for (const para of paragraphs) {
      const p = para.trim();
      if (!p) continue;

      if ((currentChunkText + '\n\n' + p).length <= this.targetSize || currentChunkText.length === 0) {
        currentChunkText = currentChunkText ? `${currentChunkText}\n\n${p}` : p;
      } else {
        if (currentChunkText.length >= this.minSize) {
          chunks.push(this.createChunkInput(doc, currentChunkText, chunkIndex++));
        }

        const overlapText = currentChunkText.slice(-this.overlap);
        currentChunkText = `${overlapText}\n\n${p}`;
      }
    }

    if (currentChunkText.trim().length >= this.minSize) {
      chunks.push(this.createChunkInput(doc, currentChunkText.trim(), chunkIndex++));
    }

    return chunks;
  }

  private createChunkInput(
    doc: KnowledgeDocumentInput,
    content: string,
    chunkIndex: number
  ): KnowledgeChunkInput {
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    const tokenCount = Math.ceil(content.length / 4);

    return {
      workspaceId: doc.workspaceId,
      brandId: doc.brandId,
      documentId: doc.id,
      content,
      chunkIndex,
      contentHash,
      tokenCount,
      metadata: {
        ...doc.metadata,
        documentTitle: doc.title,
      },
    };
  }
}
