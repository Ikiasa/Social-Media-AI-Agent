import mongoose, { Schema, Document } from 'mongoose';

export interface IPublication extends Document {
  workspaceId: string;
  brandId?: string;
  contentId: string;
  scheduledPostId?: string;
  platform: string;
  platformPostId?: string;
  providerPostId?: string;
  providerContainerId?: string;
  postUrl?: string;
  errorClassification?: string;
  publishedAt: Date;
  publishedBy?: string;
  status: 'SUCCESS' | 'FAILED';
  metadata?: Record<string, unknown>;
}

const PublicationSchema = new Schema<IPublication>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, index: true },
    contentId: { type: String, required: true, index: true },
    scheduledPostId: { type: String, index: true },
    platform: { type: String, required: true },
    platformPostId: { type: String },
    providerPostId: { type: String },
    providerContainerId: { type: String },
    postUrl: { type: String },
    errorClassification: { type: String },
    publishedAt: { type: Date, default: Date.now },
    publishedBy: { type: String },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

PublicationSchema.index({ workspaceId: 1, scheduledPostId: 1 }, { unique: true, sparse: true });

export const PublicationModel =
  mongoose.models.Publication || mongoose.model<IPublication>('Publication', PublicationSchema);
