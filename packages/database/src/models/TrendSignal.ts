import mongoose, { Schema, Document } from 'mongoose';

export type SignalType = 'topic' | 'hashtag' | 'format' | 'audio' | 'competitor_growth';
export type SignalConfidence = 'low' | 'medium' | 'high';
export type SignalStatus = 'NEW' | 'REVIEWED' | 'DISMISSED' | 'ACTIONED';

export interface ITrendSignalDataQuality {
  coverage: 'complete' | 'partial' | 'limited';
  missingSignals: string[];
}

export interface ITrendSignal extends Document {
  workspaceId: string;
  brandId: string;
  platform: string;
  signalType: SignalType;
  label: string;
  periodStart: Date;
  periodEnd: Date;
  baselineValue: number;
  currentValue: number;
  growthPercent: number;
  sampleSize: number;
  confidence: SignalConfidence;
  evidence: string[];
  dataQuality: ITrendSignalDataQuality;
  status: SignalStatus;
  cooldownKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrendSignalSchema = new Schema<ITrendSignal>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    platform: { type: String, required: true },
    signalType: {
      type: String,
      required: true,
      enum: ['topic', 'hashtag', 'format', 'audio', 'competitor_growth'],
    },
    label: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    baselineValue: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
    growthPercent: { type: Number, default: 0 },
    sampleSize: { type: Number, default: 0 },
    confidence: {
      type: String,
      default: 'medium',
      enum: ['low', 'medium', 'high'],
    },
    evidence: [{ type: String }],
    dataQuality: {
      coverage: { type: String, default: 'complete' },
      missingSignals: [{ type: String }],
    },
    status: {
      type: String,
      default: 'NEW',
      enum: ['NEW', 'REVIEWED', 'DISMISSED', 'ACTIONED'],
    },
    cooldownKey: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

TrendSignalSchema.index(
  { workspaceId: 1, brandId: 1, cooldownKey: 1 }
);

export const TrendSignalModel =
  mongoose.models.TrendSignal ||
  mongoose.model<ITrendSignal>('TrendSignal', TrendSignalSchema);
