import { WorkspaceContext } from '../../../core/src/context';

export type ToolCategory = 'READ' | 'WRITE' | 'EXTERNAL_ACTION';

export interface AgentTool<TInput = any, TOutput = any> {
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly requiresApproval: boolean;

  execute(context: WorkspaceContext, input: TInput): Promise<TOutput>;
}

export interface ToolRegistry {
  register(tool: AgentTool): void;
  get(name: string): AgentTool | undefined;
  list(): AgentTool[];
}
