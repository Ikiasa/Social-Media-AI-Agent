import mongoose, { Schema, Document } from 'mongoose';

export type CompetitorPlatform = 'instagram' | 'tiktok' | 'linkedin' | 'x' | 'threads';
export type CompetitorSourceType = 'official_api' | 'licensed_provider' | 'user_import';
export type CompetitorWatchlistStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type MonitoringFrequency = 'daily' | 'weekly';

export interface ICompetitorWatchlist extends Document {
  workspaceId: string;
  brandId: string;
  name: string;
  platform: CompetitorPlatform;
  externalHandle: string;
  sourceType: CompetitorSourceType;
  status: CompetitorWatchlistStatus;
  monitoringFrequency: MonitoringFrequency;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorWatchlistSchema = new Schema<ICompetitorWatchlist>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    platform: {
      type: String,
      required: true,
      enum: ['instagram', 'tiktok', 'linkedin', 'x', 'threads'],
    },
    externalHandle: { type: String, required: true },
    sourceType: {
      type: String,
      default: 'official_api',
      enum: ['official_api', 'licensed_provider', 'user_import'],
    },
    status: {
      type: String,
      default: 'ACTIVE',
      enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'],
    },
    monitoringFrequency: {
      type: String,
      default: 'daily',
      enum: ['daily', 'weekly'],
    },
    notes: { type: String },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

CompetitorWatchlistSchema.index(
  { workspaceId: 1, brandId: 1, platform: 1, externalHandle: 1 },
  { unique: true }
);

export const CompetitorWatchlistModel =
  mongoose.models.CompetitorWatchlist ||
  mongoose.model<ICompetitorWatchlist>('CompetitorWatchlist', CompetitorWatchlistSchema);
