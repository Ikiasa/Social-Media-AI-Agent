import mongoose, { Schema, Document } from 'mongoose';

export type AssetType = 'image' | 'video' | 'audio' | 'document' | 'template';
export type AssetStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED' | 'QUARANTINED' | 'ARCHIVED';
export type UsageRights = 'owned' | 'licensed' | 'client_provided' | 'unknown';

export interface ICreativeAsset extends Document {
  workspaceId: string;
  brandId: string;
  campaignId?: string;
  name: string;
  assetType: AssetType;
  status: AssetStatus;
  currentVersion: number;
  tags: string[];
  usageRights: UsageRights;
  rightsNotes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CreativeAssetSchema = new Schema<ICreativeAsset>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    campaignId: { type: String, index: true },
    name: { type: String, required: true },
    assetType: {
      type: String,
      required: true,
      enum: ['image', 'video', 'audio', 'document', 'template'],
    },
    status: {
      type: String,
      required: true,
      default: 'UPLOADING',
      enum: ['UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'QUARANTINED', 'ARCHIVED'],
      index: true,
    },
    currentVersion: { type: Number, default: 1, required: true },
    tags: [{ type: String }],
    usageRights: {
      type: String,
      default: 'owned',
      enum: ['owned', 'licensed', 'client_provided', 'unknown'],
    },
    rightsNotes: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

CreativeAssetSchema.index(
  { workspaceId: 1, brandId: 1, name: 1, currentVersion: 1 },
  { unique: true }
);

export const CreativeAssetModel =
  mongoose.models.CreativeAsset || mongoose.model<ICreativeAsset>('CreativeAsset', CreativeAssetSchema);
