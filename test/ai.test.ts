import { describe, it, expect } from 'vitest';
import { EnvAIKeyProvider } from '../packages/ai/src/keyProvider';
import { AIError } from '../packages/core/src/errors';

describe('EnvAIKeyProvider', () => {
  it('should throw AIError when no environment keys are defined', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEYS;
    for (let i = 1; i <= 50; i++) {
      delete process.env[`GEMINI_API_KEY_${i}`];
    }

    const provider = new EnvAIKeyProvider();
    await expect(provider.getKey()).rejects.toThrow(AIError);
  });

  it('should return defined key from process.env.GEMINI_API_KEY', async () => {
    process.env.GEMINI_API_KEY = 'test_key_123';
    const provider = new EnvAIKeyProvider();
    const key = await provider.getKey();
    expect(key).toBe('test_key_123');
    delete process.env.GEMINI_API_KEY;
  });

  it('should rotate keys when reportKeyFailure is called', async () => {
    process.env.GEMINI_API_KEYS = 'key_1, key_2';
    const provider = new EnvAIKeyProvider();
    
    expect(await provider.getKey()).toBe('key_1');
    await provider.reportKeyFailure('key_1', new Error('Rate limit'));
    expect(await provider.getKey()).toBe('key_2');
    
    delete process.env.GEMINI_API_KEYS;
  });
});
