import mongoose, { Schema, Document } from 'mongoose';

export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type MessageType = 'text' | 'comment' | 'media' | 'system';

export interface ISocialMessage extends Document {
  workspaceId: string;
  brandId: string;
  conversationId: string;
  socialAccountId: string;
  platform: string;
  externalMessageId: string;
  direction: MessageDirection;
  messageType: MessageType;
  body: string;
  receivedAt: Date;
  providerEventId: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const SocialMessageSchema = new Schema<ISocialMessage>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    conversationId: { type: String, required: true, index: true },
    socialAccountId: { type: String, required: true },
    platform: { type: String, required: true },
    externalMessageId: { type: String, required: true },
    direction: {
      type: String,
      required: true,
      enum: ['INBOUND', 'OUTBOUND'],
    },
    messageType: {
      type: String,
      default: 'text',
      enum: ['text', 'comment', 'media', 'system'],
    },
    body: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
    providerEventId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

SocialMessageSchema.index(
  { workspaceId: 1, brandId: 1, platform: 1, socialAccountId: 1, externalMessageId: 1 },
  { unique: true }
);

export const SocialMessageModel =
  mongoose.models.SocialMessage ||
  mongoose.model<ISocialMessage>('SocialMessage', SocialMessageSchema);
