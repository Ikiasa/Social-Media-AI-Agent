import mongoose, { Schema, Document } from 'mongoose';

export type ContentStatus =
  | 'IDEA'
  | 'DRAFT'
  | 'REVIEW'
  | 'PENDING_STRATEGIST_REVIEW'
  | 'PENDING_CLIENT_REVIEW'
  | 'REVISION_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'FAILED'
  | 'ARCHIVED';

export interface IContent extends Document {
  workspaceId: string;
  brandId?: string;
  campaignId?: string;
  platform: string;
  title: string;
  contentType: string;
  contentPillar?: string;
  hook?: string;
  body?: string;
  caption?: string;
  cta?: string;
  hashtags?: string[];
  media?: string[];
  status: ContentStatus;
  approvedBy?: string;
  contentVersion: number;
  finalApprovalAt?: Date;
  finalApprovedBy?: string;
  approvalSignature?: string;
  approvalSignatureVersion?: string;
  approvalInvalidatedAt?: Date;
  approvalInvalidationReason?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentSchema = new Schema<IContent>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String },
    campaignId: { type: String, index: true },
    platform: { type: String, required: true, default: 'instagram' },
    title: { type: String, required: true },
    contentType: { type: String, required: true, default: 'educational' },
    contentPillar: { type: String },
    hook: { type: String },
    body: { type: String },
    caption: { type: String },
    cta: { type: String },
    hashtags: [{ type: String }],
    media: [{ type: String }],
    status: {
      type: String,
      enum: [
        'IDEA',
        'DRAFT',
        'REVIEW',
        'PENDING_STRATEGIST_REVIEW',
        'PENDING_CLIENT_REVIEW',
        'REVISION_REQUESTED',
        'APPROVED',
        'REJECTED',
        'SCHEDULED',
        'PUBLISHED',
        'FAILED',
        'ARCHIVED',
      ],
      default: 'DRAFT',
      index: true,
    },
    approvedBy: { type: String },
    contentVersion: { type: Number, default: 1, required: true },
    finalApprovalAt: { type: Date },
    finalApprovedBy: { type: String },
    approvalSignature: { type: String },
    approvalSignatureVersion: { type: String, default: 'v1' },
    approvalInvalidatedAt: { type: Date },
    approvalInvalidationReason: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

ContentSchema.index({ _id: 1, workspaceId: 1 });

export const ContentModel =
  mongoose.models.Content || mongoose.model<IContent>('Content', ContentSchema);
