import { z } from 'zod';

export const createBrandSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Brand name is required'),
    description: z.string().optional(),
    industry: z.string().optional(),
    website: z.string().url('Invalid website URL').optional().or(z.literal('')),
    targetAudience: z.string().optional(),
    products: z.array(z.string()).optional(),
    services: z.array(z.string()).optional(),
    brandVoice: z.array(z.string()).optional(),
    contentPillars: z.array(z.string()).optional(),
    restrictedTopics: z.array(z.string()).optional(),
    preferredLanguage: z.string().optional(),
  }),
});

export const updateBrandSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Brand ID is required'),
  }),
  body: createBrandSchema.shape.body.partial(),
});

export const createDraftSchema = z.object({
  body: z.object({
    brandId: z.string().optional(),
    platform: z.string().default('instagram'),
    title: z.string().min(1, 'Content title is required'),
    contentType: z.string().default('educational'),
    contentPillar: z.string().optional(),
    hook: z.string().optional(),
    body: z.string().optional(),
    caption: z.string().optional(),
    cta: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
  }),
});

export const updateContentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Content ID is required'),
  }),
  body: createDraftSchema.shape.body.partial(),
});

export const generateContentSchema = z.object({
  body: z.object({
    brandId: z.string().optional(),
    platform: z.string().optional(),
    contentType: z.string().optional(),
    topic: z.string().min(1, 'Topic is required'),
  }),
});

export const ingestKnowledgeSchema = z.object({
  body: z.object({
    sourceType: z.enum(['pdf', 'docx', 'doc', 'csv', 'txt', 'web', 'youtube', 'audio']),
    sourceUriOrBuffer: z.string().min(1, 'Source content or URL is required'),
    title: z.string().optional(),
  }),
});
