import { AIProvider } from '../../../../packages/ai/src/types';
import { GeminiAIProvider } from '../../../../packages/ai/src/geminiProvider';
import { BrandService } from './BrandService';
import { ContentService } from './ContentService';
import { KnowledgeRetrievalService } from '../../../../packages/knowledge/src/retrievalService';
import { KnowledgeContextBuilder, BrandContextBuilder } from '../../../../packages/knowledge/src/contextBuilder';
import { WorkspaceContext } from '../../../../packages/core/src/context';
import { IContent } from '../../../../packages/database/src/models/Content';
import { AuthorizationError, ValidationError } from '../../../../packages/core/src/errors';

export interface GenerateContentParams {
  brandId?: string;
  platform?: string;
  contentType?: string;
  topic: string;
}

export interface StructuredContentOutput {
  title: string;
  hook: string;
  body: string;
  caption: string;
  cta?: string;
  hashtags: string[];
}

export class ContentGenerationService {
  private aiProvider: AIProvider;
  private brandService: BrandService;
  private contentService: ContentService;
  private retrievalService: KnowledgeRetrievalService;

  constructor(
    aiProvider: AIProvider = new GeminiAIProvider(),
    brandService: BrandService = new BrandService(),
    contentService: ContentService = new ContentService(),
    retrievalService: KnowledgeRetrievalService = new KnowledgeRetrievalService()
  ) {
    this.aiProvider = aiProvider;
    this.brandService = brandService;
    this.contentService = contentService;
    this.retrievalService = retrievalService;
  }

  async generateAndSaveDraft(ctx: WorkspaceContext, params: GenerateContentParams): Promise<IContent> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace & User context required for content generation.');
    }
    if (!params.topic || !params.topic.trim()) {
      throw new ValidationError('Content topic is required.');
    }

    // 1. Build Brand Context
    let brandObj = null;
    if (params.brandId) {
      brandObj = await this.brandService.getBrand(ctx, params.brandId);
    }
    const brandContext = BrandContextBuilder.buildBrandContext(brandObj);

    // 2. Perform Semantic Retrieval & Build Knowledge Context
    const retrievedChunks = await this.retrievalService.retrieve(ctx, params.topic, params.brandId);
    const knowledgeContext = KnowledgeContextBuilder.buildContext(retrievedChunks, 1500);

    // 3. Assemble Prompt with Hallucination Control Instructions
    const prompt = `
Task: Generate engaging social media content for topic: "${params.topic}".
Platform: ${params.platform || 'instagram'}
Content Type: ${params.contentType || 'educational'}

${brandContext.formattedText}

Retrieved Brand Knowledge:
${knowledgeContext.formattedText || 'No specific background knowledge retrieved.'}

Instructions & Hallucination Controls:
1. Prioritize retrieved brand knowledge for factual statements.
2. Do NOT invent unsupported company facts, pricing, or fake metrics.
3. Align voice strictly with: ${brandContext.voice.join(', ')}.
4. Avoid restricted topics: ${brandContext.restrictedTopics.length > 0 ? brandContext.restrictedTopics.join(', ') : 'None'}.

Return structured JSON with keys:
- title: clear post title
- hook: opening scroll-stopping hook
- body: main message content
- caption: full caption ready to post
- cta: call to action
- hashtags: array of 3-7 relevant hashtags
`;

    const systemInstruction =
      'You are a Brand Social Media AI Manager. Generate structured content strictly adhering to brand voice and retrieved factual context.';

    const result = await this.aiProvider.generate<StructuredContentOutput>({
      prompt,
      systemInstruction,
    });

    const output = result.data;
    const title = output.title || params.topic;
    const caption = output.caption || output.body || params.topic;

    // 4. Save Draft with Source Attribution Tracing
    return await this.contentService.createDraft(ctx, {
      brandId: params.brandId,
      platform: params.platform || 'instagram',
      title,
      contentType: params.contentType || 'educational',
      hook: output.hook,
      body: output.body,
      caption,
      cta: output.cta,
      hashtags: output.hashtags || [],
    });
  }
}
