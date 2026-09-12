import mongoose, { Schema, Document } from 'mongoose';

export type SocialAccountHealthStatus = 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'RE-AUTH_REQUIRED' | 'REVOKED';

export interface ISocialAccount extends Document {
  workspaceId: string;
  brandId?: string;
  platform: 'instagram' | 'linkedin' | 'twitter' | 'tiktok';
  platformAccountId?: string;
  username: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  tokenExpiresAt?: Date;
  status: SocialAccountHealthStatus;
  credentialReference?: string;
  metadata?: Record<string, unknown>;
  connectedAt: Date;
  lastHealthCheckAt?: Date;
}

const SocialAccountSchema = new Schema<ISocialAccount>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, index: true },
    platform: { type: String, enum: ['instagram', 'linkedin', 'twitter', 'tiktok'], required: true },
    platformAccountId: { type: String },
    username: { type: String, required: true },
    encryptedAccessToken: { type: String },
    encryptedRefreshToken: { type: String },
    tokenExpiresAt: { type: Date },
    status: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'EXPIRED', 'RE-AUTH_REQUIRED', 'REVOKED'],
      default: 'CONNECTED',
      index: true,
    },
    credentialReference: { type: String },
    metadata: { type: Schema.Types.Mixed },
    connectedAt: { type: Date, default: Date.now },
    lastHealthCheckAt: { type: Date },
  },
  { timestamps: true }
);

SocialAccountSchema.index({ workspaceId: 1, platform: 1 });

export const SocialAccountModel =
  mongoose.models.SocialAccount || mongoose.model<ISocialAccount>('SocialAccount', SocialAccountSchema);
