import mongoose, { Schema, Document } from 'mongoose';

export interface IOAuthNonce extends Document {
  nonce: string;
  userId: string;
  workspaceId: string;
  brandId?: string;
  createdAt: Date;
  expiresAt: Date;
}

const OAuthNonceSchema = new Schema<IOAuthNonce>(
  {
    nonce: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true },
    workspaceId: { type: String, required: true },
    brandId: { type: String },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // MongoDB TTL index
  },
  { timestamps: true }
);

export const OAuthNonceModel =
  mongoose.models.OAuthNonce || mongoose.model<IOAuthNonce>('OAuthNonce', OAuthNonceSchema);
