import mongoose, { Schema, Document } from 'mongoose';

export type SocialPlatformType = 'instagram' | 'facebook' | 'linkedin' | 'x' | 'tiktok' | 'threads';
export type ChannelType = 'dm' | 'comment' | 'mention' | 'reply';
export type ConversationStatus = 'OPEN' | 'PENDING_REVIEW' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'ARCHIVED';
export type ConversationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface ISocialConversation extends Document {
  workspaceId: string;
  brandId: string;
  socialAccountId: string;
  platform: SocialPlatformType;
  externalConversationId: string;
  participantReference: string;
  channelType: ChannelType;
  status: ConversationStatus;
  priority: ConversationPriority;
  lastMessageAt: Date;
  assignedTo?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SocialConversationSchema = new Schema<ISocialConversation>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    socialAccountId: { type: String, required: true, index: true },
    platform: {
      type: String,
      required: true,
      enum: ['instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'threads'],
    },
    externalConversationId: { type: String, required: true },
    participantReference: { type: String, required: true },
    channelType: {
      type: String,
      default: 'dm',
      enum: ['dm', 'comment', 'mention', 'reply'],
    },
    status: {
      type: String,
      default: 'OPEN',
      enum: ['OPEN', 'PENDING_REVIEW', 'WAITING_CUSTOMER', 'RESOLVED', 'ARCHIVED'],
    },
    priority: {
      type: String,
      default: 'NORMAL',
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    },
    lastMessageAt: { type: Date, default: Date.now },
    assignedTo: { type: String },
    tags: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

SocialConversationSchema.index(
  { workspaceId: 1, brandId: 1, platform: 1, socialAccountId: 1, externalConversationId: 1 },
  { unique: true }
);

SocialConversationSchema.index({ workspaceId: 1, brandId: 1, status: 1 });

export const SocialConversationModel =
  mongoose.models.SocialConversation ||
  mongoose.model<ISocialConversation>('SocialConversation', SocialConversationSchema);
