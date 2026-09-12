import mongoose, { Schema, Document } from 'mongoose';

export type DraftStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SENT'
  | 'FAILED'
  | 'INVALIDATED';

export interface IClassificationSnapshot {
  intent: string;
  sentiment: string;
  priority: string;
  riskFlags: string[];
  recommendedRoute: string;
  confidence: string;
  reasoningSummary?: string;
}

export interface IResponseDraft extends Document {
  workspaceId: string;
  brandId: string;
  conversationId: string;
  sourceMessageId: string;
  content: string;
  status: DraftStatus;
  classificationSnapshot?: IClassificationSnapshot;
  knowledgeSources: string[];
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  approvalSignature?: string;
  sentAt?: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResponseDraftSchema = new Schema<IResponseDraft>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    conversationId: { type: String, required: true, index: true },
    sourceMessageId: { type: String, required: true },
    content: { type: String, required: true },
    status: {
      type: String,
      default: 'DRAFT',
      enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SENT', 'FAILED', 'INVALIDATED'],
    },
    classificationSnapshot: {
      intent: { type: String },
      sentiment: { type: String },
      priority: { type: String },
      riskFlags: [{ type: String }],
      recommendedRoute: { type: String },
      confidence: { type: String },
      reasoningSummary: { type: String },
    },
    knowledgeSources: [{ type: String }],
    createdBy: { type: String, required: true, default: 'Community Agent' },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    approvalSignature: { type: String },
    sentAt: { type: Date },
    version: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  }
);

ResponseDraftSchema.index({ workspaceId: 1, conversationId: 1, version: 1 });

export const ResponseDraftModel =
  mongoose.models.ResponseDraft ||
  mongoose.model<IResponseDraft>('ResponseDraft', ResponseDraftSchema);
