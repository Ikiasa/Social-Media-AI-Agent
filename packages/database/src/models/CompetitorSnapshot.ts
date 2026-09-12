import mongoose, { Schema, Document } from 'mongoose';

export interface IFormatDistribution {
  reelVideo?: number;
  carousel?: number;
  static?: number;
  text?: number;
  story?: number;
}

export interface IAggregateMetrics {
  engagementRate?: number;
  reach?: number;
  impressions?: number;
  avgLikes?: number;
  avgComments?: number;
}

export interface IDataQuality {
  coverage: 'complete' | 'partial' | 'limited';
  missingSignals: string[];
}

export interface ICompetitorSnapshot extends Document {
  workspaceId: string;
  brandId: string;
  competitorId: string;
  platform: string;
  capturedAt: Date;
  source: string;
  postCount: number;
  formatDistribution: IFormatDistribution;
  aggregateMetrics: IAggregateMetrics;
  topTopics: string[];
  topHashtags: string[];
  ctaPatterns: string[];
  sampleSize: number;
  coverageStatus: 'complete' | 'partial' | 'limited';
  dataQuality: IDataQuality;
  sourceRecordId: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorSnapshotSchema = new Schema<ICompetitorSnapshot>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    competitorId: { type: String, required: true, index: true },
    platform: { type: String, required: true },
    capturedAt: { type: Date, default: Date.now },
    source: { type: String, required: true, default: 'official_api' },
    postCount: { type: Number, default: 0 },
    formatDistribution: {
      reelVideo: { type: Number, default: 0 },
      carousel: { type: Number, default: 0 },
      static: { type: Number, default: 0 },
      text: { type: Number, default: 0 },
      story: { type: Number, default: 0 },
    },
    aggregateMetrics: {
      engagementRate: { type: Number },
      reach: { type: Number },
      impressions: { type: Number },
      avgLikes: { type: Number },
      avgComments: { type: Number },
    },
    topTopics: [{ type: String }],
    topHashtags: [{ type: String }],
    ctaPatterns: [{ type: String }],
    sampleSize: { type: Number, default: 0 },
    coverageStatus: {
      type: String,
      default: 'complete',
      enum: ['complete', 'partial', 'limited'],
    },
    dataQuality: {
      coverage: { type: String, default: 'complete' },
      missingSignals: [{ type: String }],
    },
    sourceRecordId: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

CompetitorSnapshotSchema.index(
  { workspaceId: 1, competitorId: 1, sourceRecordId: 1 },
  { unique: true }
);

export const CompetitorSnapshotModel =
  mongoose.models.CompetitorSnapshot ||
  mongoose.model<ICompetitorSnapshot>('CompetitorSnapshot', CompetitorSnapshotSchema);
