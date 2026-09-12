import { describe, it, expect, vi } from 'vitest';
import { ContentGenerationService } from '../services/api/src/services/ContentGenerationService';
import { createWorkspaceContext } from '../packages/core/src/context';
import { AIProvider } from '../packages/ai/src/types';

describe('ContentGenerationService', () => {
  it('should orchestrate AI content generation and create a draft in database', async () => {
    const mockAIProvider: AIProvider = {
      generate: vi.fn().mockResolvedValue({
        data: {
          title: '5 AI Automation Secrets',
          hook: 'Are you wasting 10 hours a week on manual social media posting?',
          body: 'AI Agents can streamline content creation, scheduling, and analytics.',
          caption: 'Are you wasting 10 hours a week? Here are 5 AI Automation secrets...',
          cta: 'Comment "AUTOMATE" for a free workflow guide!',
          hashtags: ['#AIAgent', '#SocialMediaAI', '#Automation'],
        },
        modelUsed: 'gemini-1.5-flash',
      }),
    };

    const mockBrandService: any = {
      getBrand: vi.fn().mockResolvedValue({
        name: 'TechCorp',
        brandVoice: ['Professional', 'Innovative'],
        targetAudience: 'Developers & Founders',
      }),
    };

    const mockContentService: any = {
      createDraft: vi.fn().mockImplementation((_ctx, data) =>
        Promise.resolve({ _id: 'generated-1', ...data, status: 'DRAFT' })
      ),
    };

    const mockRetrievalService: any = {
      retrieve: vi.fn().mockResolvedValue([
        {
          chunkId: 'chunk-1',
          documentId: 'doc-1',
          workspaceId: 'ws-1',
          content: 'TechCorp specializes in AI social media automation tools.',
          similarity: 0.95,
          metadata: { documentTitle: 'TechCorp Overview' },
        },
      ]),
    };

    const service = new ContentGenerationService(
      mockAIProvider,
      mockBrandService,
      mockContentService,
      mockRetrievalService
    );

    const ctx = createWorkspaceContext('ws-1', 'user-1');
    const draft = await service.generateAndSaveDraft(ctx, {
      topic: 'AI Social Media Agents',
      platform: 'instagram',
      contentType: 'educational',
    });

    expect(draft.title).toBe('5 AI Automation Secrets');
    expect(draft.caption).toContain('5 AI Automation secrets');
    expect(draft.hashtags).toContain('#AIAgent');
    expect(draft.status).toBe('DRAFT');
    expect(mockAIProvider.generate).toHaveBeenCalled();
    expect(mockRetrievalService.retrieve).toHaveBeenCalled();
    expect(mockContentService.createDraft).toHaveBeenCalled();
  });
});
