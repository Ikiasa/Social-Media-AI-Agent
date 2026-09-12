import mongoose, { Schema, Document } from 'mongoose';

export type VersionProcessingStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'QUARANTINED';

export interface AssetDerivative {
  platform: string;
  width: number;
  height: number;
  storageReference: string;
  format: string;
  altText?: string;
  createdAt: Date;
}

export interface ICreativeAssetVersion extends Document {
  workspaceId: string;
  brandId: string;
  assetId: string;
  version: number;
  storageReference: string;
  mimeType: string;
  fileSizeBytes: number;
  checksum: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  processingStatus: VersionProcessingStatus;
  derivatives: AssetDerivative[];
  altText?: string;
  createdBy: string;
  createdAt: Date;
}

const CreativeAssetVersionSchema = new Schema<ICreativeAssetVersion>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    assetId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    storageReference: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    checksum: { type: String, required: true, index: true },
    width: { type: Number },
    height: { type: Number },
    durationSeconds: { type: Number },
    processingStatus: {
      type: String,
      default: 'PENDING',
      enum: ['PENDING', 'PROCESSING', 'READY', 'FAILED', 'QUARANTINED'],
      index: true,
    },
    derivatives: [
      {
        platform: { type: String, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        storageReference: { type: String, required: true },
        format: { type: String, required: true },
        altText: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    altText: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

CreativeAssetVersionSchema.index(
  { workspaceId: 1, assetId: 1, version: 1 },
  { unique: true }
);

export const CreativeAssetVersionModel =
  mongoose.models.CreativeAssetVersion ||
  mongoose.model<ICreativeAssetVersion>('CreativeAssetVersion', CreativeAssetVersionSchema);
