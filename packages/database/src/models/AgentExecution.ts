import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentExecution extends Document {
  executionId: string;
  workspaceId: string;
  agentName: string;
  input: Record<string, unknown>;
  plan?: string;
  toolsUsed?: string[];
  result?: Record<string, unknown>;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  durationMs?: number;
  error?: string;
  createdAt: Date;
}

const AgentExecutionSchema = new Schema<IAgentExecution>(
  {
    executionId: { type: String, required: true, unique: true },
    workspaceId: { type: String, required: true, index: true },
    agentName: { type: String, required: true },
    input: { type: Schema.Types.Mixed, required: true },
    plan: { type: String },
    toolsUsed: [{ type: String }],
    result: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'RUNNING'], required: true },
    durationMs: { type: Number },
    error: { type: String },
  },
  { timestamps: true }
);

export const AgentExecutionModel =
  mongoose.models.AgentExecution || mongoose.model<IAgentExecution>('AgentExecution', AgentExecutionSchema);
