import { AIKeyProvider } from './types';
import { AIError } from '../../core/src/errors';

export class EnvAIKeyProvider implements AIKeyProvider {
  private keys: string[] = [];
  private currentIndex: number = 0;

  constructor() {
    this.refreshKeys();
  }

  public refreshKeys(): void {
    const keys: string[] = [];

    if (process.env.GEMINI_API_KEY) {
      keys.push(process.env.GEMINI_API_KEY);
    }

    if (process.env.GEMINI_API_KEYS) {
      const splitKeys = process.env.GEMINI_API_KEYS.split(',').map((k) => k.trim()).filter(Boolean);
      keys.push(...splitKeys);
    }

    for (let i = 1; i <= 50; i++) {
      const envKey = process.env[`GEMINI_API_KEY_${i}`];
      if (envKey && envKey.trim()) {
        keys.push(envKey.trim());
      }
    }

    this.keys = Array.from(new Set(keys));
    this.currentIndex = 0;
  }

  public async getKey(): Promise<string> {
    if (this.keys.length === 0) {
      this.refreshKeys();
    }

    if (this.keys.length === 0) {
      throw new AIError('No Gemini API keys found in environment configuration.');
    }

    const key = this.keys[this.currentIndex];
    return key;
  }

  public async reportKeyFailure(_key: string, _error: Error): Promise<void> {
    if (this.keys.length > 1) {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    }
  }
}
