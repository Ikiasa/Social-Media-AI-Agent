import mongoose, { Schema, Document } from 'mongoose';

export type IngestionRecordStatus =
  | 'RECEIVED'
  | 'NORMALIZED'
  | 'PROCESSED'
  | 'DUPLICATE'
  | 'REJECTED'
  | 'FAILED';

export interface ISocialDataIngestionRecord extends Document {
  workspaceId: string;
  brandId: string;
  providerConnectionId?: string;
  platform: 'instagram' | 'tiktok' | 'linkedin' | 'x' | 'threads' | 'generic';
  source: string;
  sourceRecordId: string;
  recordType: 'metric' | 'post' | 'engagement' | 'message' | 'trend_signal';
  payloadHash: string;
  status: IngestionRecordStatus;
  correlationId: string;
  capturedAt: Date;
  processedAt?: Date;
  errorCode?: string;
  dataQuality?: {
    coverage: 'complete' | 'partial' | 'limited';
    unavailableFields: string[];
  };
  payload?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SocialDataIngestionRecordSchema = new Schema<ISocialDataIngestionRecord>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    providerConnectionId: { type: String, default: null },
    platform: {
      type: String,
      required: true,
      enum: ['instagram', 'tiktok', 'linkedin', 'x', 'threads', 'generic'],
    },
    source: { type: String, required: true },
    sourceRecordId: { type: String, required: true },
    recordType: {
      type: String,
      required: true,
      enum: ['metric', 'post', 'engagement', 'message', 'trend_signal'],
    },
    payloadHash: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['RECEIVED', 'NORMALIZED', 'PROCESSED', 'DUPLICATE', 'REJECTED', 'FAILED'],
      default: 'RECEIVED',
    },
    correlationId: { type: String, required: true, index: true },
    capturedAt: { type: Date, required: true },
    processedAt: { type: Date, default: null },
    errorCode: { type: String, default: null },
    dataQuality: {
      coverage: { type: String, enum: ['complete', 'partial', 'limited'], default: 'complete' },
      unavailableFields: { type: [String], default: [] },
    },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Idempotency compound unique index: (workspaceId, source, sourceRecordId)
SocialDataIngestionRecordSchema.index(
  { workspaceId: 1, source: 1, sourceRecordId: 1 },
  { unique: true }
);

export const SocialDataIngestionRecordModel = mongoose.model<ISocialDataIngestionRecord>(
  'SocialDataIngestionRecord',
  SocialDataIngestionRecordSchema
);
