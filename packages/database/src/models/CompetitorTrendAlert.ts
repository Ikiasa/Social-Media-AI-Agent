import mongoose, { Schema, Document } from 'mongoose';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'DISMISSED' | 'ACTIONED';

export interface ICompetitorTrendAlert extends Document {
  workspaceId: string;
  brandId: string;
  signalId?: string;
  competitorId?: string;
  title: string;
  summary: string;
  evidence: string[];
  period: {
    start: Date;
    end: Date;
  };
  confidence: 'low' | 'medium' | 'high';
  expectedRelevance: string;
  recommendedAction: string;
  linkedCampaignId?: string;
  linkedContentId?: string;
  status: AlertStatus;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorTrendAlertSchema = new Schema<ICompetitorTrendAlert>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    signalId: { type: String },
    competitorId: { type: String },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    evidence: [{ type: String }],
    period: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    confidence: {
      type: String,
      default: 'medium',
      enum: ['low', 'medium', 'high'],
    },
    expectedRelevance: { type: String, required: true },
    recommendedAction: { type: String, required: true },
    linkedCampaignId: { type: String },
    linkedContentId: { type: String },
    status: {
      type: String,
      default: 'ACTIVE',
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'DISMISSED', 'ACTIONED'],
    },
  },
  {
    timestamps: true,
  }
);

CompetitorTrendAlertSchema.index({ workspaceId: 1, brandId: 1, status: 1 });

export const CompetitorTrendAlertModel =
  mongoose.models.CompetitorTrendAlert ||
  mongoose.model<ICompetitorTrendAlert>('CompetitorTrendAlert', CompetitorTrendAlertSchema);
