import mongoose, { Schema, Document } from 'mongoose';

export interface IBrand extends Document {
  workspaceId: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  targetAudience?: string;
  products?: string[];
  services?: string[];
  brandVoice?: string[];
  contentPillars?: string[];
  restrictedTopics?: string[];
  preferredLanguage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    industry: { type: String },
    website: { type: String },
    targetAudience: { type: String },
    products: [{ type: String }],
    services: [{ type: String }],
    brandVoice: [{ type: String }],
    contentPillars: [{ type: String }],
    restrictedTopics: [{ type: String }],
    preferredLanguage: { type: String, default: 'en' },
  },
  { timestamps: true }
);

BrandSchema.index({ _id: 1, workspaceId: 1 });

export const BrandModel = mongoose.models.Brand || mongoose.model<IBrand>('Brand', BrandSchema);
