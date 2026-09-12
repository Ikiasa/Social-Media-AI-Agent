import { AgentIntent, AgentStepPlan } from './types/agent';

export class PlanBuilder {
  buildPlan(intent: AgentIntent, message: string, brandId?: string): AgentStepPlan[] {
    const steps: AgentStepPlan[] = [];

    switch (intent) {
      case 'STRATEGY':
        steps.push({
          stepIndex: 1,
          toolName: 'get_brand',
          purpose: 'Load brand context and guidelines',
          input: { brandId },
        });
        steps.push({
          stepIndex: 2,
          toolName: 'search_knowledge',
          purpose: 'Retrieve brand knowledge context for strategy formulation',
          input: { query: message, brandId, limit: 3 },
        });
        steps.push({
          stepIndex: 3,
          toolName: 'get_recent_content',
          purpose: 'Inspect recent topics to prevent repetition',
          input: { brandId, limit: 5 },
        });
        break;

      case 'CONTENT_GENERATION':
        steps.push({
          stepIndex: 1,
          toolName: 'get_brand',
          purpose: 'Load brand voice and audience parameters',
          input: { brandId },
        });
        steps.push({
          stepIndex: 2,
          toolName: 'search_knowledge',
          purpose: 'Retrieve relevant factual background knowledge',
          input: { query: message, brandId, limit: 3 },
        });
        steps.push({
          stepIndex: 3,
          toolName: 'create_content',
          purpose: 'Generate AI content draft and save to database',
          input: { brandId, topic: message, platform: 'instagram' },
        });
        break;

      case 'KNOWLEDGE_SEARCH':
        steps.push({
          stepIndex: 1,
          toolName: 'search_knowledge',
          purpose: 'Search knowledge base documents',
          input: { query: message, brandId, limit: 5 },
        });
        break;

      case 'CONTENT_MANAGEMENT':
        steps.push({
          stepIndex: 1,
          toolName: 'schedule_content',
          purpose: 'Schedule content for automatic publishing',
          input: { contentId: 'pending_id', scheduledAt: new Date() },
        });
        break;

      default:
        steps.push({
          stepIndex: 1,
          toolName: 'get_brand',
          purpose: 'Load brand context for response generation',
          input: { brandId },
        });
        break;
    }

    return steps;
  }
}
