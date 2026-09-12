import mongoose, { Schema, Document } from 'mongoose';

export interface IContentVariant extends Document {
  workspaceId: string;
  parentContentId: string;
  platform: string;
  caption: string;
  hashtags?: string[];
  createdAt: Date;
}

const ContentVariantSchema = new Schema<IContentVariant>(
  {
    workspaceId: { type: String, required: true, index: true },
    parentContentId: { type: String, required: true, index: true },
    platform: { type: String, required: true },
    caption: { type: String, required: true },
    hashtags: [{ type: String }],
  },
  { timestamps: true }
);

export const ContentVariantModel =
  mongoose.models.ContentVariant || mongoose.model<IContentVariant>('ContentVariant', ContentVariantSchema);
