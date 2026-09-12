export interface GenerateInput {
  prompt: string;
  systemInstruction?: string;
  schema?: Record<string, unknown>;
  modelName?: string;
  temperature?: number;
}

export interface GenerateOutput<T = unknown> {
  data: T;
  rawText?: string;
  modelUsed: string;
  tokenCount?: number;
}

export interface AIProvider {
  generate<T>(input: GenerateInput): Promise<GenerateOutput<T>>;
}

export interface AIKeyProvider {
  getKey(): Promise<string>;
  reportKeyFailure(key: string, error: Error): Promise<void>;
}
