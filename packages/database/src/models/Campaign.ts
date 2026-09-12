import mongoose, { Schema, Document } from 'mongoose';

export type CampaignObjective =
  | 'AWARENESS'
  | 'ENGAGEMENT'
  | 'LEADS'
  | 'CONVERSION'
  | 'COMMUNITY';

export type CampaignStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ARCHIVED';

export interface ICampaignKpiTargets {
  reach?: number;
  impressions?: number;
  engagementRate?: number;
  clicks?: number;
  ctr?: number;
  leads?: number;
  conversionRate?: number;
}

export interface ICampaignUtmDefaults {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface ICampaign extends Document {
  workspaceId: string;
  brandId: string;
  name: string;
  description?: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  platforms: string[];
  startAt: Date;
  endAt: Date;
  timezone: string;
  targetAudience: string;
  budget?: number;
  currency?: string;
  kpiTargets: ICampaignKpiTargets;
  contentPillars: string[];
  utmDefaults?: ICampaignUtmDefaults;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    objective: {
      type: String,
      enum: ['AWARENESS', 'ENGAGEMENT', 'LEADS', 'CONVERSION', 'COMMUNITY'],
      required: true,
      default: 'AWARENESS',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'],
      required: true,
      default: 'DRAFT',
      index: true,
    },
    platforms: [{ type: String }],
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    timezone: { type: String, default: 'Asia/Jakarta', required: true },
    targetAudience: { type: String, required: true },
    budget: { type: Number },
    currency: { type: String, default: 'IDR' },
    kpiTargets: {
      reach: { type: Number },
      impressions: { type: Number },
      engagementRate: { type: Number },
      clicks: { type: Number },
      ctr: { type: Number },
      leads: { type: Number },
      conversionRate: { type: Number },
    },
    contentPillars: [{ type: String }],
    utmDefaults: {
      utmSource: { type: String },
      utmMedium: { type: String },
      utmCampaign: { type: String },
    },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

CampaignSchema.index({ workspaceId: 1, brandId: 1, status: 1 });

export const CampaignModel =
  mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', CampaignSchema);
