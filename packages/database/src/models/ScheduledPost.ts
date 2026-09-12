import mongoose, { Schema, Document } from 'mongoose';

export type ScheduledPostStatus =
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHING_UNKNOWN'
  | 'RECONCILING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED'
  | 'READY_TO_PUBLISH'
  | 'BLOCKED'
  | 'BLOCKED_APPROVAL_VALIDATION'
  | 'RETRY_WAIT'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS';

export interface IScheduledPost extends Document {
  workspaceId: string;
  brandId?: string;
  contentId: string;
  platform?: string;
  scheduledAt: Date;
  timezone?: string;
  status: ScheduledPostStatus;
  containerId?: string;
  leaseOwner?: string;
  createdBy?: string;
  approvedBy?: string;
  retryCount?: number;
  nextRetryAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledPostSchema = new Schema<IScheduledPost>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, index: true },
    contentId: { type: String, required: true, index: true },
    platform: { type: String, default: 'instagram' },
    scheduledAt: { type: Date, required: true, index: true },
    timezone: { type: String, default: 'UTC' },
    status: {
      type: String,
      enum: [
        'SCHEDULED',
        'PUBLISHING',
        'PUBLISHING_UNKNOWN',
        'RECONCILING',
        'PUBLISHED',
        'FAILED',
        'CANCELLED',
        'READY_TO_PUBLISH',
        'BLOCKED',
        'RETRY_WAIT',
        'PENDING',
        'PROCESSING',
        'SUCCESS',
      ],
      default: 'SCHEDULED',
      index: true,
    },
    containerId: { type: String },
    leaseOwner: { type: String },
    createdBy: { type: String },
    approvedBy: { type: String },
    retryCount: { type: Number, default: 0 },
    nextRetryAt: { type: Date, index: true },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

ScheduledPostSchema.index({ workspaceId: 1, scheduledAt: 1 });
ScheduledPostSchema.index({ workspaceId: 1, contentId: 1, scheduledAt: 1, platform: 1 }, { unique: true });

export const ScheduledPostModel =
  mongoose.models.ScheduledPost || mongoose.model<IScheduledPost>('ScheduledPost', ScheduledPostSchema);
