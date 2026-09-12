import mongoose, { Schema, Document } from 'mongoose';

export type KnowledgeStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'DELETED';

export interface IKnowledgeDocument extends Document {
  workspaceId: string;
  brandId?: string;
  sourceType: 'pdf' | 'docx' | 'doc' | 'csv' | 'txt' | 'web' | 'youtube' | 'audio' | 'manual';
  sourceName?: string;
  sourceUrl?: string;
  mimeType?: string;
  title: string;
  extractedText: string;
  language?: string;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
  status: KnowledgeStatus;
  processingError?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeDocumentSchema = new Schema<IKnowledgeDocument>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, index: true },
    sourceType: {
      type: String,
      enum: ['pdf', 'docx', 'doc', 'csv', 'txt', 'web', 'youtube', 'audio', 'manual'],
      required: true,
    },
    sourceName: { type: String },
    sourceUrl: { type: String },
    mimeType: { type: String },
    title: { type: String, required: true },
    extractedText: { type: String, required: true },
    language: { type: String, default: 'en' },
    tokenCount: { type: Number },
    metadata: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'READY', 'FAILED', 'DELETED'],
      default: 'PENDING',
      index: true,
    },
    processingError: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

KnowledgeDocumentSchema.index({ _id: 1, workspaceId: 1 });
KnowledgeDocumentSchema.index({ workspaceId: 1, brandId: 1 });

export const KnowledgeDocumentModel =
  mongoose.models.KnowledgeDocument ||
  mongoose.model<IKnowledgeDocument>('KnowledgeDocument', KnowledgeDocumentSchema);
