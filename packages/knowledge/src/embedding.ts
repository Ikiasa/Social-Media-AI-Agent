import { GoogleGenerativeAI } from '@google/generative-ai';
import { EnvAIKeyProvider } from '../../ai/src/keyProvider';
import { AIKeyProvider } from '../../ai/src/types';
import { AIError } from '../../core/src/errors';
import { Logger, defaultLogger } from '../../core/src/logger';

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  private keyProvider: AIKeyProvider;
  private logger: Logger;

  constructor(keyProvider?: AIKeyProvider, logger: Logger = defaultLogger) {
    this.keyProvider = keyProvider || new EnvAIKeyProvider();
    this.logger = logger;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    let apiKey = '';
    try {
      apiKey = await this.keyProvider.getKey();
    } catch (_e) {
      this.logger.error('No Gemini API key available for embedding.');
      throw new AIError('GEMINI_API_KEY is missing or unavailable. Cannot generate text embeddings.');
    }

    const googleAI = new GoogleGenerativeAI(apiKey);
    const model = googleAI.getGenerativeModel({ model: 'text-embedding-004' });

    const embeddings: number[][] = [];
    const batchSize = 10;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      try {
        const batchResults = await Promise.all(
          batch.map(async (text) => {
            const res = await model.embedContent(text);
            return res.embedding.values;
          })
        );
        embeddings.push(...batchResults);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        await this.keyProvider.reportKeyFailure(apiKey, err);

        this.logger.error(`Batch embedding generation failed: ${err.message}`);
        throw new AIError(`Batch embedding generation failed: ${err.message}`);
      }
    }

    return embeddings;
  }
}
