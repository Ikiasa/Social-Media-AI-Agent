import mongoose, { Schema, Document } from 'mongoose';

export type AttributionEventType =
  | 'content.published'
  | 'engagement.received'
  | 'link.clicked'
  | 'lead.created'
  | 'conversion.recorded'
  | 'campaign.status_changed';

export interface IAttributionMetrics {
  reach?: number;
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  leads?: number;
  conversions?: number;
  revenue?: number;
}

export interface IAttributionEvent extends Document {
  eventId: string;
  workspaceId: string;
  brandId: string;
  campaignId?: string;
  contentId?: string;
  platform: string;
  eventType: AttributionEventType;
  timestamp: Date;
  source: string;
  metrics: IAttributionMetrics;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AttributionEventSchema = new Schema<IAttributionEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    campaignId: { type: String, index: true },
    contentId: { type: String, index: true },
    platform: { type: String, required: true },
    eventType: {
      type: String,
      enum: [
        'content.published',
        'engagement.received',
        'link.clicked',
        'lead.created',
        'conversion.recorded',
        'campaign.status_changed',
      ],
      required: true,
      index: true,
    },
    timestamp: { type: Date, required: true, index: true },
    source: { type: String, required: true, default: 'system' },
    metrics: {
      reach: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      leads: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

AttributionEventSchema.index({ workspaceId: 1, brandId: 1, campaignId: 1, timestamp: -1 });

export const AttributionEventModel =
  mongoose.models.AttributionEvent ||
  mongoose.model<IAttributionEvent>('AttributionEvent', AttributionEventSchema);
