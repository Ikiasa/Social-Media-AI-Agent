import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AIKeyProvider, GenerateInput, GenerateOutput } from './types';
import { EnvAIKeyProvider } from './keyProvider';
import { AIError } from '../../core/src/errors';
import { Logger, defaultLogger } from '../../core/src/logger';

export class GeminiAIProvider implements AIProvider {
  private keyProvider: AIKeyProvider;
  private logger: Logger;

  constructor(keyProvider?: AIKeyProvider, logger: Logger = defaultLogger) {
    this.keyProvider = keyProvider || new EnvAIKeyProvider();
    this.logger = logger;
  }

  async generate<T>(input: GenerateInput): Promise<GenerateOutput<T>> {
    const modelName = input.modelName || 'gemini-1.5-flash';
    const apiKey = await this.keyProvider.getKey();

    const generationConfig: Record<string, unknown> = {
      temperature: input.temperature ?? 0.7,
    };

    if (input.schema) {
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseSchema = input.schema;
    }

    const googleAI = new GoogleGenerativeAI(apiKey);
    const model = googleAI.getGenerativeModel({
      model: modelName,
      generationConfig: generationConfig as any,
      systemInstruction: input.systemInstruction,
    });

    try {
      const result = await model.generateContent(input.prompt);
      if (!result || !result.response) {
        throw new AIError('No response received from Google Generative AI model.');
      }

      const rawText = result.response.text();
      let parsedData: T;

      if (input.schema || (rawText.trim().startsWith('{') || rawText.trim().startsWith('['))) {
        try {
          parsedData = JSON.parse(rawText) as T;
        } catch (jsonErr) {
          this.logger.warn('Failed to parse model JSON response, returning raw text.', { rawText });
          parsedData = rawText as unknown as T;
        }
      } else {
        parsedData = rawText as unknown as T;
      }

      return {
        data: parsedData,
        rawText,
        modelUsed: modelName,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.keyProvider.reportKeyFailure(apiKey, err);

      if (err.message.includes('429') || err.message.includes('Quota')) {
        this.logger.warn('Gemini API rate limit reached, retrying with next key...');
        return this.generate(input);
      }

      throw new AIError(`Gemini AI Generation failed: ${err.message}`, err);
    }
  }
}
