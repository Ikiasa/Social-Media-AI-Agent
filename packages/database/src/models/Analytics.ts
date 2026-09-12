import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalytics extends Document {
  workspaceId: string;
  brandId?: string;
  contentId?: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  engagementRate: number;
  recordedAt: Date;
}

const AnalyticsSchema = new Schema<IAnalytics>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String },
    contentId: { type: String },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const AnalyticsModel =
  mongoose.models.Analytics || mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);
