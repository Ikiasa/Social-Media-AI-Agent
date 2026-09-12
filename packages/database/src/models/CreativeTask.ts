import mongoose, { Schema, Document } from 'mongoose';

export type TaskType =
  | 'strategy'
  | 'copywriting'
  | 'design'
  | 'video_editing'
  | 'review'
  | 'community'
  | 'reporting';

export type TaskStatus =
  | 'BACKLOG'
  | 'TODO'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'BLOCKED'
  | 'DONE'
  | 'CANCELLED';

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface ICreativeTask extends Document {
  workspaceId: string;
  brandId: string;
  campaignId?: string;
  contentId?: string;
  briefId?: string;
  title: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  dueAt?: Date;
  estimatedMinutes?: number;
  actualMinutes?: number;
  dependencies: string[];
  attachedAssetId?: string;
  attachedAssetVersion?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CreativeTaskSchema = new Schema<ICreativeTask>(
  {
    workspaceId: { type: String, required: true, index: true },
    brandId: { type: String, required: true, index: true },
    campaignId: { type: String, index: true },
    contentId: { type: String, index: true },
    briefId: { type: String, index: true },
    title: { type: String, required: true },
    taskType: {
      type: String,
      required: true,
      enum: ['strategy', 'copywriting', 'design', 'video_editing', 'review', 'community', 'reporting'],
    },
    status: {
      type: String,
      default: 'TODO',
      enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE', 'CANCELLED'],
      index: true,
    },
    priority: {
      type: String,
      default: 'NORMAL',
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      index: true,
    },
    assigneeId: { type: String, index: true },
    dueAt: { type: Date, index: true },
    estimatedMinutes: { type: Number, default: 60 },
    actualMinutes: { type: Number, default: 0 },
    dependencies: [{ type: String }],
    attachedAssetId: { type: String },
    attachedAssetVersion: { type: Number },
  },
  { timestamps: true }
);

CreativeTaskSchema.index({ workspaceId: 1, brandId: 1, status: 1 });
CreativeTaskSchema.index({ workspaceId: 1, assigneeId: 1, dueAt: 1 });

export const CreativeTaskModel =
  mongoose.models.CreativeTask || mongoose.model<ICreativeTask>('CreativeTask', CreativeTaskSchema);
