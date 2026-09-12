export * from './types';
export * from './ToolRegistry';
export * from './getBrand.tool';
export * from './searchKnowledge.tool';
export * from './getRecentContent.tool';
export * from './createContent.tool';
export * from './updateContent.tool';
export * from './scheduleContent.tool';

import { DefaultToolRegistry } from './ToolRegistry';
import { GetBrandTool } from './getBrand.tool';
import { SearchKnowledgeTool } from './searchKnowledge.tool';
import { GetRecentContentTool } from './getRecentContent.tool';
import { CreateContentTool } from './createContent.tool';
import { UpdateContentTool } from './updateContent.tool';
import { ScheduleContentTool } from './scheduleContent.tool';

export function createDefaultToolRegistry(): DefaultToolRegistry {
  const registry = new DefaultToolRegistry();
  registry.register(new GetBrandTool());
  registry.register(new SearchKnowledgeTool());
  registry.register(new GetRecentContentTool());
  registry.register(new CreateContentTool());
  registry.register(new UpdateContentTool());
  registry.register(new ScheduleContentTool());
  return registry;
}
