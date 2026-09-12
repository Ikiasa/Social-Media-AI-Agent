import mongoose, { Schema, Document } from 'mongoose';

export interface IKnowledgeChunk extends Document {
  workspaceId: string;
  brandId?: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  contentHash: string;
  tokenCount: number;
  metadata?: Record<string, unknown>;
  embedding: number[];
  createdAt: Date;
}

const KnowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, index: true },
    documentId: { type: String, required: true, index: true },
    content: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    contentHash: { type: String, required: true },
    tokenCount: { type: Number, required: true },
    metadata: { type: Schema.Types.Mixed },
    embedding: [{ type: Number }],
  },
  { timestamps: true }
);

KnowledgeChunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });
KnowledgeChunkSchema.index({ workspaceId: 1, brandId: 1 });

export const KnowledgeChunkModel =
  mongoose.models.KnowledgeChunk ||
  mongoose.model<IKnowledgeChunk>('KnowledgeChunk', KnowledgeChunkSchema);
