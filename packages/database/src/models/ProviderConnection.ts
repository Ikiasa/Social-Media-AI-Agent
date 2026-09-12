import mongoose, { Schema, Document } from 'mongoose';

export type ProviderConnectionStatus =
  | 'PENDING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'DISCONNECTED'
  | 'ERROR';

export type ProviderSourceType =
  | 'official_api'
  | 'licensed_provider'
  | 'user_import'
  | 'sandbox_fixture';

export interface IProviderConnectionCapabilities {
  ownedAccountMetrics: boolean;
  inbox: boolean;
  publicDiscovery: boolean;
  competitorSignals: boolean;
  publishing: boolean;
}

export interface IProviderConnection extends Document {
  workspaceId: string;
  brandId: string;
  platform: 'instagram' | 'tiktok' | 'linkedin' | 'x' | 'threads' | 'generic';
  provider: string;
  sourceType: ProviderSourceType;
  status: ProviderConnectionStatus;
  capabilities: IProviderConnectionCapabilities;
  encryptedCredentialRef?: string;
  lastHealthCheckAt?: Date;
  lastSyncAt?: Date;
  lastErrorCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderConnectionSchema = new Schema<IProviderConnection>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    platform: {
      type: String,
      required: true,
      enum: ['instagram', 'tiktok', 'linkedin', 'x', 'threads', 'generic'],
    },
    provider: { type: String, required: true, index: true },
    sourceType: {
      type: String,
      required: true,
      enum: ['official_api', 'licensed_provider', 'user_import', 'sandbox_fixture'],
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'CONNECTED', 'DEGRADED', 'DISCONNECTED', 'ERROR'],
      default: 'PENDING',
    },
    capabilities: {
      ownedAccountMetrics: { type: Boolean, default: false },
      inbox: { type: Boolean, default: false },
      publicDiscovery: { type: Boolean, default: false },
      competitorSignals: { type: Boolean, default: false },
      publishing: { type: Boolean, default: false },
    },
    encryptedCredentialRef: { type: String, select: false },
    lastHealthCheckAt: { type: Date, default: null },
    lastSyncAt: { type: Date, default: null },
    lastErrorCode: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.encryptedCredentialRef;
        return ret;
      },
    },
  }
);

ProviderConnectionSchema.index({ workspaceId: 1, brandId: 1, provider: 1 });

export const ProviderConnectionModel = mongoose.model<IProviderConnection>(
  'ProviderConnection',
  ProviderConnectionSchema
);
