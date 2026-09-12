import { VectorSearchResult } from './vectorStore';
import { IBrand } from '../../database/src/models/Brand';

export interface KnowledgeSourceReference {
  documentId: string;
  chunkId: string;
  title: string;
  sourceUrl?: string;
}

export interface KnowledgeContext {
  chunks: VectorSearchResult[];
  sources: KnowledgeSourceReference[];
  totalTokens: number;
  formattedText: string;
}

export class KnowledgeContextBuilder {
  static buildContext(chunks: VectorSearchResult[], maxTokens: number = 1500): KnowledgeContext {
    let accumulatedText = '';
    let currentTokens = 0;
    const includedChunks: VectorSearchResult[] = [];
    const sourcesMap = new Map<string, KnowledgeSourceReference>();

    for (const chunk of chunks) {
      const chunkTokens = Math.ceil(chunk.content.length / 4);
      if (currentTokens + chunkTokens > maxTokens && includedChunks.length > 0) {
        break;
      }

      includedChunks.push(chunk);
      currentTokens += chunkTokens;

      const title = (chunk.metadata?.documentTitle as string) || `Doc_${chunk.documentId}`;
      accumulatedText += `[Source: ${title}]\n${chunk.content}\n\n`;

      if (!sourcesMap.has(chunk.documentId)) {
        sourcesMap.set(chunk.documentId, {
          documentId: chunk.documentId,
          chunkId: chunk.chunkId,
          title,
          sourceUrl: chunk.metadata?.sourceUrl as string | undefined,
        });
      }
    }

    return {
      chunks: includedChunks,
      sources: Array.from(sourcesMap.values()),
      totalTokens: currentTokens,
      formattedText: accumulatedText.trim(),
    };
  }
}

export interface FormattedBrandContext {
  formattedText: string;
  brandName: string;
  voice: string[];
  restrictedTopics: string[];
}

export class BrandContextBuilder {
  static buildBrandContext(brand?: IBrand | null): FormattedBrandContext {
    if (!brand) {
      return {
        formattedText: 'Brand: General Persona\nVoice: Professional, Informative',
        brandName: 'General Persona',
        voice: ['Professional', 'Informative'],
        restrictedTopics: [],
      };
    }

    const voice = brand.brandVoice && brand.brandVoice.length > 0 ? brand.brandVoice : ['Professional', 'Helpful'];
    const pillars = brand.contentPillars && brand.contentPillars.length > 0 ? brand.contentPillars : ['Educational', 'Promotional'];
    const restrictions = brand.restrictedTopics || [];

    const formattedText = `
Brand Name: ${brand.name}
Description: ${brand.description || 'N/A'}
Industry: ${brand.industry || 'N/A'}
Target Audience: ${brand.targetAudience || 'General Audience'}
Brand Voice: ${voice.join(', ')}
Content Pillars: ${pillars.join(', ')}
Restricted Topics (Do NOT mention): ${restrictions.length > 0 ? restrictions.join(', ') : 'None'}
Preferred Language: ${brand.preferredLanguage || 'en'}
`.trim();

    return {
      formattedText,
      brandName: brand.name,
      voice,
      restrictedTopics: restrictions,
    };
  }
}
