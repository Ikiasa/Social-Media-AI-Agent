import mongoose, { Schema, Document } from 'mongoose';

export type SLATargetType =
  | 'INBOX_RESPONSE'
  | 'APPROVAL_REVIEW'
  | 'CREATIVE_TASK'
  | 'PUBLISH_JOB'
  | 'CAMPAIGN_REPORT';

export type SLAStatus = 'MET' | 'AT_RISK' | 'BREACHED';

export interface IServiceLevelPolicy extends Document {
  workspaceId: string;
  brandId?: string;
  targetType: SLATargetType;
  maxMinutesAllowed: number;
  atRiskWarningMinutes: number;
  businessHoursOnly: boolean;
  businessHoursStart: string; // e.g. "09:00"
  businessHoursEnd: string;   // e.g. "17:00"
  timezone: string;           // e.g. "Asia/Jakarta"
  createdAt: Date;
  updatedAt: Date;
}

const ServiceLevelPolicySchema = new Schema<IServiceLevelPolicy>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, index: true },
    targetType: {
      type: String,
      required: true,
      enum: ['INBOX_RESPONSE', 'APPROVAL_REVIEW', 'CREATIVE_TASK', 'PUBLISH_JOB', 'CAMPAIGN_REPORT'],
    },
    maxMinutesAllowed: { type: Number, required: true },
    atRiskWarningMinutes: { type: Number, required: true },
    businessHoursOnly: { type: Boolean, default: false },
    businessHoursStart: { type: String, default: '09:00' },
    businessHoursEnd: { type: String, default: '17:00' },
    timezone: { type: String, default: 'UTC' },
  },
  { timestamps: true }
);

ServiceLevelPolicySchema.index({ workspaceId: 1, targetType: 1, brandId: 1 }, { unique: true });

export const ServiceLevelPolicyModel =
  mongoose.models.ServiceLevelPolicy ||
  mongoose.model<IServiceLevelPolicy>('ServiceLevelPolicy', ServiceLevelPolicySchema);

export interface IServiceLevelEvent extends Document {
  workspaceId: string;
  brandId: string;
  targetType: SLATargetType;
  targetId: string;
  status: SLAStatus;
  startedAt: Date;
  dueAt: Date;
  completedAt?: Date;
  breachedAt?: Date;
  assigneeId?: string;
  exceptionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceLevelEventSchema = new Schema<IServiceLevelEvent>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    targetType: {
      type: String,
      required: true,
      enum: ['INBOX_RESPONSE', 'APPROVAL_REVIEW', 'CREATIVE_TASK', 'PUBLISH_JOB', 'CAMPAIGN_REPORT'],
    },
    targetId: { type: String, required: true, index: true },
    status: {
      type: String,
      default: 'MET',
      enum: ['MET', 'AT_RISK', 'BREACHED'],
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    dueAt: { type: Date, required: true },
    completedAt: { type: Date },
    breachedAt: { type: Date },
    assigneeId: { type: String },
    exceptionReason: { type: String },
  },
  { timestamps: true }
);

ServiceLevelEventSchema.index({ workspaceId: 1, brandId: 1, status: 1 });

export const ServiceLevelEventModel =
  mongoose.models.ServiceLevelEvent ||
  mongoose.model<IServiceLevelEvent>('ServiceLevelEvent', ServiceLevelEventSchema);
