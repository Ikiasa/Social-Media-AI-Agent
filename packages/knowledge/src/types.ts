export type KnowledgeSourceType = 'pdf' | 'docx' | 'doc' | 'csv' | 'txt' | 'web' | 'youtube' | 'audio';

export interface KnowledgeInput {
  workspaceId: string;
  sourceType: KnowledgeSourceType;
  sourceUriOrBuffer: string | Buffer;
  title?: string;
}

export interface KnowledgeDocument {
  id: string;
  workspaceId: string;
  sourceType: KnowledgeSourceType;
  title: string;
  extractedText: string;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface KnowledgeIngester {
  ingest(input: KnowledgeInput): Promise<KnowledgeDocument>;
}
