import mongoose, { Schema, Document } from 'mongoose';

export type BriefStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

export interface ICreativeBrief extends Document {
  workspaceId: string;
  brandId: string;
  campaignId?: string;
  contentId?: string;
  title: string;
  objective: string;
  targetAudience: string;
  platform: string;
  format: string;
  keyMessage: string;
  hookDirection?: string;
  cta?: string;
  brandVoice?: string;
  mandatoryElements: string[];
  restrictedTopics: string[];
  referenceAssetIds: string[];
  acceptanceCriteria: string[];
  deadline?: Date;
  status: BriefStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CreativeBriefSchema = new Schema<ICreativeBrief>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    campaignId: { type: String, index: true },
    contentId: { type: String, index: true },
    title: { type: String, required: true },
    objective: { type: String, required: true },
    targetAudience: { type: String, required: true },
    platform: { type: String, required: true },
    format: { type: String, required: true },
    keyMessage: { type: String, required: true },
    hookDirection: { type: String },
    cta: { type: String },
    brandVoice: { type: String },
    mandatoryElements: [{ type: String }],
    restrictedTopics: [{ type: String }],
    referenceAssetIds: [{ type: String }],
    acceptanceCriteria: [{ type: String }],
    deadline: { type: Date },
    status: {
      type: String,
      default: 'DRAFT',
      enum: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'],
      index: true,
    },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

CreativeBriefSchema.index({ workspaceId: 1, brandId: 1, title: 1 });

export const CreativeBriefModel =
  mongoose.models.CreativeBrief || mongoose.model<ICreativeBrief>('CreativeBrief', CreativeBriefSchema);
