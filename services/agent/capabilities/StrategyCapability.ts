import { AIProvider } from '../../../packages/ai/src/types';
import { GeminiAIProvider } from '../../../packages/ai/src/geminiProvider';
import { WorkspaceContext } from '../../../packages/core/src/context';
import { BrandContextBuilder } from '../../../packages/knowledge/src/contextBuilder';
import { IBrand } from '../../../packages/database/src/models/Brand';
import { VectorSearchResult } from '../../../packages/knowledge/src/vectorStore';

export interface StrategyOutput {
  pillars: string[];
  contentIdeas: Array<{
    title: string;
    angle: string;
    targetAudience: string;
    contentPillar: string;
  }>;
  summary: string;
}

export class StrategyCapability {
  private aiProvider: AIProvider;

  constructor(aiProvider: AIProvider = new GeminiAIProvider()) {
    this.aiProvider = aiProvider;
  }

  async executeStrategy(
    _context: WorkspaceContext,
    brand?: IBrand | null,
    knowledgeChunks: VectorSearchResult[] = [],
    userGoal: string = 'Content Strategy Formulation'
  ): Promise<StrategyOutput> {
    const brandCtx = BrandContextBuilder.buildBrandContext(brand);
    const knowledgeText = knowledgeChunks.map((c) => c.content).join('\n---\n');

    const prompt = `
Formulate a strategic social media content plan.
Goal: "${userGoal}"

${brandCtx.formattedText}

Knowledge Background:
${knowledgeText || 'None'}

Return structured JSON with keys:
- pillars: array of 3-4 content pillars
- contentIdeas: array of objects with keys (title, angle, targetAudience, contentPillar)
- summary: executive summary of strategy
`;

    const result = await this.aiProvider.generate<StrategyOutput>({
      prompt,
      systemInstruction: 'You are a Senior Social Media Strategist AI.',
    });

    return result.data;
  }
}
