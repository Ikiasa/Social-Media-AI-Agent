import { AgentTool, ToolRegistry } from './types';
import { defaultLogger, Logger } from '../../../core/src/logger';

export class DefaultToolRegistry implements ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();
  private logger: Logger;

  constructor(logger: Logger = defaultLogger) {
    this.logger = logger;
  }

  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Overwriting registered tool: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
    this.logger.info(`Registered controlled tool: ${tool.name} [Category: ${tool.category}, RequiresApproval: ${tool.requiresApproval}]`);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  list(): AgentTool[] {
    return Array.from(this.tools.values());
  }
}
