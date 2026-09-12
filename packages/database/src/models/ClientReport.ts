import mongoose, { Schema, Document } from 'mongoose';

export type ReportStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'EXPORTED';

export interface WhiteLabelConfig {
  logoUrl?: string;
  brandName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footerText?: string;
}

export interface ClientReportSection {
  title: string;
  type: 'kpi' | 'attribution' | 'top_content' | 'competitor_radar' | 'community_inbox' | 'delivered_work' | 'recommendations';
  contentData: Record<string, any>;
}

export interface IClientReport extends Document {
  workspaceId: string;
  brandId: string;
  campaignId?: string;
  reportTitle: string;
  periodStart: Date;
  periodEnd: Date;
  status: ReportStatus;
  sections: ClientReportSection[];
  whiteLabelConfig: WhiteLabelConfig;
  exportedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientReportSchema = new Schema<IClientReport>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    campaignId: { type: String, index: true },
    reportTitle: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: {
      type: String,
      default: 'DRAFT',
      enum: ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'EXPORTED'],
      index: true,
    },
    sections: [
      {
        title: { type: String, required: true },
        type: { type: String, required: true },
        contentData: { type: Schema.Types.Mixed, required: true },
      },
    ],
    whiteLabelConfig: {
      logoUrl: { type: String },
      brandName: { type: String },
      primaryColor: { type: String, default: '#4f46e5' },
      secondaryColor: { type: String, default: '#06b6d4' },
      footerText: { type: String },
    },
    exportedAt: { type: Date },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

ClientReportSchema.index({ workspaceId: 1, brandId: 1, reportTitle: 1 });

export const ClientReportModel =
  mongoose.models.ClientReport || mongoose.model<IClientReport>('ClientReport', ClientReportSchema);
